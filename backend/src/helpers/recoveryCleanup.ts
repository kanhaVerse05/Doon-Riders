import fs from 'fs';
import path from 'path';
import { pool, getDbStatus, memoryStore } from '../config/db';

const RECOVERY_UPLOADS_DIR = path.join(__dirname, '../../uploads/recoveries');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 30-Day Auto Cleanup for Scooty Recovery Images
 * Scans disk uploads and database records, deleting photos older than 30 days from upload date.
 */
export async function cleanupExpiredRecoveryImages(): Promise<{
  deletedFilesCount: number;
  dbRecordsUpdated: number;
}> {
  let deletedFilesCount = 0;
  let dbRecordsUpdated = 0;
  const now = Date.now();

  try {
    // 1. Clean up physical files from uploads/recoveries directory
    if (fs.existsSync(RECOVERY_UPLOADS_DIR)) {
      const files = fs.readdirSync(RECOVERY_UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(RECOVERY_UPLOADS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const ageMs = now - stats.mtimeMs;
            if (ageMs > THIRTY_DAYS_MS) {
              fs.unlinkSync(filePath);
              deletedFilesCount++;
              console.log(`[RecoveryCleanup] Auto-deleted expired recovery image (>30 days): ${file}`);
            }
          }
        } catch (fileErr) {
          console.warn(`[RecoveryCleanup] Error checking file ${file}:`, fileErr);
        }
      }
    }

    // 2. Clean up expired photo URLs in PostgreSQL database
    if (getDbStatus()) {
      try {
        const thirtyDaysAgoIso = new Date(now - THIRTY_DAYS_MS).toISOString();

        // Find recoveries with photos older than 30 days
        const res = await pool.query(`
          SELECT id, recovery_number, pickup_photos, created_at
          FROM scooty_recoveries
          WHERE pickup_photos IS NOT NULL
            AND jsonb_array_length(pickup_photos) > 0
            AND (
              created_at < NOW() - INTERVAL '30 days'
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(pickup_photos) elem
                WHERE (elem->>'uploaded_at')::timestamptz < NOW() - INTERVAL '30 days'
              )
            )
        `);

        for (const row of res.rows) {
          const photos = Array.isArray(row.pickup_photos) ? row.pickup_photos : [];
          let hasChanges = false;

          const updatedPhotos = photos.map((p: any) => {
            const uploadTime = p.uploaded_at ? new Date(p.uploaded_at).getTime() : new Date(row.created_at).getTime();
            if (now - uploadTime > THIRTY_DAYS_MS) {
              hasChanges = true;
              return {
                ...p,
                url: '',
                is_expired: true,
                expired_at: new Date().toISOString(),
                note: 'Photo auto-deleted after 30 days retention policy'
              };
            }
            return p;
          });

          if (hasChanges) {
            await pool.query(
              `UPDATE scooty_recoveries SET pickup_photos = $1, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify(updatedPhotos), row.id]
            );
            dbRecordsUpdated++;
          }
        }
      } catch (dbErr) {
        console.warn('[RecoveryCleanup] Database photo cleanup notice:', dbErr);
      }
    }

    // 3. Clean up memoryStore photos if running in-memory
    if (memoryStore.scootyRecoveries) {
      for (const rec of memoryStore.scootyRecoveries) {
        if (Array.isArray(rec.pickup_photos)) {
          rec.pickup_photos = rec.pickup_photos.map((p: any) => {
            const uploadTime = p.uploaded_at ? new Date(p.uploaded_at).getTime() : new Date(rec.created_at || now).getTime();
            if (now - uploadTime > THIRTY_DAYS_MS) {
              return {
                ...p,
                url: '',
                is_expired: true,
                expired_at: new Date().toISOString(),
                note: 'Photo auto-deleted after 30 days retention policy'
              };
            }
            return p;
          });
        }
      }
    }

    if (deletedFilesCount > 0 || dbRecordsUpdated > 0) {
      console.log(`[RecoveryCleanup] Completed 30-day image cleanup: ${deletedFilesCount} file(s) removed, ${dbRecordsUpdated} db record(s) updated.`);
    }
  } catch (error) {
    console.error('[RecoveryCleanup] General cleanup error:', error);
  }

  return { deletedFilesCount, dbRecordsUpdated };
}
