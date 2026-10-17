import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

// Helper: Format seconds to readable format e.g. "14m 32s" or "1h 15m"
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs > 0 ? secs + 's' : ''}`.trim();
  }
  if (mins > 0) {
    return `${mins}m ${secs > 0 ? secs + 's' : ''}`.trim();
  }
  return `${secs}s`;
};

// Helper to validate latitude & longitude
export function isValidLatLng(lat: any, lng: any): boolean {
  const numLat = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const numLng = typeof lng === 'number' ? lng : parseFloat(String(lng));
  return (
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  );
}

// Helper to extract GPS coordinates from any Maps URL or coordinate string
export function extractCoordsFromUrl(input: string | null | undefined): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim();
  try { str = decodeURIComponent(str); } catch { /* Keep the original URL if encoding is malformed. */ }

  const patterns = [
    // Google Maps place pin. Prefer this over @lat,lng, which is often only the map viewport center.
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /[?&](?:q|query|ll|daddr|destination|loc|point)=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/i,
    /\/place\/(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/i,
    /[?&]mlat=(-?\d+(?:\.\d+)?).*?[?&]mlon=(-?\d+(?:\.\d+)?)/i,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/i,
    /geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    // Camera center is a last-resort fallback for links without a pin or destination.
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
    /(-?\d{1,2}\.\d{3,})[,\s+]+(-?\d{1,3}\.\d{3,})/
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  return null;
}

const getAvailableFieldTechnicians = async (hubId?: number | null) => {
  const result = await pool.query(`
    SELECT t.id, t.technician_code, t.name, t.phone, t.hub_id, t.hub_name,
           t.specialization, t.status, t.rating
    FROM technicians t
    JOIN users u ON LOWER(u.email) = LOWER(t.email)
    JOIN roles r ON r.id = u.role_id
    WHERE u.status = 'active'
      AND u.deleted_at IS NULL
      AND r.name ILIKE '%TECH%'
      AND LOWER(COALESCE(t.status, 'available')) NOT IN ('inactive', 'disabled', 'deleted')
      AND ($1::int IS NULL OR t.hub_id IS NULL OR t.hub_id = $1)
    ORDER BY t.name ASC
  `, [hubId || null]);
  return result.rows;
};

// Helper to resolve short links and extract coordinates
export const resolveCoordinatesFromUrl = async (
  urlStr: string
): Promise<{ lat: number; lng: number; resolvedUrl?: string } | null> => {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();

  const direct = extractCoordsFromUrl(trimmed);
  if (direct) return direct;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(trimmed, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);

      const finalUrl = res.url;
      if (finalUrl && finalUrl !== trimmed) {
        const fromFinal = extractCoordsFromUrl(finalUrl);
        if (fromFinal) {
          return { ...fromFinal, resolvedUrl: finalUrl };
        }
      }
    } catch (e) {
      // Ignore network timeout/failure
    }
  }

  return null;
};

// API Endpoint to parse/resolve coordinates from a URL or coordinate string
export const parseLocationUrlHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL or coordinate string is required' });
    }
    const resolved = await resolveCoordinatesFromUrl(String(url));
    if (resolved) {
      return res.json({
        success: true,
        data: resolved
      });
    }
    return res.json({
      success: false,
      message: 'Could not extract GPS coordinates from provided URL or text'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Error resolving coordinates' });
  }
};

// Helper to auto-generate sequential Complaint Number CMP-00125 etc.
export const generateComplaintNumber = async (): Promise<string> => {
  let maxNum = 123;

  if (getDbStatus()) {
    try {
      const res = await pool.query(
        "SELECT complaint_number FROM complaints WHERE complaint_number ~ '^CMP-[0-9]+$' ORDER BY id DESC LIMIT 100"
      );
      for (const row of res.rows) {
        const match = row.complaint_number?.match(/CMP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    } catch (err) {
      console.warn('[generateComplaintNumber] Error reading DB:', err);
    }
  }

  for (const c of (memoryStore.complaints || [])) {
    const match = c.complaint_number?.match(/CMP-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `CMP-${String(nextNum).padStart(5, '0')}`;
};

// 1. GET ALL COMPLAINTS (WITH FILTERS, SEARCH, ROLES, STATS)
export const getAllComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const {
      search = '',
      status,
      hub_id,
      technician_id,
      priority,
      date_filter = 'all',
      sort_by = 'newest',
      limit = 50,
      offset = 0
    } = req.query;

    const searchTerm = String(search || '').toLowerCase().trim();
    const userRole = (req.user?.roleName || '').toUpperCase();
    const userId = req.user?.id;

    // PostgreSQL branch
    if (getDbStatus()) {
      try {
        let whereClauses: string[] = ['1=1'];
        let params: any[] = [];
        let pIndex = 1;

        // Role-based scoping
        if (userRole.includes('HUB') && (req.user as any)?.hub_id) {
          whereClauses.push(`c.hub_id = $${pIndex}`);
          params.push((req.user as any).hub_id);
          pIndex++;
        } else if (userRole.includes('TECH')) {
          whereClauses.push(`c.technician_id = (
            SELECT t.id FROM technicians t
            WHERE LOWER(t.email) = LOWER($${pIndex})
            LIMIT 1
          )`);
          params.push(req.user?.email || '');
          pIndex++;
        }

        if (searchTerm) {
          whereClauses.push(`(
            LOWER(c.complaint_number) LIKE $${pIndex} OR
            LOWER(c.scooter_number) LIKE $${pIndex} OR
            LOWER(c.customer_name) LIKE $${pIndex} OR
            LOWER(c.customer_phone) LIKE $${pIndex} OR
            LOWER(c.location_address) LIKE $${pIndex} OR
            LOWER(c.issue_category) LIKE $${pIndex} OR
            LOWER(c.description) LIKE $${pIndex}
          )`);
          params.push(`%${searchTerm}%`);
          pIndex++;
        }

        if (status && status !== 'all') {
          whereClauses.push(`c.status = $${pIndex}`);
          params.push(status);
          pIndex++;
        }

        if (hub_id && hub_id !== 'all') {
          whereClauses.push(`c.hub_id = $${pIndex}`);
          params.push(Number(hub_id));
          pIndex++;
        }

        if (technician_id && technician_id !== 'all') {
          whereClauses.push(`c.technician_id = $${pIndex}`);
          params.push(Number(technician_id));
          pIndex++;
        }

        if (priority && priority !== 'all') {
          whereClauses.push(`c.priority = $${pIndex}`);
          params.push(priority);
          pIndex++;
        }

        if (date_filter === 'today') {
          whereClauses.push(`c.created_at >= CURRENT_DATE`);
        } else if (date_filter === 'week') {
          whereClauses.push(`c.created_at >= NOW() - INTERVAL '7 days'`);
        }

        let orderSql = 'c.id DESC';
        if (sort_by === 'oldest') orderSql = 'c.id ASC';
        if (sort_by === 'priority') orderSql = `CASE c.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, c.id DESC`;

        const sql = `
          SELECT 
            c.*,
            tech.specialization as technician_specialization,
            tech.rating as technician_rating
          FROM complaints c
          LEFT JOIN technicians tech ON c.technician_id = tech.id
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY ${orderSql}
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;

        const result = await pool.query(sql, params);
        const technicians = await getAvailableFieldTechnicians();

        const statsRes = await pool.query(`
          SELECT status, COUNT(*) as count 
          FROM complaints 
          GROUP BY status
        `);

        const stats = {
          total: 0,
          new: 0,
          assigned: 0,
          enRoute: 0,
          reached: 0,
          inProgress: 0,
          workDone: 0,
          closed: 0
        };

        statsRes.rows.forEach(r => {
          const c = Number(r.count);
          stats.total += c;
          if (r.status === 'New') stats.new += c;
          if (r.status === 'Assigned') stats.assigned += c;
          if (r.status === 'En Route') stats.enRoute += c;
          if (r.status === 'Reached') stats.reached += c;
          if (r.status === 'Work In Progress') stats.inProgress += c;
          if (r.status === 'Work Done') stats.workDone += c;
          if (r.status === 'Closed') stats.closed += c;
        });

        return res.json({
          success: true,
          data: result.rows,
          stats,
          hubs: memoryStore.repairHubs,
          technicians
        });
      } catch (dbErr) {
        console.warn('[getAllComplaints] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    // Memory Store Fallback
    let list = [...(memoryStore.complaints || [])];

    // Filter by role
    if (userRole.includes('HUB') && (req.user as any)?.hub_id) {
      list = list.filter(c => c.hub_id === (req.user as any)?.hub_id);
    } else if (userRole.includes('TECH')) {
      const techRecord = memoryStore.technicians.find(t => t.name.toLowerCase() === req.user?.name.toLowerCase() || t.id === userId);
      const techId = techRecord ? techRecord.id : userId;
      list = list.filter(c => c.technician_id === techId);
    }

    if (searchTerm) {
      list = list.filter(c =>
        c.complaint_number.toLowerCase().includes(searchTerm) ||
        c.scooter_number.toLowerCase().includes(searchTerm) ||
        c.customer_name.toLowerCase().includes(searchTerm) ||
        c.customer_phone.toLowerCase().includes(searchTerm) ||
        c.location_address.toLowerCase().includes(searchTerm) ||
        c.issue_category.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm)
      );
    }

    if (status && status !== 'all') {
      list = list.filter(c => c.status === status);
    }

    if (hub_id && hub_id !== 'all') {
      list = list.filter(c => c.hub_id === Number(hub_id));
    }

    if (technician_id && technician_id !== 'all') {
      list = list.filter(c => c.technician_id === Number(technician_id));
    }

    if (priority && priority !== 'all') {
      list = list.filter(c => c.priority === priority);
    }

    // Sort
    if (sort_by === 'oldest') {
      list.sort((a, b) => a.id - b.id);
    } else if (sort_by === 'priority') {
      const pWeights: Record<string, number> = { Urgent: 1, High: 2, Normal: 3 };
      list.sort((a, b) => (pWeights[a.priority] || 3) - (pWeights[b.priority] || 3) || b.id - a.id);
    } else {
      list.sort((a, b) => b.id - a.id);
    }

    // Calculate real-time stats from all complaints
    const allComplaints = memoryStore.complaints || [];
    const stats = {
      total: allComplaints.length,
      new: allComplaints.filter(c => c.status === 'New').length,
      assigned: allComplaints.filter(c => c.status === 'Assigned').length,
      enRoute: allComplaints.filter(c => c.status === 'En Route').length,
      reached: allComplaints.filter(c => c.status === 'Reached').length,
      inProgress: allComplaints.filter(c => c.status === 'Work In Progress').length,
      workDone: allComplaints.filter(c => c.status === 'Work Done').length,
      closed: allComplaints.filter(c => c.status === 'Closed').length
    };

    return res.json({
      success: true,
      data: list,
      stats,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians
    });
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving complaints' });
  }
};

// 2. GET COMPLAINT BY ID (WITH TIMELINE EVENTS & DETAILS)
export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const complaintId = Number(id);

    if (getDbStatus()) {
      try {
        const cRes = await pool.query(
          `SELECT c.*, tech.phone as technician_phone, tech.technician_code, tech.email as assigned_technician_email,
                  tech.specialization as technician_specialization, tech.rating as technician_rating
           FROM complaints c
           LEFT JOIN technicians tech ON c.technician_id = tech.id
           WHERE c.id = $1 OR c.complaint_number = $2`,
          [complaintId || 0, id]
        );

        if (cRes.rows.length > 0) {
          const complaint = cRes.rows[0];
          if (String(req.user?.roleName || '').toUpperCase().includes('TECH') &&
              String(complaint.assigned_technician_email || '').toLowerCase() !== String(req.user?.email || '').toLowerCase()) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
          }
          delete complaint.assigned_technician_email;
          const eventsRes = await pool.query(
            `SELECT * FROM complaint_events WHERE complaint_id = $1 ORDER BY created_at ASC`,
            [complaint.id]
          );
          const technicians = await getAvailableFieldTechnicians(Number(complaint.hub_id) || null);

          return res.json({
            success: true,
            data: complaint,
            timeline: eventsRes.rows,
            hubs: memoryStore.repairHubs,
            technicians
          });
        }
      } catch (dbErr) {
        console.warn('[getComplaintById] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    const complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const timeline = (memoryStore.complaintEvents || [])
      .filter(e => e.complaint_id === complaint.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return res.json({
      success: true,
      data: complaint,
      timeline,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians
    });
  } catch (error: any) {
    console.error('Error fetching complaint details:', error);
    return res.status(500).json({ success: false, message: 'Failed to load complaint details' });
  }
};

// 3. CREATE COMPLAINT (CUSTOMER SUPPORT WORKFLOW)
export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const {
      scooter_number,
      customer_name,
      customer_phone,
      location_address,
      location_url,
      latitude,
      longitude,
      issue_category,
      description,
      priority = 'Normal',
      hub_id
    } = req.body;

    if (!scooter_number || !customer_name || !customer_phone || !location_address || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required complaint fields (Scooty number, Customer name, Phone, Location & Description are mandatory)'
      });
    }

    // Resolve Hub details
    const selectedHubId = Number(hub_id) || 1;
    const targetHub = memoryStore.repairHubs.find(h => h.id === selectedHubId) || memoryStore.repairHubs[0];

    const complaintNumber = await generateComplaintNumber();
    const now = new Date().toISOString();

    let resolvedLat = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null;
    let resolvedLng = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null;
    let finalLocationUrl = (location_url || '').trim();

    // 1. If coordinates not provided or invalid, extract from location_url
    if (!isValidLatLng(resolvedLat, resolvedLng) && finalLocationUrl) {
      const extracted = await resolveCoordinatesFromUrl(finalLocationUrl);
      if (extracted) {
        resolvedLat = extracted.lat;
        resolvedLng = extracted.lng;
        if (extracted.resolvedUrl && !finalLocationUrl.includes('@') && !finalLocationUrl.includes('?q=')) {
          finalLocationUrl = extracted.resolvedUrl;
        }
      }
    }

    // 2. If still not valid, try extracting from location_address text
    if (!isValidLatLng(resolvedLat, resolvedLng) && location_address) {
      const extractedAddr = extractCoordsFromUrl(location_address);
      if (extractedAddr) {
        resolvedLat = extractedAddr.lat;
        resolvedLng = extractedAddr.lng;
      }
    }

    // Never substitute service-hub coordinates for an unknown customer location.
    // The map UI can still launch navigation using the saved address when no exact pin exists.
    if (!finalLocationUrl && isValidLatLng(resolvedLat, resolvedLng)) {
      finalLocationUrl = `https://maps.google.com/?q=${resolvedLat},${resolvedLng}`;
    }

    const newComplaint: any = {
      id: (memoryStore.complaints?.length || 0) + 1,
      complaint_number: complaintNumber,
      scooter_id: null,
      scooter_number: scooter_number.toUpperCase().trim(),
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      location_address: location_address.trim(),
      location_url: finalLocationUrl,
      latitude: resolvedLat,
      longitude: resolvedLng,
      issue_category: issue_category || 'Breakdown / Mechanical Issue',
      description: description.trim(),
      priority: priority || 'Normal',
      hub_id: targetHub.id,
      hub_name: targetHub.hub_name,
      hub_incharge_id: null,
      hub_incharge_name: targetHub.incharge_name,
      technician_id: null,
      technician_name: null,
      technician_phone: null,
      technician_code: null,
      technician_latitude: null,
      technician_longitude: null,
      technician_location_updated_at: null,
      status: 'New',
      journey_started_at: null,
      reached_at: null,
      reached_latitude: null,
      reached_longitude: null,
      journey_duration_seconds: 0,
      journey_duration_formatted: '0m',
      work_started_at: null,
      work_completed_at: null,
      work_duration_seconds: 0,
      work_duration_formatted: '0m',
      work_performed: null,
      parts_used: [],
      technician_remarks: null,
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      return_journey_skipped_at: null,
      created_by_id: req.user?.id || 7,
      created_by_name: req.user?.name || 'Customer Support',
      created_by_role: req.user?.roleDisplayName || 'Customer Support',
      created_at: now,
      updated_at: now,
      closed_at: null
    };

    // Validate targetHub in database if DB is active
    let dbHubId: number | null = targetHub?.id ? Number(targetHub.id) : null;
    if (getDbStatus() && dbHubId) {
      try {
        const hubCheck = await pool.query('SELECT id FROM repair_hubs WHERE id = $1', [dbHubId]);
        if (hubCheck.rows.length === 0) {
          dbHubId = null;
        }
      } catch {
        dbHubId = null;
      }
    }

    if (getDbStatus()) {
      let currentNumber = complaintNumber;
      let inserted = false;
      let lastErr: any = null;

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const insertRes = await pool.query(
            `INSERT INTO complaints (
              complaint_number, scooter_number, customer_name, customer_phone, location_address,
              location_url, latitude, longitude, issue_category, description, priority,
              hub_id, hub_name, hub_incharge_name, status, created_by_id, created_by_name, created_by_role, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING id`,
            [
              currentNumber,
              newComplaint.scooter_number,
              newComplaint.customer_name,
              newComplaint.customer_phone,
              newComplaint.location_address,
              newComplaint.location_url,
              newComplaint.latitude,
              newComplaint.longitude,
              newComplaint.issue_category,
              newComplaint.description,
              newComplaint.priority,
              dbHubId,
              newComplaint.hub_name,
              newComplaint.hub_incharge_name,
              newComplaint.status,
              newComplaint.created_by_id,
              newComplaint.created_by_name,
              newComplaint.created_by_role,
              newComplaint.created_at,
              newComplaint.updated_at
            ]
          );

          if (insertRes.rows.length > 0) {
            newComplaint.id = insertRes.rows[0].id;
          }
          newComplaint.complaint_number = currentNumber;
          inserted = true;
          break;
        } catch (dbErr: any) {
          lastErr = dbErr;
          if (dbErr.code === '23505' && (dbErr.constraint?.includes('complaint_number') || dbErr.detail?.includes('complaint_number') || dbErr.message?.includes('complaint_number'))) {
            const match = currentNumber.match(/CMP-(\d+)/);
            const n = match ? parseInt(match[1], 10) + 1 : 129 + attempt;
            currentNumber = `CMP-${String(n).padStart(5, '0')}`;
            continue;
          }
          console.error('[createComplaint] DB insert error:', dbErr);
          break;
        }
      }

      if (!inserted) {
        console.error('[createComplaint] Failed to insert into database:', lastErr);
        return res.status(500).json({
          success: false,
          message: `Database error creating complaint: ${lastErr?.message || 'Insert failed'}`
        });
      }

      // Insert initial timeline event
      try {
        await pool.query(
          `INSERT INTO complaint_events (
            complaint_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, latitude, longitude, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newComplaint.id,
            'COMPLAINT_CREATED',
            'Complaint Logged',
            `Customer Support logged breakdown ticket for ${newComplaint.scooter_number} (${newComplaint.priority} priority). Routed to ${targetHub.hub_name}.`,
            'New',
            newComplaint.created_by_id,
            newComplaint.created_by_name,
            newComplaint.created_by_role,
            newComplaint.latitude,
            newComplaint.longitude,
            now
          ]
        );
      } catch (evtErr: any) {
        console.warn('[createComplaint] Event insert warning:', evtErr.message);
      }
    }

    // Add to memoryStore
    memoryStore.complaints.unshift(newComplaint);
    memoryStore.complaintEvents.push({
      id: (memoryStore.complaintEvents?.length || 0) + 1,
      complaint_id: newComplaint.id,
      event_type: 'COMPLAINT_CREATED',
      title: 'Complaint Logged',
      description: `Customer Support logged breakdown ticket for ${newComplaint.scooter_number} (${newComplaint.priority} priority). Routed to ${targetHub.hub_name}.`,
      status: 'New',
      performed_by_id: newComplaint.created_by_id,
      performed_by_name: newComplaint.created_by_name,
      performed_by_role: newComplaint.created_by_role,
      latitude: newComplaint.latitude,
      longitude: newComplaint.longitude,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: null,
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE_COMPLAINT',
      module: 'Complaints',
      recordId: newComplaint.id,
      newValues: newComplaint,
      notes: `Logged complaint ${newComplaint.complaint_number} for customer ${newComplaint.customer_name}`
    });

    return res.status(201).json({
      success: true,
      message: `Complaint ${newComplaint.complaint_number} created successfully and sent to ${targetHub.hub_name}`,
      data: newComplaint
    });
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    return res.status(500).json({ success: false, message: 'Server error creating complaint' });
  }
};

// 4. ASSIGN TECHNICIAN (HUB INCHARGE WORKFLOW)
export const assignTechnician = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id, hub_id } = req.body;
    const complaintId = Number(id);

    if (!technician_id) {
      return res.status(400).json({ success: false, message: 'Please select a technician to assign' });
    }

    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    if (getDbStatus()) {
      const targetComplaint = await pool.query(
        `SELECT id, hub_id FROM complaints WHERE id = $1 OR complaint_number = $2 LIMIT 1`,
        [complaintId || 0, id]
      );
      if (!targetComplaint.rows[0]) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }
      const targetHubId = Number(hub_id) || Number(targetComplaint.rows[0].hub_id) || null;
      const techResult = await pool.query(
        `SELECT t.id, t.technician_code, t.name, t.phone, t.hub_id, t.hub_name,
                t.specialization, t.status
         FROM technicians t
         JOIN users u ON LOWER(u.email) = LOWER(t.email)
         JOIN roles r ON r.id = u.role_id
         WHERE t.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL
           AND r.name ILIKE '%TECH%'
           AND LOWER(COALESCE(t.status, 'available')) NOT IN ('inactive', 'disabled', 'deleted')
           AND ($2::int IS NULL OR t.hub_id IS NULL OR t.hub_id = $2)
         LIMIT 1`,
        [Number(technician_id), targetHubId]
      );
      const tech = techResult.rows[0];
      if (!tech) {
        return res.status(404).json({ success: false, message: 'Selected active technician was not found for this service hub' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const complaintResult = await client.query(
          `UPDATE complaints SET
            technician_id = $1,
            technician_name = $2,
            technician_phone = $3,
            technician_code = $4,
            status = 'Assigned',
            updated_at = $5
           WHERE id = $6 OR complaint_number = $7
           RETURNING *`,
          [tech.id, tech.name, tech.phone, tech.technician_code, now, complaintId || 0, id]
        );
        if (!complaintResult.rows[0]) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        await client.query(
          `INSERT INTO complaint_events (
            complaint_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            complaintResult.rows[0].id,
            'TECHNICIAN_ASSIGNED',
            'Technician Assigned',
            `${performerName} assigned Field Technician ${tech.name} (${tech.technician_code}).`,
            'Assigned',
            req.user?.id || 6,
            performerName,
            performerRole,
            JSON.stringify({ technician_id: tech.id, technician_name: tech.name, technician_phone: tech.phone }),
            now
          ]
        );
        await client.query('COMMIT');
        await logAuditEvent({
          userId: req.user?.id,
          userName: req.user?.name,
          userRole: req.user?.roleName,
          action: 'ASSIGN_TECHNICIAN',
          module: 'Complaints',
          recordId: complaintResult.rows[0].id,
          newValues: { technician_id: tech.id, technician_name: tech.name, status: 'Assigned' },
          notes: `Assigned technician ${tech.name} to complaint ${complaintResult.rows[0].complaint_number || id}`
        });
        return res.json({
          success: true,
          message: `Technician ${tech.name} assigned successfully. Job now visible in Technician App.`,
          data: complaintResult.rows[0]
        });
      } catch (dbErr) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw dbErr;
      } finally {
        client.release();
      }
    }

    const tech = memoryStore.technicians.find(t => t.id === Number(technician_id));
    if (!tech) return res.status(404).json({ success: false, message: 'Selected technician not found' });
    const complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
    );

    if (complaint) {
      complaint.technician_id = tech.id;
      complaint.technician_name = tech.name;
      complaint.technician_phone = tech.phone;
      complaint.technician_code = tech.technician_code;
      complaint.status = 'Assigned';
      complaint.updated_at = now;

      memoryStore.complaintEvents.push({
        id: (memoryStore.complaintEvents?.length || 0) + 1,
        complaint_id: complaint.id,
        event_type: 'TECHNICIAN_ASSIGNED',
        title: 'Technician Assigned',
        description: `${performerName} assigned Field Technician ${tech.name} (${tech.technician_code}).`,
        status: 'Assigned',
        performed_by_id: req.user?.id || 6,
        performed_by_name: performerName,
        performed_by_role: performerRole,
        latitude: null,
        longitude: null,
        duration_seconds: 0,
        duration_formatted: null,
        metadata: { technician_id: tech.id, technician_name: tech.name },
        created_at: now
      });
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'ASSIGN_TECHNICIAN',
      module: 'Complaints',
      recordId: complaintId,
      newValues: { technician_id: tech.id, technician_name: tech.name, status: 'Assigned' },
      notes: `Assigned technician ${tech.name} to complaint ${complaint?.complaint_number || id}`
    });

    return res.json({
      success: true,
      message: `Technician ${tech.name} assigned successfully. Job now visible in Technician App.`,
      data: complaint
    });
  } catch (error: any) {
    console.error('Error assigning technician:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign technician' });
  }
};

// 5. UPDATE TECHNICIAN LIVE LOCATION PING (DURING JOURNEY / TRACKING)
export const updateTechnicianLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading, accuracy } = req.body;
    const complaintId = Number(id);

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

    if (isNaN(lat) || isNaN(lng) || !isValidLatLng(lat, lng)) {
      return res.status(400).json({ success: false, message: 'Invalid numeric coordinates provided' });
    }

    const now = new Date().toISOString();

    if (getDbStatus()) {
      const result = await pool.query(
          `UPDATE complaints SET
            technician_latitude = $1,
            technician_longitude = $2,
            technician_location_updated_at = $3
           WHERE (id = $4 OR complaint_number = $5)
             AND ($6::boolean = FALSE OR technician_id = (
               SELECT t.id FROM technicians t WHERE LOWER(t.email) = LOWER($7) LIMIT 1
             ))
           RETURNING id, technician_id`,
          [lat, lng, now, complaintId || 0, id,
            String(req.user?.roleName || '').toUpperCase().includes('TECH'), req.user?.email || '']
      );
      if (!result.rows[0]) {
        return res.status(404).json({ success: false, message: 'Assigned complaint not found' });
      }
      return res.json({
        success: true,
        data: {
          complaint_id: result.rows[0].id,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy ?? null,
          speed: speed ?? null,
          heading: heading ?? null,
          updated_at: now
        }
      });
    }

    const complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
    );

    if (complaint) {
      complaint.technician_latitude = lat;
      complaint.technician_longitude = lng;
      complaint.technician_location_updated_at = now;

      // Also update technician row in memoryStore if available
      if (complaint.technician_id) {
        const tech = (memoryStore.technicians || []).find(t => t.id === complaint.technician_id);
        if (tech) {
          (tech as any).current_latitude = lat;
          (tech as any).current_longitude = lng;
          (tech as any).last_seen_at = now;
        }
      }
    }

    return res.json({
      success: true,
      data: {
        complaint_id: complaint?.id || complaintId,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        updated_at: now
      }
    });
  } catch (error: any) {
    console.error('Error updating technician location:', error);
    return res.status(500).json({ success: false, message: 'Location sync failed' });
  }
};

// 6. UPDATE COMPLAINT STATUS (JOURNEY, REACHED, START WORK, WORK DONE, RETURN TO HUB, CLOSE)
export const updateComplaintStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      latitude,
      longitude,
      work_performed,
      parts_used = [],
      technician_remarks,
      proof_photos = [],
      completion_notes
    } = req.body;

    const complaintId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Technician';
    const performerRole = req.user?.roleDisplayName || 'Technician';

    let complaint: any;
    if (getDbStatus()) {
      const complaintResult = await pool.query(
        `SELECT c.*, tech.email AS assigned_technician_email
         FROM complaints c LEFT JOIN technicians tech ON tech.id = c.technician_id
         WHERE c.id = $1 OR c.complaint_number = $2 LIMIT 1`,
        [complaintId || 0, id]
      );
      complaint = complaintResult.rows[0];
      if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
      if (String(req.user?.roleName || '').toUpperCase().includes('TECH') &&
          String(complaint.assigned_technician_email || '').toLowerCase() !== String(req.user?.email || '').toLowerCase()) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }
      delete complaint.assigned_technician_email;
    } else {
      complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
      );
    }

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const isDuplicateStatusTransition =
      (status === 'En Route' && complaint.status === 'En Route' && complaint.journey_started_at) ||
      (status === 'Reached' && complaint.status === 'Reached' && complaint.reached_at) ||
      (status === 'Work In Progress' && complaint.status === 'Work In Progress' && complaint.work_started_at) ||
      (status === 'Work Done' && complaint.status === 'Work Done' && complaint.work_completed_at) ||
      ((status === 'Return to Hub' || status === 'Returning') && complaint.return_journey_started_at && !complaint.return_journey_completed_at) ||
      ((status === 'Reached Hub' || status === 'Returned to Hub') && complaint.return_journey_completed_at) ||
      (status === 'Proceed to Next Complaint' && complaint.return_journey_skipped_at) ||
      (status === 'Closed' && complaint.status === 'Closed' && complaint.closed_at);

    if (isDuplicateStatusTransition) {
      return res.json({
        success: true,
        message: `Complaint status is already ${complaint.status}`,
        data: complaint
      });
    }

    let eventType = 'STATUS_CHANGED';
    let eventTitle = `Status updated to ${status}`;
    let eventDescription = `${performerName} updated status to ${status}.`;

    // 1. START JOURNEY -> EN ROUTE
    if (status === 'En Route') {
      complaint.status = 'En Route';
      complaint.journey_started_at = now;
      if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
        complaint.technician_latitude = Number(latitude);
        complaint.technician_longitude = Number(longitude);
        complaint.technician_location_updated_at = now;
      }
      eventType = 'JOURNEY_STARTED';
      eventTitle = 'Journey Started';
      eventDescription = `Technician ${complaint.technician_name || performerName} accepted the field ticket and started journey to customer breakdown location.`;
    }

    // 2. REACHED LOCATION -> REACHED
    else if (status === 'Reached') {
      complaint.status = 'Reached';
      complaint.reached_at = now;
      if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
        complaint.reached_latitude = Number(latitude);
        complaint.reached_longitude = Number(longitude);
        complaint.technician_latitude = Number(latitude);
        complaint.technician_longitude = Number(longitude);
        complaint.technician_location_updated_at = now;
      }

      if (complaint.journey_started_at) {
        const startSec = new Date(complaint.journey_started_at).getTime();
        const endSec = new Date(now).getTime();
        const diffSec = Math.max(1, Math.round((endSec - startSec) / 1000));
        complaint.journey_duration_seconds = diffSec;
        complaint.journey_duration_formatted = formatDuration(diffSec);
      }

      eventType = 'REACHED_LOCATION';
      eventTitle = 'Reached Customer Location';
      eventDescription = `Technician ${complaint.technician_name || performerName} arrived at customer breakdown spot (${complaint.journey_duration_formatted || 'On Time'}).`;
    }

    // 3. START WORK -> WORK IN PROGRESS
    else if (status === 'Work In Progress') {
      complaint.status = 'Work In Progress';
      complaint.work_started_at = now;
      eventType = 'WORK_STARTED';
      eventTitle = 'Field Repair Started';
      eventDescription = `Technician ${complaint.technician_name || performerName} began on-site scooter inspection and repair work.`;
    }

    // 4. WORK DONE -> WORK DONE
    else if (status === 'Work Done') {
      complaint.status = 'Work Done';
      complaint.work_completed_at = now;
      if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
        complaint.final_latitude = Number(latitude);
        complaint.final_longitude = Number(longitude);
      }
      if (work_performed) complaint.work_performed = work_performed;
      if (parts_used) complaint.parts_used = parts_used;
      if (technician_remarks) complaint.technician_remarks = technician_remarks;
      if (proof_photos) complaint.proof_photos = proof_photos;
      if (completion_notes) complaint.completion_notes = completion_notes;

      if (complaint.work_started_at) {
        const startSec = new Date(complaint.work_started_at).getTime();
        const endSec = new Date(now).getTime();
        const diffSec = Math.max(1, Math.round((endSec - startSec) / 1000));
        complaint.work_duration_seconds = diffSec;
        complaint.work_duration_formatted = formatDuration(diffSec);
      }

      eventType = 'WORK_DONE';
      eventTitle = 'Work Completed';
      eventDescription = `Field repair completed by ${complaint.technician_name || performerName}. Work: ${work_performed || 'Repaired & road-tested'}.`;
    }

    // 5. RETURN TO HUB -> RETURN TO HUB
    else if (status === 'Return to Hub' || status === 'Returning') {
      complaint.status = 'Work Done'; // keep state clean
      complaint.return_journey_started_at = now;
      complaint.return_journey_completed_at = null;
      eventType = 'RETURN_TO_HUB_STARTED';
      eventTitle = 'Returning to Service Hub';
      eventDescription = `Technician ${complaint.technician_name || performerName} started journey back to ${complaint.hub_name}.`;
    }

    // 6. ARRIVED BACK AT HUB -> COMPLETE THE RETURN JOURNEY
    else if (status === 'Reached Hub' || status === 'Returned to Hub') {
      if (!complaint.return_journey_started_at) {
        return res.status(400).json({ success: false, message: 'Return journey has not been started' });
      }
      complaint.status = 'Work Done';
      complaint.return_journey_completed_at = now;
      if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
        complaint.final_latitude = Number(latitude);
        complaint.final_longitude = Number(longitude);
        complaint.technician_latitude = Number(latitude);
        complaint.technician_longitude = Number(longitude);
        complaint.technician_location_updated_at = now;
      }
      const returnSeconds = Math.max(1, Math.round((new Date(now).getTime() - new Date(complaint.return_journey_started_at).getTime()) / 1000));
      eventType = 'RETURN_TO_HUB_COMPLETED';
      eventTitle = 'Reached Service Hub';
      eventDescription = `Technician ${complaint.technician_name || performerName} returned to ${complaint.hub_name} in ${formatDuration(returnSeconds)}.`;
    }

    // A technician may be dispatched directly to another complaint without returning to the hub.
    else if (status === 'Proceed to Next Complaint') {
      complaint.status = 'Work Done';
      complaint.return_journey_skipped_at = now;
      eventType = 'RETURN_TO_HUB_SKIPPED';
      eventTitle = 'Hub Return Skipped';
      eventDescription = `Technician ${complaint.technician_name || performerName} was dispatched directly to the next complaint without returning to ${complaint.hub_name}.`;
    }

    // 7. CLOSED -> CLOSED
    else if (status === 'Closed') {
      complaint.status = 'Closed';
      complaint.closed_at = now;
      eventType = 'COMPLAINT_CLOSED';
      eventTitle = 'Complaint Closed & Resolved';
      eventDescription = `Complaint closed successfully by ${performerName}. Customer notified.`;
    } else {
      complaint.status = status;
    }

    complaint.updated_at = now;

    // Database sync
    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE complaints SET
            status = $1,
            journey_started_at = COALESCE($2, journey_started_at),
            reached_at = COALESCE($3, reached_at),
            reached_latitude = COALESCE($4, reached_latitude),
            reached_longitude = COALESCE($5, reached_longitude),
            journey_duration_seconds = COALESCE($6, journey_duration_seconds),
            journey_duration_formatted = COALESCE($7, journey_duration_formatted),
            work_started_at = COALESCE($8, work_started_at),
            work_completed_at = COALESCE($9, work_completed_at),
            work_duration_seconds = COALESCE($10, work_duration_seconds),
            work_duration_formatted = COALESCE($11, work_duration_formatted),
            work_performed = COALESCE($12, work_performed),
            parts_used = COALESCE($13, parts_used),
            technician_remarks = COALESCE($14, technician_remarks),
            proof_photos = COALESCE($15, proof_photos),
            completion_notes = COALESCE($16, completion_notes),
            final_latitude = COALESCE($17, final_latitude),
            final_longitude = COALESCE($18, final_longitude),
            return_journey_started_at = $19,
            return_journey_completed_at = $20,
            return_journey_skipped_at = $21,
            closed_at = COALESCE($22, closed_at),
            updated_at = $23
           WHERE id = $24 OR complaint_number = $25`,
          [
            complaint.status,
            complaint.journey_started_at,
            complaint.reached_at,
            complaint.reached_latitude,
            complaint.reached_longitude,
            complaint.journey_duration_seconds,
            complaint.journey_duration_formatted,
            complaint.work_started_at,
            complaint.work_completed_at,
            complaint.work_duration_seconds,
            complaint.work_duration_formatted,
            complaint.work_performed,
            JSON.stringify(complaint.parts_used || []),
            complaint.technician_remarks,
            JSON.stringify(complaint.proof_photos || []),
            complaint.completion_notes,
            complaint.final_latitude,
            complaint.final_longitude,
            complaint.return_journey_started_at,
            complaint.return_journey_completed_at,
            complaint.return_journey_skipped_at,
            complaint.closed_at,
            now,
            complaint.id,
            id
          ]
        );

        await pool.query(
          `INSERT INTO complaint_events (
            complaint_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, latitude, longitude, duration_seconds, duration_formatted, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            complaint.id,
            eventType,
            eventTitle,
            eventDescription,
            complaint.status,
            req.user?.id || 5,
            performerName,
            performerRole,
            latitude ? Number(latitude) : null,
            longitude ? Number(longitude) : null,
            eventType === 'RETURN_TO_HUB_COMPLETED'
              ? Math.max(1, Math.round((new Date(now).getTime() - new Date(complaint.return_journey_started_at).getTime()) / 1000))
              : complaint.work_duration_seconds || complaint.journey_duration_seconds || 0,
            eventType === 'RETURN_TO_HUB_COMPLETED'
              ? formatDuration(Math.max(1, Math.round((new Date(now).getTime() - new Date(complaint.return_journey_started_at).getTime()) / 1000)))
              : complaint.work_duration_formatted || complaint.journey_duration_formatted || null,
            now
          ]
        );
      } catch (dbErr) {
        console.error('[updateComplaintStatus] DB update error:', dbErr);
        throw dbErr;
      }
    }

    // Add event to memory store
    memoryStore.complaintEvents.push({
      id: (memoryStore.complaintEvents?.length || 0) + 1,
      complaint_id: complaint.id,
      event_type: eventType,
      title: eventTitle,
      description: eventDescription,
      status: complaint.status,
      performed_by_id: req.user?.id || 5,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      duration_seconds: eventType === 'RETURN_TO_HUB_COMPLETED'
        ? Math.max(1, Math.round((new Date(now).getTime() - new Date(complaint.return_journey_started_at).getTime()) / 1000))
        : complaint.work_duration_seconds || complaint.journey_duration_seconds || 0,
      duration_formatted: eventType === 'RETURN_TO_HUB_COMPLETED'
        ? formatDuration(Math.max(1, Math.round((new Date(now).getTime() - new Date(complaint.return_journey_started_at).getTime()) / 1000)))
        : complaint.work_duration_formatted || complaint.journey_duration_formatted || null,
      metadata: null,
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: `COMPLAINT_${status.toUpperCase().replace(/\s+/g, '_')}`,
      module: 'Complaints',
      recordId: complaint.id,
      newValues: { status: complaint.status },
      notes: eventDescription
    });

    return res.json({
      success: true,
      message: `Complaint status updated to ${complaint.status}`,
      data: complaint
    });
  } catch (error: any) {
    console.error('Error updating complaint status:', error);
    return res.status(500).json({ success: false, message: 'Status update failed' });
  }
};
