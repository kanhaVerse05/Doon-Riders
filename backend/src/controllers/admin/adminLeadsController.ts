import { Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { buildLeadScopeCondition } from '../../helpers/scopeFilter';
import { logAuditEvent } from '../../helpers/auditLogger';

// GET ALL LEADS (ROLE & DATA-SCOPE AWARE)
export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { status, source, assignee, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!getDbStatus()) {
      let items = (memoryStore.leads || []) as any[];
      if (status && status !== 'All') {
        items = items.filter(l => l.status === status);
      }
      return res.json({
        success: true,
        data: items,
        total: items.length,
        page: Number(page),
        limit: Number(limit),
        source: 'memory'
      });
    }

    const conditions: string[] = ['l.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    // 1. Data-Scope Enforcement (ALL, ASSIGNED, OWN)
    const scopeCondition = buildLeadScopeCondition(req, paramIndex);
    if (scopeCondition.whereClause !== '1=1') {
      conditions.push(scopeCondition.whereClause);
      params.push(...scopeCondition.params);
      paramIndex += scopeCondition.params.length;
    }

    // 2. Filters
    if (status && status !== 'All') {
      conditions.push(`l.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (source && source !== 'All') {
      conditions.push(`l.lead_source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    if (assignee && assignee !== 'All') {
      conditions.push(`l.assigned_to = $${paramIndex}`);
      params.push(Number(assignee));
      paramIndex++;
    }

    if (search) {
      conditions.push(`(l.name ILIKE $${paramIndex} OR l.phone ILIKE $${paramIndex} OR l.lead_code ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereString = conditions.join(' AND ');

    // Query Leads with Assigned User Name
    const query = `
      SELECT l.*, 
             u.name as assigned_to_name, u.avatar_url as assigned_to_avatar,
             creator.name as created_by_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN users creator ON l.created_by = creator.id
      WHERE ${whereString}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM leads l WHERE ${whereString}
    `;

    const [leadsRes, countRes] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, params.length - 2))
    ]);

    return res.json({
      success: true,
      data: leadsRes.rows,
      total: Number(countRes.rows[0].total),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET SINGLE LEAD WITH IDOR PROTECTION
export const getLeadById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);

    const query = `
      SELECT l.*, 
             u.name as assigned_to_name, u.email as assigned_to_email, u.phone as assigned_to_phone,
             creator.name as created_by_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN users creator ON l.created_by = creator.id
      WHERE ${isNumeric ? 'l.id = $1' : 'l.lead_code = $1'} AND l.deleted_at IS NULL
    `;

    const result = await pool.query(query, [isNumeric ? Number(id) : id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const lead = result.rows[0];

    // IDOR Check for Sales Executive
    if (req.permissionScope === 'ASSIGNED' && lead.assigned_to !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this lead record.'
      });
    }

    // Fetch Timeline
    const timelineRes = await pool.query(`
      SELECT lt.*, u.name as performed_by_name, u.avatar_url as performed_by_avatar
      FROM lead_timeline lt
      LEFT JOIN users u ON lt.performed_by = u.id
      WHERE lt.lead_id = $1
      ORDER BY lt.created_at DESC
    `, [lead.id]);

    return res.json({
      success: true,
      data: {
        ...lead,
        timeline: timelineRes.rows
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE LEAD
export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      phone,
      email,
      location,
      vehicleInterestedIn,
      rentalDurationDays,
      rentalPlan,
      expectedStartDate,
      leadSource,
      campaign,
      adSet,
      ad,
      utmSource,
      utmMedium,
      utmCampaign,
      assignedTo,
      notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Lead name and phone number are required.' });
    }

    // Generate Lead Code (e.g. LD-1048)
    const countRes = await pool.query('SELECT COUNT(*) FROM leads');
    const leadCode = `LD-${1000 + Number(countRes.rows[0].count) + 1}`;

    const query = `
      INSERT INTO leads (
        lead_code, name, phone, email, location, vehicle_interested_in,
        rental_duration_days, rental_plan, expected_start_date, lead_source,
        campaign, ad_set, ad, utm_source, utm_medium, utm_campaign,
        assigned_to, created_by, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'New')
    `;

    const values = [
      leadCode, name, phone, email || null, location || 'Dehradun', vehicleInterestedIn || 'DOON Electro Pro',
      rentalDurationDays || 7, rentalPlan || 'Weekly', expectedStartDate || null, leadSource || 'Manual',
      campaign || null, adSet || null, ad || null, utmSource || null, utmMedium || null, utmCampaign || null,
      assignedTo || null, req.user?.id || null, notes || null
    ];

    const result = await pool.query(query, values);
    const newLead = {
      id: result.insertId,
      lead_code: leadCode,
      name,
      phone,
      email: email || null,
      location: location || 'Dehradun',
      vehicle_interested_in: vehicleInterestedIn || 'DOON Electro Pro',
      rental_duration_days: rentalDurationDays || 7,
      rental_plan: rentalPlan || 'Weekly',
      expected_start_date: expectedStartDate || null,
      lead_source: leadSource || 'Manual',
      campaign: campaign || null,
      ad_set: adSet || null,
      ad: ad || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      assigned_to: assignedTo || null,
      created_by: req.user?.id || null,
      notes: notes || null,
      status: 'New',
      created_at: new Date().toISOString()
    };

    // Create Timeline Entry
    await pool.query(`
      INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
      VALUES ($1, $2, 'CREATED', $3)
    `, [newLead.id, req.user?.id, `Lead created manually via source: ${leadSource || 'Manual'}`]);

    // If assigned at creation
    if (assignedTo) {
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
        VALUES ($1, $2, 'ASSIGNED', 'Assigned upon lead creation')
      `, [newLead.id, req.user?.id]);
    }

    // Audit Log
    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE',
      module: 'LEADS',
      recordId: newLead.lead_code,
      newValues: newLead,
      notes: `Created lead ${newLead.lead_code} for ${newLead.name}`
    });

    return res.status(201).json({
      success: true,
      message: `Lead ${newLead.lead_code} created successfully`,
      data: newLead
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE STATUS & NOTES
export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, nextFollowupDate } = req.body;

    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (leadRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const lead = leadRes.rows[0];

    // IDOR Check
    if (req.permissionScope === 'ASSIGNED' && lead.assigned_to !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify this lead.' });
    }

    const oldStatus = lead.status;

    await pool.query(`
      UPDATE leads
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          next_followup_date = COALESCE($3, next_followup_date),
          last_contacted_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
    `, [status, notes, nextFollowupDate, id]);

    // Add Timeline
    if (status && status !== oldStatus) {
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, field_name, old_value, new_value, notes)
        VALUES ($1, $2, 'STATUS_CHANGED', 'status', $3, $4, $5)
      `, [id, req.user?.id, oldStatus, status, notes || 'Status updated']);
    } else if (notes) {
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
        VALUES ($1, $2, 'NOTE_ADDED', $3)
      `, [id, req.user?.id, notes]);
    }

    return res.json({
      success: true,
      message: 'Lead updated successfully.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// BULK LEAD ASSIGNMENT (FOR ADMIN / MANAGER)
export const bulkAssignLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds, assignToUserId } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !assignToUserId) {
      return res.status(400).json({ success: false, message: 'leadIds array and assignToUserId are required.' });
    }

    // Verify Assignee
    const userRes = await pool.query('SELECT id, name FROM users WHERE id = $1 AND status = $2', [assignToUserId, 'active']);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sales executive not found or inactive.' });
    }
    const assignee = userRes.rows[0];

    // Update Leads
    const placeholders = leadIds.map(() => '?').join(',');
    await pool.query(`
      UPDATE leads 
      SET assigned_to = ?, updated_at = NOW()
      WHERE id IN (${placeholders})
    `, [assignToUserId, ...leadIds]);

    // Insert Timelines
    for (const leadId of leadIds) {
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
        VALUES ($1, $2, 'ASSIGNED', $3)
      `, [leadId, req.user?.id, `Assigned to ${assignee.name}`]);
    }

    // Audit Log
    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'ASSIGN',
      module: 'LEADS',
      notes: `Bulk assigned ${leadIds.length} leads to ${assignee.name}`
    });

    return res.json({
      success: true,
      message: `Successfully assigned ${leadIds.length} lead(s) to ${assignee.name}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// BULK IMPORT LEADS FROM EXCEL/CSV (EXACT 6 FIELDS: Lead Number, Name, Location, Lead Source, Rental Plan, Notes)
export const bulkImportLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'Leads array is required and cannot be empty.' });
    }

    const insertedLeads: any[] = [];
    const errors: any[] = [];

    // Get current max lead code number
    const maxCodeRes = await pool.query(`
      SELECT lead_code FROM leads WHERE lead_code LIKE 'LD-%' ORDER BY id DESC LIMIT 1
    `);
    let nextCodeNum = 1050;
    if (maxCodeRes.rows.length > 0) {
      const match = maxCodeRes.rows[0].lead_code.match(/LD-(\d+)/);
      if (match) nextCodeNum = parseInt(match[1], 10) + 1;
    }

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      const phone = item.phone || item.leadNumber || item['Lead Number'] || item['Phone Number'] || item['Mobile'] || item['Phone'];
      const name = item.name || item['Name'] || item['Full Name'];
      const location = item.location || item['Location'] || item['City'] || 'Dehradun';
      const source = item.leadSource || item['Lead Source'] || item['Source'] || 'Excel/CSV Import';
      const plan = item.rentalPlan || item['Rental Plan'] || item['Plan'] || 'Weekly';
      const notes = item.notes || item['Notes'] || '';

      if (!name || !phone) {
        errors.push({ row: i + 1, message: 'Name and Lead Number (Phone) are mandatory.' });
        continue;
      }

      const leadCode = `LD-${nextCodeNum++}`;

      const insertRes = await pool.query(`
        INSERT INTO leads (
          lead_code, name, phone, location, vehicle_interested_in,
          rental_plan, lead_source, status, notes, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'DOON Electro Pro', $5, $6, 'New', $7, $8, NOW(), NOW())
      `, [leadCode, name, phone, location, plan, source, notes, req.user?.id]);

      const newLead = {
        id: insertRes.insertId,
        lead_code: leadCode,
        name,
        phone,
        location,
        vehicle_interested_in: 'DOON Electro Pro',
        rental_plan: plan,
        lead_source: source,
        status: 'New',
        notes,
        created_by: req.user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      insertedLeads.push(newLead);

      // Add timeline
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
        VALUES ($1, $2, 'CREATED', $3)
      `, [newLead.id, req.user?.id, 'Imported via Excel/CSV batch']);
    }

    // Audit Log
    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'BULK_IMPORT',
      module: 'LEADS',
      notes: `Bulk imported ${insertedLeads.length} leads. Encountered ${errors.length} errors.`
    });

    return res.json({
      success: true,
      message: `Successfully imported ${insertedLeads.length} lead(s).`,
      importedCount: insertedLeads.length,
      errorCount: errors.length,
      errors,
      data: insertedLeads
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
