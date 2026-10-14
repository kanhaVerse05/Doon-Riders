import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'uploads');
const BACKUP_FILE = path.join(BACKUP_DIR, 'users_backup.json');

export const INITIAL_SEEDED_USERS = [
  {
    id: 1,
    name: 'Ankit Kumar',
    email: 'doonridersmain@gmail.com',
    password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
    phone: '+91 8439431999',
    role_id: 1,
    role_name: 'SUPER_ADMIN',
    role_display_name: 'Super Admin',
    status: 'active',
    avatar_url: '/images/doon-riders-logo.png',
    created_at: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 7,
    name: 'Rishab Agnihotri',
    email: 'r8986257@gmail.com',
    password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
    phone: '8796271241',
    role_id: 7,
    role_name: 'PRE_BOOKING',
    role_display_name: 'Pre-Booking',
    status: 'active',
    avatar_url: '',
    created_at: '2026-10-14T00:00:00.000Z'
  }
];

// Ensure backup folder exists
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[userStorage] Could not create backup dir:', e);
}

export const loadUsersBackup = (): any[] => {
  const candidateFiles = [
    path.join(process.cwd(), 'uploads', 'users_backup.json'),
    path.join(__dirname, '..', '..', 'uploads', 'users_backup.json'),
    path.join(process.cwd(), 'data', 'users_backup.json'),
    path.join(__dirname, '..', 'data', 'users_backup.json')
  ];

  for (const f of candidateFiles) {
    try {
      if (fs.existsSync(f)) {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          syncWithMemoryStore(parsed);
          return parsed;
        }
      }
    } catch (err: any) {
      console.warn('[userStorage] Candidate read error:', f, err.message);
    }
  }

  // Auto-seed if completely empty
  try {
    saveUsersBackup(INITIAL_SEEDED_USERS);
  } catch {}
  syncWithMemoryStore(INITIAL_SEEDED_USERS);
  return [...INITIAL_SEEDED_USERS];
};

export const saveUsersBackup = (users: any[]) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(users, null, 2), 'utf-8');
    syncWithMemoryStore(users);
  } catch (err: any) {
    console.warn('[userStorage] Error writing backup:', err.message);
  }
};

const syncWithMemoryStore = (users: any[]) => {
  if (!Array.isArray(users)) return;
  try {
    const { memoryStore } = require('../config/db');
    if (memoryStore && Array.isArray(memoryStore.users)) {
      memoryStore.users = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password_hash: u.password_hash || '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
        phone: u.phone || null,
        role_id: u.role_id,
        status: u.status || 'active',
        avatar_url: u.avatar_url || '',
        role_name: u.role_name,
        role_display_name: u.role_display_name,
        created_at: u.created_at
      }));
    }
  } catch {}
};

export const appendOrUpdateUserBackup = (user: any) => {
  try {
    const current = loadUsersBackup();
    const idx = current.findIndex(u => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase());
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...user };
    } else {
      current.push(user);
    }
    saveUsersBackup(current);
  } catch (err: any) {
    console.warn('[userStorage] Error appending to backup:', err.message);
  }
};

export const deleteUserBackup = (userId: number | string) => {
  try {
    const current = loadUsersBackup();
    const filtered = current.filter(u => String(u.id) !== String(userId));
    saveUsersBackup(filtered);
  } catch (err: any) {
    console.warn('[userStorage] Error deleting from backup:', err.message);
  }
};

/**
 * Bi-directional sync with PostgreSQL database:
 * 1. Takes all rows from PostgreSQL users table.
 * 2. Checks backup on disk for any users not present in DB.
 * 3. Inserts any missing users from backup into PostgreSQL.
 * 4. Saves complete combined list back to disk and memoryStore.
 */
export const syncUsersWithDb = async (dbRows: any[], dbClient: any): Promise<any[]> => {
  try {
    if (dbRows && dbRows.length > 0) {
      // Check if any initial users like Rishab or Ankit are missing from DB
      const backupRows = loadUsersBackup();
      for (const bu of backupRows) {
        const found = dbRows.find(dr => dr.email?.toLowerCase() === bu.email?.toLowerCase());
        if (!found) {
          try {
            console.log(`[userStorage] Inserting missing user from backup to DB: ${bu.name} (${bu.email})`);
            const insertRes = await dbClient.query(`
              INSERT INTO users (id, name, email, password_hash, phone, role_id, status, avatar_url)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (email) DO NOTHING
              RETURNING id
            `, [
              bu.id,
              bu.name,
              bu.email,
              bu.password_hash || '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
              bu.phone || null,
              bu.role_id,
              bu.status || 'active',
              bu.avatar_url || ''
            ]);
            if (insertRes.rows && insertRes.rows.length > 0) {
              dbRows.push({ ...bu, id: insertRes.rows[0].id });
            }
          } catch (e: any) {
            console.warn(`[userStorage] Could not insert missing user ${bu.email}:`, e.message);
          }
        }
      }

      saveUsersBackup(dbRows);
      return dbRows;
    }

    // If DB has 0 users, seed from backup
    const backupRows = loadUsersBackup();
    if (backupRows.length > 0 && dbClient) {
      console.log(`[userStorage] Seeding ${backupRows.length} users into empty DB table...`);
      for (const u of backupRows) {
        try {
          await dbClient.query(`
            INSERT INTO users (id, name, email, password_hash, phone, role_id, status, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO NOTHING
          `, [
            u.id,
            u.name,
            u.email,
            u.password_hash || '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
            u.phone || null,
            u.role_id,
            u.status || 'active',
            u.avatar_url || ''
          ]);
        } catch (seedErr: any) {
          console.warn('[userStorage] Seed error for', u.email, seedErr.message);
        }
      }
    }

    return backupRows;
  } catch (err: any) {
    console.warn('[userStorage] Error in syncUsersWithDb:', err.message);
    return loadUsersBackup();
  }
};
