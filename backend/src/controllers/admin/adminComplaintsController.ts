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

// Helper to auto-generate sequential Complaint Number CMP-00125 etc.
const generateComplaintNumber = (): string => {
  const existingNumbers = (memoryStore.complaints || [])
    .map(c => {
      const match = c.complaint_number.match(/CMP-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));

  const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 123;
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
          whereClauses.push(`c.technician_id = $${pIndex}`);
          params.push(userId);
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
          technicians: memoryStore.technicians
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
          `SELECT c.*, tech.phone as technician_phone, tech.technician_code, tech.specialization as technician_specialization, tech.rating as technician_rating
           FROM complaints c
           LEFT JOIN technicians tech ON c.technician_id = tech.id
           WHERE c.id = $1 OR c.complaint_number = $2`,
          [complaintId || 0, id]
        );

        if (cRes.rows.length > 0) {
          const complaint = cRes.rows[0];
          const eventsRes = await pool.query(
            `SELECT * FROM complaint_events WHERE complaint_id = $1 ORDER BY created_at ASC`,
            [complaint.id]
          );

          return res.json({
            success: true,
            data: complaint,
            timeline: eventsRes.rows,
            hubs: memoryStore.repairHubs,
            technicians: memoryStore.technicians
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

    const complaintNumber = generateComplaintNumber();
    const now = new Date().toISOString();

    const newComplaint: any = {
      id: (memoryStore.complaints?.length || 0) + 1,
      complaint_number: complaintNumber,
      scooter_id: null,
      scooter_number: scooter_number.toUpperCase().trim(),
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      location_address: location_address.trim(),
      location_url: location_url || (latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : ''),
      latitude: latitude ? Number(latitude) : (targetHub.id === 1 ? 30.3256 : 30.3427),
      longitude: longitude ? Number(longitude) : (targetHub.id === 1 ? 78.0436 : 78.0645),
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
      created_by_id: req.user?.id || 7,
      created_by_name: req.user?.name || 'Customer Support',
      created_by_role: req.user?.roleDisplayName || 'Customer Support',
      created_at: now,
      updated_at: now,
      closed_at: null
    };

    if (getDbStatus()) {
      try {
        const insertRes = await pool.query(
          `INSERT INTO complaints (
            complaint_number, scooter_number, customer_name, customer_phone, location_address,
            location_url, latitude, longitude, issue_category, description, priority,
            hub_id, hub_name, hub_incharge_name, status, created_by_id, created_by_name, created_by_role, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id`,
          [
            newComplaint.complaint_number,
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
            newComplaint.hub_id,
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

        // Insert initial timeline event
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
      } catch (dbErr) {
        console.warn('[createComplaint] DB insert error, falling back to memoryStore:', dbErr);
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

    const tech = memoryStore.technicians.find(t => t.id === Number(technician_id));
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Selected technician not found' });
    }

    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE complaints SET
            technician_id = $1,
            technician_name = $2,
            technician_phone = $3,
            technician_code = $4,
            status = 'Assigned',
            updated_at = $5
           WHERE id = $6 OR complaint_number = $7`,
          [tech.id, tech.name, tech.phone, tech.technician_code, now, complaintId || 0, id]
        );

        await pool.query(
          `INSERT INTO complaint_events (
            complaint_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            complaintId,
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
      } catch (dbErr) {
        console.warn('[assignTechnician] DB update error, falling back to memoryStore:', dbErr);
      }
    }

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
    const { latitude, longitude, speed, heading } = req.body;
    const complaintId = Number(id);

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Invalid numeric coordinates provided' });
    }

    const now = new Date().toISOString();

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE complaints SET
            technician_latitude = $1,
            technician_longitude = $2,
            technician_location_updated_at = $3
           WHERE id = $4 OR complaint_number = $5`,
          [lat, lng, now, complaintId || 0, id]
        );
      } catch (dbErr) {
        console.warn('[updateTechnicianLocation] DB ping error:', dbErr);
      }
    }

    const complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
    );

    if (complaint) {
      complaint.technician_latitude = lat;
      complaint.technician_longitude = lng;
      complaint.technician_location_updated_at = now;
    }

    return res.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
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

    const complaint = (memoryStore.complaints || []).find(
      c => c.id === complaintId || c.complaint_number.toLowerCase() === id.toLowerCase()
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    let eventType = 'STATUS_CHANGED';
    let eventTitle = `Status updated to ${status}`;
    let eventDescription = `${performerName} updated status to ${status}.`;

    // 1. START JOURNEY -> EN ROUTE
    if (status === 'En Route') {
      complaint.status = 'En Route';
      complaint.journey_started_at = now;
      if (latitude && longitude) {
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
      if (latitude && longitude) {
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
      if (latitude && longitude) {
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
      eventType = 'RETURN_TO_HUB_STARTED';
      eventTitle = 'Returning to Service Hub';
      eventDescription = `Technician ${complaint.technician_name || performerName} started journey back to ${complaint.hub_name}.`;
    }

    // 6. CLOSED -> CLOSED
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
            return_journey_started_at = COALESCE($19, return_journey_started_at),
            closed_at = COALESCE($20, closed_at),
            updated_at = $21
           WHERE id = $22 OR complaint_number = $23`,
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
            complaint.work_duration_seconds || complaint.journey_duration_seconds || 0,
            complaint.work_duration_formatted || complaint.journey_duration_formatted || null,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[updateComplaintStatus] DB update error:', dbErr);
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
      duration_seconds: complaint.work_duration_seconds || complaint.journey_duration_seconds || 0,
      duration_formatted: complaint.work_duration_formatted || complaint.journey_duration_formatted || null,
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
