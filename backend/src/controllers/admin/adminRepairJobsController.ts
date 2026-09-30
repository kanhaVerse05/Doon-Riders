import { Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

// Helper: Format seconds to "1h 42m 15s"
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

// 1. GET ALL REPAIR JOBS (WITH SEARCH, FILTERS, STATS & METRICS)
export const getAllRepairJobs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      search = '',
      hub_id,
      technician_id,
      status,
      priority,
      payment_status,
      sort_by = 'newest',
      sort_order = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    const searchTerm = String(search || '').toLowerCase().trim();

    if (getDbStatus()) {
      try {
        let whereClauses: string[] = ['1=1'];
        let params: any[] = [];
        let pIndex = 1;

        if (searchTerm) {
          whereClauses.push(`(
            LOWER(j.job_number) LIKE $${pIndex} OR 
            LOWER(j.scooter_number) LIKE $${pIndex} OR 
            LOWER(j.rider_name) LIKE $${pIndex} OR 
            LOWER(j.rider_contact) LIKE $${pIndex} OR 
            LOWER(j.complaint) LIKE $${pIndex}
          )`);
          params.push(`%${searchTerm}%`);
          pIndex++;
        }

        if (hub_id && hub_id !== 'all') {
          whereClauses.push(`j.hub_id = $${pIndex}`);
          params.push(Number(hub_id));
          pIndex++;
        }

        if (technician_id && technician_id !== 'all') {
          whereClauses.push(`j.technician_id = $${pIndex}`);
          params.push(Number(technician_id));
          pIndex++;
        }

        if (status && status !== 'all') {
          whereClauses.push(`j.status = $${pIndex}`);
          params.push(status);
          pIndex++;
        }

        if (priority && priority !== 'all') {
          whereClauses.push(`j.priority = $${pIndex}`);
          params.push(priority);
          pIndex++;
        }

        if (payment_status && payment_status !== 'all') {
          whereClauses.push(`p.payment_status = $${pIndex}`);
          params.push(payment_status);
          pIndex++;
        }

        let orderSql = 'j.id DESC';
        if (sort_by === 'oldest') orderSql = 'j.id ASC';
        if (sort_by === 'priority') orderSql = `CASE j.priority WHEN 'Urgent' THEN 1 ELSE 2 END, j.id DESC`;
        if (sort_by === 'bill_amount') orderSql = `COALESCE(b.grand_total, 0) ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;

        const sql = `
          SELECT 
            j.*,
            t.repair_started_at,
            t.repair_completed_at,
            t.total_duration_seconds,
            t.total_duration_formatted,
            b.grand_total as bill_amount,
            b.bill_number,
            p.payment_method,
            p.payment_status,
            p.amount as payment_amount,
            p.paid_at as payment_paid_at,
            tech.phone as technician_phone,
            tech.technician_code
          FROM repair_jobs j
          LEFT JOIN repair_timing t ON j.id = t.job_id
          LEFT JOIN repair_bills b ON j.id = b.job_id
          LEFT JOIN repair_payments p ON j.id = p.job_id
          LEFT JOIN technicians tech ON j.technician_id = tech.id
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY ${orderSql}
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;

        const result = await pool.query(sql, params);

        // Stats query
        const allJobsRes = await pool.query(`
          SELECT 
            status, 
            COUNT(*) as count 
          FROM repair_jobs 
          GROUP BY status
        `);

        const stats = {
          totalJobs: 0,
          pendingInspection: 0,
          technicianAssigned: 0,
          partsApprovalPending: 0,
          repairing: 0,
          readyForBilling: 0,
          paymentPending: 0,
          completedClosed: 0
        };

        allJobsRes.rows.forEach(r => {
          const c = Number(r.count);
          stats.totalJobs += c;
          if (r.status === 'Pending Inspection') stats.pendingInspection += c;
          if (r.status === 'Technician Assigned') stats.technicianAssigned += c;
          if (r.status === 'Inspection Completed') stats.partsApprovalPending += c;
          if (r.status === 'Repair Approved') stats.partsApprovalPending += c;
          if (r.status === 'Repairing') stats.repairing += c;
          if (r.status === 'Repair Completed') stats.readyForBilling += c;
          if (r.status === 'Billing Completed' || r.status === 'Payment Pending') stats.paymentPending += c;
          if (r.status === 'Payment Received' || r.status === 'Closed') stats.completedClosed += c;
        });

        return res.json({
          success: true,
          data: result.rows,
          stats,
          hubs: memoryStore.repairHubs,
          technicians: memoryStore.technicians
        });
      } catch (dbErr) {
        console.warn('DB query error, falling back to memoryStore:', dbErr);
      }
    }

    // Fallback: In-Memory Store
    let filtered = [...memoryStore.repairJobs];

    if (searchTerm) {
      filtered = filtered.filter(j =>
        j.job_number.toLowerCase().includes(searchTerm) ||
        j.scooter_number.toLowerCase().includes(searchTerm) ||
        j.rider_name.toLowerCase().includes(searchTerm) ||
        j.rider_contact.toLowerCase().includes(searchTerm) ||
        j.complaint.toLowerCase().includes(searchTerm)
      );
    }

    if (hub_id && hub_id !== 'all') {
      filtered = filtered.filter(j => j.hub_id === Number(hub_id));
    }

    if (technician_id && technician_id !== 'all') {
      filtered = filtered.filter(j => j.technician_id === Number(technician_id));
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(j => j.status === status);
    }

    if (priority && priority !== 'all') {
      filtered = filtered.filter(j => j.priority === priority);
    }

    // Enrich with timing, bill, and payment
    const enriched = filtered.map(job => {
      const timing = memoryStore.repairTiming.find(t => t.job_id === job.id);
      const bill = memoryStore.repairBills.find(b => b.job_id === job.id);
      const payment = memoryStore.repairPayments.find(p => p.job_id === job.id);
      const tech = memoryStore.technicians.find(t => t.id === job.technician_id);

      let currentElapsedSeconds = 0;
      if (job.status === 'Repairing' && timing?.repair_started_at) {
        const startMs = new Date(timing.repair_started_at).getTime();
        currentElapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      }

      return {
        ...job,
        repair_started_at: timing?.repair_started_at || null,
        repair_completed_at: timing?.repair_completed_at || null,
        total_duration_seconds: timing?.total_duration_seconds || currentElapsedSeconds,
        total_duration_formatted: timing?.total_duration_formatted || (currentElapsedSeconds > 0 ? formatDuration(currentElapsedSeconds) : null),
        bill_amount: bill?.grand_total || null,
        bill_number: bill?.bill_number || null,
        payment_method: payment?.payment_method || null,
        payment_status: payment?.payment_status || (bill ? 'Pending' : null),
        payment_amount: payment?.amount || null,
        payment_paid_at: payment?.paid_at || null,
        technician_phone: tech?.phone || null,
        technician_code: tech?.technician_code || null
      };
    });

    if (payment_status && payment_status !== 'all') {
      filtered = enriched.filter(j => j.payment_status === payment_status);
    }

    // Sorting
    enriched.sort((a, b) => {
      if (sort_by === 'oldest') return a.id - b.id;
      if (sort_by === 'priority') {
        const pA = a.priority === 'Urgent' ? 1 : 2;
        const pB = b.priority === 'Urgent' ? 1 : 2;
        return pA - pB || b.id - a.id;
      }
      if (sort_by === 'bill_amount') {
        const bA = a.bill_amount || 0;
        const bB = b.bill_amount || 0;
        return sort_order === 'asc' ? bA - bB : bB - bA;
      }
      if (sort_by === 'duration') {
        const dA = a.total_duration_seconds || 0;
        const dB = b.total_duration_seconds || 0;
        return sort_order === 'asc' ? dA - dB : dB - dA;
      }
      return b.id - a.id; // default newest
    });

    const stats = {
      totalJobs: memoryStore.repairJobs.length,
      pendingInspection: memoryStore.repairJobs.filter(j => j.status === 'Pending Inspection').length,
      technicianAssigned: memoryStore.repairJobs.filter(j => j.status === 'Technician Assigned').length,
      partsApprovalPending: memoryStore.repairJobs.filter(j => j.status === 'Inspection Completed' || j.status === 'Repair Approved').length,
      repairing: memoryStore.repairJobs.filter(j => j.status === 'Repairing').length,
      readyForBilling: memoryStore.repairJobs.filter(j => j.status === 'Repair Completed').length,
      paymentPending: memoryStore.repairJobs.filter(j => j.status === 'Billing Completed' || j.status === 'Payment Pending').length,
      completedClosed: memoryStore.repairJobs.filter(j => j.status === 'Payment Received' || j.status === 'Closed').length
    };

    return res.json({
      success: true,
      data: enriched,
      stats,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. GET REPAIR JOB BY ID (FULL 360-DEGREE DETAILS & AUDIT TIMELINE)
export const getRepairJobById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    const hub = memoryStore.repairHubs.find(h => h.id === job.hub_id) || {
      id: job.hub_id,
      hub_name: job.hub_name,
      location: 'Dehradun Hub Station',
      incharge_name: 'Hub Incharge',
      incharge_phone: '+91 98970 00000'
    };

    const technician = memoryStore.technicians.find(t => t.id === job.technician_id) || null;
    const inspection = memoryStore.repairInspections.find(i => i.job_id === jobId) || null;
    const parts = memoryStore.repairParts.filter(p => p.job_id === jobId);
    const timing = memoryStore.repairTiming.find(t => t.job_id === jobId) || null;
    const bill = memoryStore.repairBills.find(b => b.job_id === jobId) || null;
    const payment = memoryStore.repairPayments.find(p => p.job_id === jobId) || null;
    const timeline = memoryStore.repairEvents
      .filter(e => e.job_id === jobId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Compute live elapsed repair duration if status is currently Repairing
    let liveElapsedSeconds = 0;
    if (job.status === 'Repairing' && timing?.repair_started_at) {
      const startMs = new Date(timing.repair_started_at).getTime();
      liveElapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }

    return res.json({
      success: true,
      data: {
        job,
        hub,
        technician,
        inspection,
        parts: {
          all: parts,
          requested: parts.filter(p => p.requested_quantity > 0),
          approved: parts.filter(p => p.approved_quantity > 0),
          replaced: parts.filter(p => p.replaced_quantity > 0 || p.status === 'Replaced')
        },
        timing: {
          ...timing,
          live_elapsed_seconds: liveElapsedSeconds,
          live_duration_formatted: liveElapsedSeconds > 0 ? formatDuration(liveElapsedSeconds) : timing?.total_duration_formatted
        },
        bill,
        payment,
        timeline,
        available_technicians: memoryStore.technicians,
        inventory_parts: memoryStore.inventory
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. CREATE NEW REPAIR JOB (HUB INCHARGE / ADMIN)
export const createRepairJob = async (req: AuthRequest, res: Response) => {
  try {
    const {
      scooter_number,
      rider_name,
      rider_contact,
      hub_id,
      complaint,
      priority = 'Normal',
      technician_id,
      job_date
    } = req.body;

    if (!scooter_number || !rider_name || !rider_contact || !hub_id || !complaint) {
      return res.status(400).json({
        success: false,
        message: 'Scooter Number, Rider Name, Contact Number, Hub, and Complaint description are required.'
      });
    }

    // Resolve Hub
    const hub = memoryStore.repairHubs.find(h => h.id === Number(hub_id)) || memoryStore.repairHubs[0];

    // Resolve Technician if assigned
    let techName: string | null = null;
    let techId: number | null = null;
    if (technician_id) {
      const tech = memoryStore.technicians.find(t => t.id === Number(technician_id));
      if (tech) {
        techId = tech.id;
        techName = tech.name;
        tech.active_jobs_count += 1;
        if (tech.active_jobs_count >= 3) tech.status = 'Busy';
      }
    }

    // Generate unique Job ID: e.g. JOB-000107
    const nextId = memoryStore.repairJobs.length > 0
      ? Math.max(...memoryStore.repairJobs.map(j => j.id)) + 1
      : 1;
    const jobNumber = `JOB-${String(100 + nextId).padStart(6, '0')}`;

    const initialStatus = techId ? 'Technician Assigned' : 'Pending Inspection';
    const createdAt = job_date ? new Date(job_date).toISOString() : new Date().toISOString();

    const newJob = {
      id: nextId,
      job_number: jobNumber,
      scooter_id: null,
      scooter_number: scooter_number.toUpperCase().trim(),
      rider_name: rider_name.trim(),
      rider_contact: rider_contact.trim(),
      hub_id: hub.id,
      hub_name: hub.hub_name,
      technician_id: techId,
      technician_name: techName,
      complaint: complaint.trim(),
      priority: priority === 'Urgent' ? 'Urgent' : 'Normal',
      status: initialStatus,
      created_by_id: req.user?.id || 1,
      created_by_name: req.user?.name || 'Hub Incharge',
      created_at: createdAt,
      updated_at: createdAt,
      closed_at: null
    };

    memoryStore.repairJobs.unshift(newJob as any);

    // Initial Timeline Event
    const event1 = {
      id: memoryStore.repairEvents.length + 1,
      job_id: newJob.id,
      event_type: 'JOB_CREATED',
      title: 'Job Created',
      description: `Job created for vehicle ${newJob.scooter_number} (${newJob.priority} priority). Complaint: "${newJob.complaint}"`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: createdAt
    };
    memoryStore.repairEvents.push(event1);

    if (techId && techName) {
      const event2 = {
        id: memoryStore.repairEvents.length + 1,
        job_id: newJob.id,
        event_type: 'TECHNICIAN_ASSIGNED',
        title: 'Technician Assigned',
        description: `Technician ${techName} assigned to the job.`,
        performed_by_id: req.user?.id || 1,
        performed_by_name: req.user?.name || 'Hub Incharge',
        performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
        metadata: null,
        created_at: createdAt
      };
      memoryStore.repairEvents.push(event2);

      // Notification
      memoryStore.repairNotifications.unshift({
        id: memoryStore.repairNotifications.length + 1,
        job_id: newJob.id,
        job_number: newJob.job_number,
        recipient_role: 'TECHNICIAN',
        recipient_id: techId,
        title: 'New Repair Job Assigned',
        message: `New repair job ${newJob.job_number} has been assigned to you for scooter ${newJob.scooter_number}.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE',
      module: 'REPAIR_JOBS',
      recordId: newJob.id,
      notes: `Created Repair Job ${jobNumber} for ${scooter_number}`
    });

    return res.status(201).json({
      success: true,
      data: newJob,
      message: `Repair Job ${jobNumber} created successfully!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. ASSIGN / REASSIGN TECHNICIAN
export const assignTechnician = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    const jobId = Number(id);

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    if (job.status === 'Closed' || job.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot assign technician to a closed or cancelled job.' });
    }

    const tech = memoryStore.technicians.find(t => t.id === Number(technician_id));
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Technician not found.' });
    }

    // Decrement previous tech's workload if changed
    if (job.technician_id && job.technician_id !== tech.id) {
      const prevTech = memoryStore.technicians.find(t => t.id === job.technician_id);
      if (prevTech && prevTech.active_jobs_count > 0) {
        prevTech.active_jobs_count -= 1;
        if (prevTech.active_jobs_count < 3) prevTech.status = 'Available';
      }
    }

    job.technician_id = tech.id;
    job.technician_name = tech.name;
    job.updated_at = new Date().toISOString();

    if (job.status === 'Pending Inspection') {
      job.status = 'Technician Assigned';
    }

    tech.active_jobs_count += 1;
    if (tech.active_jobs_count >= 3) tech.status = 'Busy';

    // Log Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'TECHNICIAN_ASSIGNED',
      title: 'Technician Assigned',
      description: `Technician ${tech.name} (${tech.technician_code}) assigned to job.`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: new Date().toISOString()
    });

    // Send Notification
    memoryStore.repairNotifications.unshift({
      id: memoryStore.repairNotifications.length + 1,
      job_id: jobId,
      job_number: job.job_number,
      recipient_role: 'TECHNICIAN',
      recipient_id: tech.id,
      title: 'New Repair Job Assigned',
      message: `New repair job ${job.job_number} has been assigned to you.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      data: job,
      message: `Technician ${tech.name} assigned successfully!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. SUBMIT TECHNICIAN INSPECTION REPORT & REQUIRED PARTS
export const submitInspection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const {
      problem_found,
      inspection_notes = '',
      estimated_repair_time = '',
      photos = [],
      required_parts = []
    } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    if (!problem_found || problem_found.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Problem Found description is required for inspection.' });
    }

    const techName = job.technician_name || req.user?.name || 'Technician';

    // Save or update inspection
    let inspection = memoryStore.repairInspections.find(i => i.job_id === jobId);
    if (inspection) {
      inspection.problem_found = problem_found;
      inspection.inspection_notes = inspection_notes;
      inspection.estimated_repair_time = estimated_repair_time;
      inspection.photos = photos;
      inspection.inspected_at = new Date().toISOString();
    } else {
      inspection = {
        id: memoryStore.repairInspections.length + 1,
        job_id: jobId,
        technician_id: job.technician_id,
        technician_name: techName,
        problem_found,
        inspection_notes,
        estimated_repair_time,
        photos,
        inspected_at: new Date().toISOString()
      };
      memoryStore.repairInspections.push(inspection);
    }

    // Save required parts (preserving requested quantities)
    const validParts = Array.isArray(required_parts) ? required_parts.filter((p: any) => p.part_name && p.part_name.trim().length > 0) : [];
    const hasParts = validParts.length > 0;

    // Remove any previously requested parts for this job that weren't approved yet
    memoryStore.repairParts = memoryStore.repairParts.filter(p => p.job_id !== jobId);

    if (hasParts) {
      validParts.forEach((p: any) => {
        const qty = Number(p.requested_quantity || p.quantity || 1);
        const unitPrice = Number(p.unit_price || 0);

        memoryStore.repairParts.push({
          id: memoryStore.repairParts.length + 1,
          job_id: jobId,
          part_id: p.part_id || 0,
          part_name: p.part_name || 'EV Spare Part',
          requested_quantity: qty,
          approved_quantity: 0,
          replaced_quantity: 0,
          unit_price: unitPrice,
          total_price: qty * unitPrice,
          status: 'Requested',
          notes: p.notes || ''
        });
      });
    }

    if (hasParts) {
      job.status = 'Inspection Completed';
    } else {
      // No parts needed - directly ready for repair
      job.status = 'Repair Approved';
    }
    job.updated_at = new Date().toISOString();

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'INSPECTION_COMPLETED',
      title: 'Inspection Completed',
      description: hasParts
        ? `Technician ${techName} completed inspection. Found: "${problem_found}". ${validParts.length} parts requested.`
        : `Technician ${techName} completed inspection. Found: "${problem_found}". No parts required (Directly approved for repair).`,
      performed_by_id: req.user?.id || job.technician_id || 1,
      performed_by_name: techName,
      performed_by_role: 'Technician',
      metadata: null,
      created_at: new Date().toISOString()
    });

    if (hasParts) {
      // Notify Hub Incharge for parts approval
      memoryStore.repairNotifications.unshift({
        id: memoryStore.repairNotifications.length + 1,
        job_id: jobId,
        job_number: job.job_number,
        recipient_role: 'HUB_INCHARGE',
        recipient_id: null,
        title: 'Parts Approval Required',
        message: `Technician completed inspection for ${job.job_number}. Parts approval required.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: {
        job,
        inspection,
        parts: memoryStore.repairParts.filter(p => p.job_id === jobId)
      },
      message: hasParts
        ? 'Technician inspection submitted! Sent to Hub Incharge for parts approval.'
        : 'Inspection submitted (No parts required)! You can start work immediately.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. PARTS CONFIRMATION / APPROVAL (HUB INCHARGE)
export const approveParts = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const {
      approved_parts = [],
      labour_charge = 0,
      other_charge = 0,
      notes = ''
    } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    if (!Array.isArray(approved_parts)) {
      return res.status(400).json({ success: false, message: 'Approved parts list must be an array.' });
    }

    let totalPartsEstimate = 0;

    // Process Approved Parts:
    // Update existing requested parts or insert newly added parts
    approved_parts.forEach((ap: any) => {
      const approvedQty = Number(ap.approved_quantity ?? ap.quantity ?? 1);
      const unitPrice = Number(ap.unit_price ?? 0);
      const partTotal = approvedQty * unitPrice;
      totalPartsEstimate += partTotal;

      if (ap.id) {
        const existingPart = memoryStore.repairParts.find(p => p.id === ap.id && p.job_id === jobId);
        if (existingPart) {
          existingPart.approved_quantity = approvedQty;
          existingPart.unit_price = unitPrice;
          existingPart.total_price = partTotal;
          existingPart.status = approvedQty > 0 ? 'Approved' : 'Rejected';
          if (ap.notes) existingPart.notes = ap.notes;
          return;
        }
      }

      // If it's a new part added by Hub Incharge directly
      memoryStore.repairParts.push({
        id: memoryStore.repairParts.length + 1,
        job_id: jobId,
        part_id: ap.part_id || 0,
        part_name: ap.part_name || 'Extra EV Spare Part',
        requested_quantity: 0,
        approved_quantity: approvedQty,
        replaced_quantity: 0,
        unit_price: unitPrice,
        total_price: partTotal,
        status: 'Approved',
        notes: ap.notes || 'Added by Hub Incharge'
      });
    });

    const grandEstimate = totalPartsEstimate + Number(labour_charge) + Number(other_charge);

    job.status = 'Repair Approved';
    job.updated_at = new Date().toISOString();

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'PARTS_APPROVED',
      title: 'Parts Approved',
      description: `Hub Incharge approved parts (Parts: ₹${totalPartsEstimate}, Labour: ₹${labour_charge}, Est. Total: ₹${grandEstimate}). Notes: ${notes || 'None'}`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: new Date().toISOString()
    });

    // Notify Technician
    if (job.technician_id) {
      memoryStore.repairNotifications.unshift({
        id: memoryStore.repairNotifications.length + 1,
        job_id: jobId,
        job_number: job.job_number,
        recipient_role: 'TECHNICIAN',
        recipient_id: job.technician_id,
        title: 'Parts Approved - Ready for Repair',
        message: `Parts approved for ${job.job_number}. You can now start the repair.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: {
        job,
        parts: memoryStore.repairParts.filter(p => p.job_id === jobId),
        estimated_total: grandEstimate
      },
      message: 'Parts approved successfully! Technician can now start the repair timer.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7. START REPAIR TIMER (SERVER-TIMED)
export const startRepair = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const { technician_notes = '' } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    if (job.status === 'Repairing') {
      return res.status(400).json({ success: false, message: 'Repair timer is already running for this job.' });
    }

    // 1. Strict Parts Approval Check: Cannot start repair if parts approval is pending
    if (job.status === 'Inspection Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start work: Parts approval from Hub Incharge is still pending. Work can only start after approval.'
      });
    }

    if (job.status === 'Pending Inspection' || job.status === 'Technician Assigned') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start work: Scooter inspection must be completed first.'
      });
    }

    // 2. Single Active Job Constraint: Technician cannot start a new job if they already have one in progress
    const techId = job.technician_id || req.user?.id;
    if (techId) {
      const activeJob = memoryStore.repairJobs.find(
        j => j.id !== jobId && j.status === 'Repairing' && j.technician_id === techId
      );
      if (activeJob) {
        return res.status(400).json({
          success: false,
          message: `Cannot start new work: You already have job ${activeJob.job_number} in progress. Please complete that work first.`
        });
      }
    }

    const startTime = new Date().toISOString();
    const performerName = req.user?.name || job.technician_name || 'Technician';

    let timing = memoryStore.repairTiming.find(t => t.job_id === jobId);
    if (timing) {
      timing.repair_started_at = startTime;
      timing.started_by_id = req.user?.id || job.technician_id;
      timing.started_by_name = performerName;
      if (technician_notes) timing.technician_notes = technician_notes;
    } else {
      timing = {
        id: memoryStore.repairTiming.length + 1,
        job_id: jobId,
        repair_started_at: startTime,
        repair_completed_at: null,
        started_by_id: req.user?.id || job.technician_id,
        started_by_name: performerName,
        completed_by_id: null,
        completed_by_name: null,
        total_duration_seconds: 0,
        total_duration_formatted: '',
        technician_notes: technician_notes,
        completion_photos: []
      };
      memoryStore.repairTiming.push(timing as any);
    }

    job.status = 'Repairing';
    job.updated_at = startTime;

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'REPAIR_STARTED',
      title: 'Repair Started',
      description: `Repair work timer started by ${performerName}.`,
      performed_by_id: req.user?.id || job.technician_id || 1,
      performed_by_name: performerName,
      performed_by_role: req.user?.roleDisplayName || 'Technician',
      metadata: null,
      created_at: startTime
    });

    return res.json({
      success: true,
      data: {
        job,
        timing
      },
      message: `Repair timer started for ${job.job_number}!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7b. ADD ADDITIONAL PART MID-REPAIR
export const addAdditionalPart = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const { part_name, part_id = 0, quantity = 1, unit_price = 0, notes = '' } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    if (!part_name || !part_name.trim()) {
      return res.status(400).json({ success: false, message: 'Part name is required.' });
    }

    const qty = Number(quantity) || 1;
    const price = Number(unit_price) || 0;
    const performerName = req.user?.name || job.technician_name || 'Technician';

    const newPart = {
      id: memoryStore.repairParts.length + 1,
      job_id: jobId,
      part_id: Number(part_id) || 0,
      part_name: part_name.trim(),
      requested_quantity: qty,
      approved_quantity: qty,
      replaced_quantity: qty,
      unit_price: price,
      total_price: qty * price,
      status: 'Approved',
      notes: notes.trim() || 'Added during repair by technician'
    };

    memoryStore.repairParts.push(newPart);

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'ADDITIONAL_PART_ADDED',
      title: 'Additional Part Added',
      description: `${performerName} added additional part: ${newPart.part_name} (Qty: ${qty}) during repair work.`,
      performed_by_id: req.user?.id || job.technician_id || 1,
      performed_by_name: performerName,
      performed_by_role: 'Technician',
      metadata: null,
      created_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      data: {
        part: newPart,
        parts: memoryStore.repairParts.filter(p => p.job_id === jobId)
      },
      message: `Part "${newPart.part_name}" added successfully to repair job!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. COMPLETE REPAIR (CONFIRM ACTUALLY REPLACED PARTS & FINAL NOTES)
export const completeRepair = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const {
      actually_replaced_parts = [],
      technician_notes = '',
      completion_photos = []
    } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    const completionTime = new Date().toISOString();
    const performerName = req.user?.name || job.technician_name || 'Technician';

    let timing = memoryStore.repairTiming.find(t => t.job_id === jobId);
    let durationSeconds = 3600; // default 1 hr fallback
    if (timing && timing.repair_started_at) {
      const startMs = new Date(timing.repair_started_at).getTime();
      const endMs = new Date(completionTime).getTime();
      durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));
    }

    const durationFormatted = formatDuration(durationSeconds);

    if (timing) {
      timing.repair_completed_at = completionTime;
      timing.completed_by_id = req.user?.id || job.technician_id;
      timing.completed_by_name = performerName;
      timing.total_duration_seconds = durationSeconds;
      timing.total_duration_formatted = durationFormatted;
      if (technician_notes) timing.technician_notes = technician_notes;
      if (completion_photos && completion_photos.length > 0) timing.completion_photos = completion_photos;
    } else {
      timing = {
        id: memoryStore.repairTiming.length + 1,
        job_id: jobId,
        repair_started_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        repair_completed_at: completionTime,
        started_by_id: req.user?.id || job.technician_id,
        started_by_name: performerName,
        completed_by_id: req.user?.id || job.technician_id,
        completed_by_name: performerName,
        total_duration_seconds: durationSeconds,
        total_duration_formatted: durationFormatted,
        technician_notes: technician_notes,
        completion_photos: completion_photos
      };
      memoryStore.repairTiming.push(timing);
    }

    // Save actually replaced parts (separate from requested/approved!)
    let replacedCount = 0;
    if (Array.isArray(actually_replaced_parts)) {
      actually_replaced_parts.forEach((rp: any) => {
        const replacedQty = Number(rp.replaced_quantity ?? (rp.status === 'Replaced' ? rp.approved_quantity || 1 : 0));
        const status = rp.status || (replacedQty > 0 ? 'Replaced' : 'Not Replaced');

        if (rp.id) {
          const existingPart = memoryStore.repairParts.find(p => p.id === rp.id && p.job_id === jobId);
          if (existingPart) {
            existingPart.replaced_quantity = replacedQty;
            existingPart.status = status;
            if (rp.notes) existingPart.notes = rp.notes;
            if (replacedQty > 0) replacedCount++;
            return;
          }
        }

        // Additional emergency part replaced on the spot
        if (replacedQty > 0) {
          replacedCount++;
          memoryStore.repairParts.push({
            id: memoryStore.repairParts.length + 1,
            job_id: jobId,
            part_id: rp.part_id || 0,
            part_name: rp.part_name || 'Emergency Replaced Part',
            requested_quantity: 0,
            approved_quantity: 0,
            replaced_quantity: replacedQty,
            unit_price: Number(rp.unit_price || 0),
            total_price: replacedQty * Number(rp.unit_price || 0),
            status: 'Replaced',
            notes: rp.notes || 'Emergency additional part replaced during repair'
          });
        }
      });
    }

    job.status = 'Repair Completed';
    job.updated_at = completionTime;

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'REPAIR_COMPLETED',
      title: 'Repair Completed',
      description: `Repair completed by ${performerName} in ${durationFormatted}. Actually replaced ${replacedCount} parts. Remarks: "${technician_notes || 'All checks passed.'}"`,
      performed_by_id: req.user?.id || job.technician_id || 1,
      performed_by_name: performerName,
      performed_by_role: 'Technician',
      metadata: null,
      created_at: completionTime
    });

    // Notify Hub Incharge
    memoryStore.repairNotifications.unshift({
      id: memoryStore.repairNotifications.length + 1,
      job_id: jobId,
      job_number: job.job_number,
      recipient_role: 'HUB_INCHARGE',
      recipient_id: null,
      title: 'Repair Completed - Ready for Billing',
      message: `${job.job_number} repair has been completed and is ready for billing.`,
      is_read: false,
      created_at: completionTime
    });

    return res.json({
      success: true,
      data: {
        job,
        timing,
        parts: memoryStore.repairParts.filter(p => p.job_id === jobId)
      },
      message: `Repair completed successfully in ${durationFormatted}! Job is now ready for billing.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 9. GENERATE FINAL BILL (HUB INCHARGE / ADMIN)
export const generateFinalBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const {
      parts = [],
      labour_charge = 0,
      other_charge = 0,
      discount = 0,
      notes = ''
    } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    // Compute parts total based on actual replaced parts
    let partsTotal = 0;
    if (Array.isArray(parts) && parts.length > 0) {
      parts.forEach((p: any) => {
        const qty = Number(p.replaced_quantity || p.quantity || 1);
        const unit = Number(p.unit_price || 0);
        partsTotal += qty * unit;
      });
    } else {
      // Auto compute from memoryStore.repairParts where replaced_quantity > 0
      const replacedParts = memoryStore.repairParts.filter(p => p.job_id === jobId && (p.replaced_quantity > 0 || p.status === 'Replaced'));
      partsTotal = replacedParts.reduce((sum, p) => sum + (p.replaced_quantity || 1) * p.unit_price, 0);
    }

    const labour = Number(labour_charge) || 0;
    const other = Number(other_charge) || 0;
    const disc = Number(discount) || 0;
    const grandTotal = Math.max(0, (partsTotal + labour + other) - disc);

    const billNumber = `INV-${job.job_number}`;

    let bill = memoryStore.repairBills.find(b => b.job_id === jobId);
    if (bill) {
      bill.parts_total = partsTotal;
      bill.labour_charge = labour;
      bill.other_charge = other;
      bill.discount = disc;
      bill.grand_total = grandTotal;
      bill.notes = notes;
      bill.updated_at = new Date().toISOString();
    } else {
      bill = {
        id: memoryStore.repairBills.length + 1,
        job_id: jobId,
        bill_number: billNumber,
        parts_total: partsTotal,
        labour_charge: labour,
        other_charge: other,
        discount: disc,
        tax_amount: 0.00,
        grand_total: grandTotal,
        notes: notes,
        created_by_id: req.user?.id || 1,
        created_by_name: req.user?.name || 'Hub Incharge',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memoryStore.repairBills.push(bill);
    }

    job.status = 'Payment Pending';
    job.updated_at = new Date().toISOString();

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'BILL_GENERATED',
      title: 'Bill Generated',
      description: `Invoice ${billNumber} generated: Grand Total ₹${grandTotal} (Parts: ₹${partsTotal}, Labour: ₹${labour}, Other: ₹${other}, Discount: ₹${disc}).`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      data: {
        job,
        bill
      },
      message: `Final bill of ₹${grandTotal} generated successfully!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 10. RECORD PAYMENT (CASH / UPI)
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const {
      payment_method = 'UPI',
      payment_status = 'Paid',
      transaction_id = '',
      cash_received_by = '',
      amount,
      notes = ''
    } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    const bill = memoryStore.repairBills.find(b => b.job_id === jobId);
    const finalAmount = amount !== undefined ? Number(amount) : (bill?.grand_total || 0);

    let payment = memoryStore.repairPayments.find(p => p.job_id === jobId);
    const paidAt = payment_status === 'Paid' ? new Date().toISOString() : null;

    if (payment) {
      payment.payment_method = payment_method;
      payment.payment_status = payment_status;
      payment.transaction_id = transaction_id || payment.transaction_id;
      payment.cash_received_by = cash_received_by || payment.cash_received_by;
      payment.amount = finalAmount;
      payment.paid_at = paidAt;
      payment.notes = notes;
    } else {
      payment = {
        id: memoryStore.repairPayments.length + 1,
        job_id: jobId,
        payment_method,
        payment_status,
        transaction_id: transaction_id || (payment_method === 'UPI' ? `UPI/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(100000 + Math.random() * 900000)}` : null),
        amount: finalAmount,
        cash_received_by: payment_method === 'Cash' ? (cash_received_by || req.user?.name || 'Cashier') : null,
        paid_at: paidAt,
        receipt_url: '',
        notes,
        created_at: new Date().toISOString()
      };
      memoryStore.repairPayments.push(payment);
    }

    if (payment_status === 'Paid') {
      job.status = 'Payment Received';
    } else {
      job.status = 'Payment Pending';
    }
    job.updated_at = new Date().toISOString();

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'PAYMENT_RECEIVED',
      title: payment_status === 'Paid' ? 'Payment Received' : 'Payment Status Updated',
      description: payment_status === 'Paid'
        ? `Payment of ₹${finalAmount} received via ${payment_method} (${payment_method === 'UPI' ? 'Txn: ' + (payment.transaction_id || 'N/A') : 'Received by: ' + (payment.cash_received_by || 'Cashier')}).`
        : `Payment status marked as ${payment_status}.`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: new Date().toISOString()
    });

    // Notify Hub Incharge & Tech
    memoryStore.repairNotifications.unshift({
      id: memoryStore.repairNotifications.length + 1,
      job_id: jobId,
      job_number: job.job_number,
      recipient_role: 'HUB_INCHARGE',
      recipient_id: null,
      title: 'Payment Received',
      message: `Payment of ₹${finalAmount} received for ${job.job_number}. Ready to close.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      data: {
        job,
        payment
      },
      message: `Payment of ₹${finalAmount} recorded successfully!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 11. CLOSE JOB
export const closeRepairJob = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);
    const { override_payment = false, remarks = '' } = req.body;

    const job = memoryStore.repairJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair job not found.' });
    }

    const payment = memoryStore.repairPayments.find(p => p.job_id === jobId);
    if (!override_payment && (!payment || payment.payment_status !== 'Paid')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot close job until payment is marked as Paid. Please record payment first or use admin override.'
      });
    }

    const closedAt = new Date().toISOString();
    job.status = 'Closed';
    job.closed_at = closedAt as any;
    job.updated_at = closedAt;

    // Decrement technician active workload count
    if (job.technician_id) {
      const tech = memoryStore.technicians.find(t => t.id === job.technician_id);
      if (tech && tech.active_jobs_count > 0) {
        tech.active_jobs_count -= 1;
        if (tech.active_jobs_count < 3) tech.status = 'Available';
      }
    }

    // Log Activity Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: jobId,
      event_type: 'JOB_CLOSED',
      title: 'Job Closed',
      description: `Job ${job.job_number} successfully closed. Vehicle handed over to rider ${job.rider_name}. ${remarks ? 'Remarks: ' + remarks : ''}`,
      performed_by_id: req.user?.id || 1,
      performed_by_name: req.user?.name || 'Hub Incharge',
      performed_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      metadata: null,
      created_at: closedAt
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CLOSE',
      module: 'REPAIR_JOBS',
      recordId: jobId,
      notes: `Closed Repair Job ${job.job_number}`
    });

    return res.json({
      success: true,
      data: job,
      message: `Job ${job.job_number} closed successfully! Scooter is ready for handover.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 12. METADATA: HUBS, TECHNICIANS & INVENTORY
export const getRepairMeta = async (req: AuthRequest, res: Response) => {
  try {
    return res.json({
      success: true,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians,
      inventory: memoryStore.inventory
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 13. NOTIFICATIONS LIST & MARK AS READ
export const getRepairNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = memoryStore.repairNotifications.filter(n => !n.is_read).length;
    return res.json({
      success: true,
      data: memoryStore.repairNotifications,
      unreadCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notif = memoryStore.repairNotifications.find(n => n.id === Number(id));
    if (notif) {
      notif.is_read = true;
    }
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 14. CLEAR ALL REPAIR JOBS (RESET DATA)
export const clearAllRepairJobs = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      try {
        await pool.query('DELETE FROM repair_parts');
        await pool.query('DELETE FROM repair_inspections');
        await pool.query('DELETE FROM repair_timing');
        await pool.query('DELETE FROM repair_bills');
        await pool.query('DELETE FROM repair_payments');
        await pool.query('DELETE FROM repair_events');
        await pool.query('DELETE FROM repair_notifications');
        await pool.query('DELETE FROM repair_jobs');
        await pool.query('UPDATE technicians SET active_jobs_count = 0, status = "Available"');
      } catch (dbErr) {
        console.warn('DB clear error:', dbErr);
      }
    }

    memoryStore.repairJobs = [];
    memoryStore.repairInspections = [];
    memoryStore.repairParts = [];
    memoryStore.repairTiming = [];
    memoryStore.repairBills = [];
    memoryStore.repairPayments = [];
    memoryStore.repairEvents = [];
    memoryStore.repairNotifications = [];
    memoryStore.technicians.forEach(t => {
      t.active_jobs_count = 0;
      t.status = 'Available';
    });

    return res.json({
      success: true,
      message: 'All repair jobs data cleared successfully! System is fresh and ready for new jobs.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 15. GET JOB REVIEW INFO (PUBLIC & ADMIN)
export const getJobReviewInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobId = Number(id);

    let job = isNaN(jobId)
      ? memoryStore.repairJobs.find(j => j.job_number.toLowerCase() === id.toLowerCase())
      : memoryStore.repairJobs.find(j => j.id === jobId);

    if (!job && getDbStatus()) {
      const q = isNaN(jobId)
        ? await pool.query('SELECT * FROM repair_jobs WHERE LOWER(job_number) = LOWER($1)', [id])
        : await pool.query('SELECT * FROM repair_jobs WHERE id = $1', [jobId]);
      if (q.rows.length > 0) {
        job = q.rows[0];
      }
    }

    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair Job not found.' });
    }

    const tech = memoryStore.technicians.find(t => t.id === job.technician_id) || null;

    return res.json({
      success: true,
      data: {
        id: job.id,
        job_number: job.job_number,
        scooter_number: job.scooter_number,
        rider_name: job.rider_name,
        rider_contact: job.rider_contact,
        hub_name: job.hub_name,
        technician_id: job.technician_id,
        technician_name: job.technician_name || tech?.name || 'Assigned Technician',
        technician_code: tech?.technician_code || 'TECH',
        technician_specialization: tech?.specialization || 'EV Diagnostics & Repair',
        status: job.status,
        customer_rating: (job as any).customer_rating || null,
        customer_review: (job as any).customer_review || null,
        customer_tags: (job as any).customer_tags || [],
        reviewed_at: (job as any).reviewed_at || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 16. SUBMIT CUSTOMER REVIEW & RATING
export const submitJobReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, tags, comment, reviewer_name } = req.body;
    const jobId = Number(id);

    let job = isNaN(jobId)
      ? memoryStore.repairJobs.find(j => j.job_number.toLowerCase() === id.toLowerCase())
      : memoryStore.repairJobs.find(j => j.id === jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Repair Job not found.' });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
    }

    const tagsList = Array.isArray(tags) ? tags : [];
    const reviewComment = (comment || '').trim();
    const nowIso = new Date().toISOString();

    (job as any).customer_rating = numRating;
    (job as any).customer_review = reviewComment;
    (job as any).customer_tags = tagsList;
    (job as any).reviewed_at = nowIso;
    job.updated_at = nowIso;

    // Update Technician Rating
    if (job.technician_id) {
      const tech = memoryStore.technicians.find(t => t.id === job.technician_id);
      if (tech) {
        const ratedJobs = memoryStore.repairJobs.filter(
          j => j.technician_id === tech.id && (j as any).customer_rating
        );
        if (ratedJobs.length > 0) {
          const sum = ratedJobs.reduce((acc, curr: any) => acc + Number(curr.customer_rating), 0);
          tech.rating = Number((sum / ratedJobs.length).toFixed(1));
        }
      }
    }

    // Add Timeline Audit Event
    memoryStore.repairEvents.push({
      id: memoryStore.repairEvents.length + 1,
      job_id: job.id,
      event_type: 'CUSTOMER_RATING_SUBMITTED',
      title: 'Customer Rating & Review Received',
      description: `Customer ${reviewer_name || job.rider_name} submitted ${numRating} ⭐ rating: "${reviewComment || 'Great service'}" (Tags: ${tagsList.join(', ') || 'None'})`,
      performed_by_id: 0,
      performed_by_name: reviewer_name || job.rider_name || 'Customer',
      performed_by_role: 'Customer',
      metadata: { rating: numRating, tags: tagsList, comment: reviewComment },
      created_at: nowIso
    });

    return res.json({
      success: true,
      message: 'Thank you! Your review and rating have been recorded successfully.',
      data: {
        job_number: job.job_number,
        rating: numRating,
        tags: tagsList,
        comment: reviewComment,
        reviewed_at: nowIso
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


