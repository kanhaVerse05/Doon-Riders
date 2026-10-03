import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

// Helper: Format duration in minutes / seconds
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

// Helper: Calculate Settlement
export function computeSettlement(securityDeposit: number, damageItems: any[] = []) {
  let grossTotal = 0;
  let payableTotal = 0;
  let waivedTotal = 0;

  (damageItems || []).forEach((item: any) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const itemTotal = Number(item.total_price) !== undefined ? Number(item.total_price) : qty * price;
    
    grossTotal += itemTotal;

    const isNoPayment = item.hub_remark_type === 'No Payment' || item.is_payable === false;
    if (isNoPayment) {
      waivedTotal += itemTotal;
    } else {
      payableTotal += itemTotal;
    }
  });

  const sec = Number(securityDeposit) >= 0 ? Number(securityDeposit) : 2000;
  let settlementType = 'FULL_REFUND';
  let refundAmount = 0;
  let dueAmount = 0;

  if (payableTotal === 0) {
    settlementType = 'FULL_REFUND';
    refundAmount = sec;
    dueAmount = 0;
  } else if (payableTotal < sec) {
    settlementType = 'PARTIAL_REFUND';
    refundAmount = Math.round((sec - payableTotal) * 100) / 100;
    dueAmount = 0;
  } else if (payableTotal === sec) {
    settlementType = 'ZERO_BALANCE';
    refundAmount = 0;
    dueAmount = 0;
  } else {
    settlementType = 'DUE_FROM_RIDER';
    refundAmount = 0;
    dueAmount = Math.round((payableTotal - sec) * 100) / 100;
  }

  return {
    grossDamageTotal: Math.round(grossTotal * 100) / 100,
    payableDamageTotal: Math.round(payableTotal * 100) / 100,
    waivedDamageTotal: Math.round(waivedTotal * 100) / 100,
    settlementType,
    refundAmountToRider: refundAmount,
    dueAmountFromRider: dueAmount
  };
}

// 1. GET ALL RETURNS (LIST WITH STATS & FILTERS)
export const getAllReturns = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      hub_id,
      technician_id,
      search,
      date_filter,
      sort_by = 'newest',
      limit = 100,
      offset = 0
    } = req.query;

    const searchTerm = String(search || '').toLowerCase().trim();
    const userRole = (req.user?.roleName || '').toUpperCase();
    const userId = req.user?.id;

    if (getDbStatus()) {
      try {
        let whereClauses: string[] = ['1=1'];
        let params: any[] = [];
        let pIndex = 1;

        // Role-based scoping: Hub Incharge only sees their Hub's returns
        if (userRole.includes('HUB') && (req.user as any)?.hub_id) {
          whereClauses.push(`r.hub_id = $${pIndex}`);
          params.push((req.user as any).hub_id);
          pIndex++;
        } else if (userRole.includes('TECH')) {
          whereClauses.push(`r.technician_id = $${pIndex}`);
          params.push(userId);
          pIndex++;
        }

        if (searchTerm) {
          whereClauses.push(`(
            LOWER(r.return_number) LIKE $${pIndex} OR
            LOWER(r.scooter_number) LIKE $${pIndex} OR
            LOWER(r.rider_name) LIKE $${pIndex} OR
            LOWER(r.rider_phone) LIKE $${pIndex} OR
            LOWER(r.hub_name) LIKE $${pIndex}
          )`);
          params.push(`%${searchTerm}%`);
          pIndex++;
        }

        if (status && status !== 'all') {
          whereClauses.push(`r.status = $${pIndex}`);
          params.push(status);
          pIndex++;
        }

        if (hub_id && hub_id !== 'all') {
          whereClauses.push(`r.hub_id = $${pIndex}`);
          params.push(Number(hub_id));
          pIndex++;
        }

        if (technician_id && technician_id !== 'all') {
          whereClauses.push(`r.technician_id = $${pIndex}`);
          params.push(Number(technician_id));
          pIndex++;
        }

        if (date_filter === 'today') {
          whereClauses.push(`r.return_date = CURRENT_DATE`);
        } else if (date_filter === 'week') {
          whereClauses.push(`r.return_date >= CURRENT_DATE - INTERVAL '7 days'`);
        }

        let orderSql = 'r.id DESC';
        if (sort_by === 'oldest') orderSql = 'r.id ASC';

        const sql = `
          SELECT 
            r.*,
            tech.specialization as technician_specialization,
            tech.rating as technician_rating
          FROM scooty_returns r
          LEFT JOIN technicians tech ON r.technician_id = tech.id
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY ${orderSql}
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;

        const result = await pool.query(sql, params);

        const statsRes = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'Pending Inspection' THEN 1 END) as pending_inspection,
            COUNT(CASE WHEN status = 'Inspection in Progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'Inspection Completed' THEN 1 END) as inspection_completed,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
            COALESCE(SUM(CASE WHEN status = 'Completed' THEN refund_amount_to_rider ELSE 0 END), 0) as total_refunded,
            COALESCE(SUM(CASE WHEN status = 'Completed' THEN due_amount_from_rider ELSE 0 END), 0) as total_due_collected
          FROM scooty_returns
        `);

        const st = statsRes.rows[0] || {};
        const stats = {
          total: Number(st.total || 0),
          pendingInspection: Number(st.pending_inspection || 0),
          inProgress: Number(st.in_progress || 0),
          inspectionCompleted: Number(st.inspection_completed || 0),
          completed: Number(st.completed || 0),
          totalRefunded: Number(st.total_refunded || 0),
          totalDueCollected: Number(st.total_due_collected || 0)
        };

        return res.json({
          success: true,
          data: result.rows,
          stats,
          hubs: memoryStore.repairHubs,
          technicians: memoryStore.technicians,
          inventoryParts: memoryStore.inventory
        });
      } catch (dbErr) {
        console.warn('[getAllReturns] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    // MemoryStore Fallback
    let list = [...(memoryStore.scootyReturns || [])];

    if (userRole.includes('HUB') && (req.user as any)?.hub_id) {
      list = list.filter(r => r.hub_id === (req.user as any)?.hub_id);
    } else if (userRole.includes('TECH')) {
      const techRecord = memoryStore.technicians.find(t => t.name.toLowerCase() === req.user?.name.toLowerCase() || t.id === userId);
      const techId = techRecord ? techRecord.id : userId;
      list = list.filter(r => r.technician_id === techId);
    }

    if (searchTerm) {
      list = list.filter(r =>
        r.return_number.toLowerCase().includes(searchTerm) ||
        r.scooter_number.toLowerCase().includes(searchTerm) ||
        r.rider_name.toLowerCase().includes(searchTerm) ||
        r.rider_phone.toLowerCase().includes(searchTerm) ||
        r.hub_name.toLowerCase().includes(searchTerm)
      );
    }

    if (status && status !== 'all') {
      list = list.filter(r => r.status === status);
    }
    if (hub_id && hub_id !== 'all') {
      list = list.filter(r => r.hub_id === Number(hub_id));
    }
    if (technician_id && technician_id !== 'all') {
      list = list.filter(r => r.technician_id === Number(technician_id));
    }

    const stats = {
      total: list.length,
      pendingInspection: list.filter(r => r.status === 'Pending Inspection').length,
      inProgress: list.filter(r => r.status === 'Inspection in Progress').length,
      inspectionCompleted: list.filter(r => r.status === 'Inspection Completed').length,
      completed: list.filter(r => r.status === 'Completed').length,
      totalRefunded: list.filter(r => r.status === 'Completed').reduce((sum, r) => sum + (Number(r.refund_amount_to_rider) || 0), 0),
      totalDueCollected: list.filter(r => r.status === 'Completed').reduce((sum, r) => sum + (Number(r.due_amount_from_rider) || 0), 0)
    };

    return res.json({
      success: true,
      data: list,
      stats,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians,
      inventoryParts: memoryStore.inventory
    });
  } catch (error: any) {
    console.error('Error fetching scooty returns:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching returns' });
  }
};

// 2. GET RETURN BY ID (WITH TIMELINE EVENTS & DETAILS)
export const getReturnById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const returnId = Number(id);

    if (getDbStatus()) {
      try {
        const rRes = await pool.query(
          `SELECT r.*, tech.phone as technician_phone, tech.technician_code, tech.specialization as technician_specialization, tech.rating as technician_rating
           FROM scooty_returns r
           LEFT JOIN technicians tech ON r.technician_id = tech.id
           WHERE r.id = $1 OR r.return_number = $2`,
          [returnId || 0, id]
        );

        if (rRes.rows.length > 0) {
          const scootyReturn = rRes.rows[0];
          const eventsRes = await pool.query(
            `SELECT * FROM scooty_return_events WHERE return_id = $1 ORDER BY created_at ASC`,
            [scootyReturn.id]
          );

          return res.json({
            success: true,
            data: scootyReturn,
            timeline: eventsRes.rows,
            hubs: memoryStore.repairHubs,
            technicians: memoryStore.technicians,
            inventoryParts: memoryStore.inventory
          });
        }
      } catch (dbErr) {
        console.warn('[getReturnById] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    const scootyReturn = (memoryStore.scootyReturns || []).find(
      r => r.id === returnId || r.return_number.toLowerCase() === id.toLowerCase()
    );

    if (!scootyReturn) {
      return res.status(404).json({ success: false, message: 'Scooty Return record not found' });
    }

    const timeline = (memoryStore.scootyReturnEvents || [])
      .filter(e => e.return_id === scootyReturn.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return res.json({
      success: true,
      data: scootyReturn,
      timeline,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians,
      inventoryParts: memoryStore.inventory
    });
  } catch (error: any) {
    console.error('Error fetching return details:', error);
    return res.status(500).json({ success: false, message: 'Failed to load return details' });
  }
};

// 3. CREATE SCOOTY RETURN (HUB INCHARGE OR ADMIN)
export const createReturn = async (req: AuthRequest, res: Response) => {
  try {
    const {
      rider_name,
      rider_phone,
      scooter_number,
      scooter_id,
      hub_id,
      return_date,
      return_time,
      initial_meter_reading,
      security_deposit_amount = 2000,
      technician_id,
      initial_remarks
    } = req.body;

    if (!rider_name || !rider_phone || !scooter_number) {
      return res.status(400).json({
        success: false,
        message: 'Rider Name, Contact Phone, and Scooter Number are required.'
      });
    }

    const targetHub = (memoryStore.repairHubs || []).find(h => h.id === Number(hub_id)) || memoryStore.repairHubs[0];
    const assignedTech = technician_id ? (memoryStore.technicians || []).find(t => t.id === Number(technician_id)) : null;

    const returnNumber = `DR-RET-${1000 + (memoryStore.scootyReturns?.length || 0) + 1}`;
    const now = new Date().toISOString();
    const secDeposit = Number(security_deposit_amount) >= 0 ? Number(security_deposit_amount) : 2000.00;

    const initialStatus = assignedTech ? 'Pending Inspection' : 'Pending Inspection';

    const newReturn: any = {
      id: (memoryStore.scootyReturns?.length || 0) + 1,
      return_number: returnNumber,
      rider_name: rider_name.trim(),
      rider_phone: rider_phone.trim(),
      scooter_number: scooter_number.toUpperCase().trim(),
      scooter_id: scooter_id ? Number(scooter_id) : null,
      hub_id: targetHub.id,
      hub_name: targetHub.hub_name,
      hub_incharge_id: req.user?.id || 6,
      hub_incharge_name: req.user?.name || targetHub.incharge_name,
      return_date: return_date || new Date().toISOString().split('T')[0],
      return_time: return_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      initial_meter_reading: initial_meter_reading ? Number(initial_meter_reading) : null,
      security_deposit_amount: secDeposit,
      technician_id: assignedTech ? assignedTech.id : null,
      technician_name: assignedTech ? assignedTech.name : null,
      technician_phone: assignedTech ? assignedTech.phone : null,
      technician_code: assignedTech ? assignedTech.technician_code : null,
      status: initialStatus,
      damage_items: [],
      gross_damage_total: 0.00,
      payable_damage_total: 0.00,
      waived_damage_total: 0.00,
      settlement_type: 'FULL_REFUND',
      refund_amount_to_rider: secDeposit,
      due_amount_from_rider: 0.00,
      rider_payment_status: 'Pending',
      rider_payment_mode: null,
      rider_payment_reference: null,
      settlement_notes: null,
      initial_remarks: initial_remarks?.trim() || null,
      inspection_started_at: null,
      inspection_completed_at: null,
      settled_at: null,
      created_by_id: req.user?.id || 6,
      created_by_name: req.user?.name || 'Hub Incharge',
      created_by_role: req.user?.roleDisplayName || 'Hub Incharge',
      created_at: now,
      updated_at: now
    };

    if (getDbStatus()) {
      try {
        const insertRes = await pool.query(
          `INSERT INTO scooty_returns (
            return_number, rider_name, rider_phone, scooter_number, scooter_id,
            hub_id, hub_name, hub_incharge_id, hub_incharge_name, return_date, return_time,
            initial_meter_reading, security_deposit_amount, technician_id, technician_name,
            technician_phone, technician_code, status, damage_items, gross_damage_total,
            payable_damage_total, waived_damage_total, settlement_type, refund_amount_to_rider,
            due_amount_from_rider, rider_payment_status, initial_remarks, created_by_id,
            created_by_name, created_by_role, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
          RETURNING id`,
          [
            newReturn.return_number,
            newReturn.rider_name,
            newReturn.rider_phone,
            newReturn.scooter_number,
            newReturn.scooter_id,
            newReturn.hub_id,
            newReturn.hub_name,
            newReturn.hub_incharge_id,
            newReturn.hub_incharge_name,
            newReturn.return_date,
            newReturn.return_time,
            newReturn.initial_meter_reading,
            newReturn.security_deposit_amount,
            newReturn.technician_id,
            newReturn.technician_name,
            newReturn.technician_phone,
            newReturn.technician_code,
            newReturn.status,
            JSON.stringify(newReturn.damage_items),
            newReturn.gross_damage_total,
            newReturn.payable_damage_total,
            newReturn.waived_damage_total,
            newReturn.settlement_type,
            newReturn.refund_amount_to_rider,
            newReturn.due_amount_from_rider,
            newReturn.rider_payment_status,
            newReturn.initial_remarks,
            newReturn.created_by_id,
            newReturn.created_by_name,
            newReturn.created_by_role,
            newReturn.created_at,
            newReturn.updated_at
          ]
        );

        if (insertRes.rows.length > 0) {
          newReturn.id = insertRes.rows[0].id;
        }

        await pool.query(
          `INSERT INTO scooty_return_events (
            return_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newReturn.id,
            'RETURN_INITIATED',
            'Scooty Return Initiated',
            `Scooty ${newReturn.scooter_number} returned by rider ${newReturn.rider_name}. Initial security deposit recorded: ₹${newReturn.security_deposit_amount}. Pending technician inspection.`,
            newReturn.status,
            newReturn.created_by_id,
            newReturn.created_by_name,
            newReturn.created_by_role,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[createReturn] DB insert error, falling back to memoryStore:', dbErr);
      }
    }

    // Update memoryStore
    memoryStore.scootyReturns.unshift(newReturn);
    memoryStore.scootyReturnEvents.push({
      id: (memoryStore.scootyReturnEvents?.length || 0) + 1,
      return_id: newReturn.id,
      event_type: 'RETURN_INITIATED',
      title: 'Scooty Return Initiated',
      description: `Scooty ${newReturn.scooter_number} returned by rider ${newReturn.rider_name}. Initial security deposit recorded: ₹${newReturn.security_deposit_amount}. Pending technician inspection.`,
      status: newReturn.status,
      performed_by_id: newReturn.created_by_id,
      performed_by_name: newReturn.created_by_name,
      performed_by_role: newReturn.created_by_role,
      metadata: null,
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE_SCOOTY_RETURN',
      module: 'Returns',
      recordId: newReturn.id,
      newValues: newReturn,
      notes: `Logged return ticket ${newReturn.return_number} for rider ${newReturn.rider_name} (${newReturn.scooter_number})`
    });

    return res.status(201).json({
      success: true,
      message: `Scooty return ticket ${newReturn.return_number} created successfully.`,
      data: newReturn
    });
  } catch (error: any) {
    console.error('Error creating return:', error);
    return res.status(500).json({ success: false, message: 'Server error creating scooty return' });
  }
};

// 4. ASSIGN TECHNICIAN FOR INSPECTION (HUB INCHARGE WORKFLOW)
export const assignTechnicianForReturn = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    const returnId = Number(id);

    if (!technician_id) {
      return res.status(400).json({ success: false, message: 'Please select a technician to assign' });
    }

    const tech = (memoryStore.technicians || []).find(t => t.id === Number(technician_id));
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Selected technician not found' });
    }

    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    const scootyReturn = (memoryStore.scootyReturns || []).find(
      r => r.id === returnId || r.return_number.toLowerCase() === id.toLowerCase()
    );

    if (!scootyReturn) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    scootyReturn.technician_id = tech.id;
    scootyReturn.technician_name = tech.name;
    scootyReturn.technician_phone = tech.phone;
    scootyReturn.technician_code = tech.technician_code;
    scootyReturn.updated_at = now;

    if (scootyReturn.status === 'Pending Inspection') {
      scootyReturn.status = 'Pending Inspection';
    }

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_returns SET
            technician_id = $1,
            technician_name = $2,
            technician_phone = $3,
            technician_code = $4,
            updated_at = $5
           WHERE id = $6 OR return_number = $7`,
          [tech.id, tech.name, tech.phone, tech.technician_code, now, scootyReturn.id, id]
        );

        await pool.query(
          `INSERT INTO scooty_return_events (
            return_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scootyReturn.id,
            'TECHNICIAN_ASSIGNED',
            'Technician Assigned for Inspection',
            `Hub Incharge assigned technician ${tech.name} to perform physical and mechanical damage inspection.`,
            scootyReturn.status,
            req.user?.id || 6,
            performerName,
            performerRole,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[assignTechnicianForReturn] DB update error:', dbErr);
      }
    }

    memoryStore.scootyReturnEvents.push({
      id: (memoryStore.scootyReturnEvents?.length || 0) + 1,
      return_id: scootyReturn.id,
      event_type: 'TECHNICIAN_ASSIGNED',
      title: 'Technician Assigned for Inspection',
      description: `Hub Incharge assigned technician ${tech.name} to perform physical and mechanical damage inspection.`,
      status: scootyReturn.status,
      performed_by_id: req.user?.id || 6,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: null,
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'ASSIGN_RETURN_INSPECTION',
      module: 'Returns',
      recordId: scootyReturn.id,
      newValues: { technician_id: tech.id, technician_name: tech.name },
      notes: `Assigned technician ${tech.name} to return ticket ${scootyReturn.return_number}`
    });

    return res.json({
      success: true,
      message: `Technician ${tech.name} assigned for return inspection.`,
      data: scootyReturn
    });
  } catch (error: any) {
    console.error('Error assigning technician for return:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign technician' });
  }
};

// 5. SUBMIT TECHNICIAN DAMAGE INSPECTION REPORT (TECHNICIAN WORKFLOW)
export const submitTechnicianInspection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { damage_items = [], technician_remarks, meter_reading } = req.body;
    const returnId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Technician';
    const performerRole = req.user?.roleDisplayName || 'Technician';

    const scootyReturn = (memoryStore.scootyReturns || []).find(
      r => r.id === returnId || r.return_number.toLowerCase() === id.toLowerCase()
    );

    if (!scootyReturn) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    // Format damage items submitted by technician
    const formattedDamageItems = (damage_items || []).map((item: any, idx: number) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      return {
        id: item.id || `dmg-${idx + 1}-${Date.now()}`,
        part_name: item.part_name || 'General Damage Repair',
        category: item.category || 'General',
        quantity: qty,
        unit_price: price,
        total_price: Number(item.total_price) !== undefined ? Number(item.total_price) : qty * price,
        technician_remark: item.technician_remark || item.description || '',
        photos: item.photos || [],
        hub_remark_type: item.hub_remark_type || 'Charge Customer',
        hub_remark_text: item.hub_remark_text || '',
        is_payable: item.hub_remark_type === 'No Payment' ? false : true
      };
    });

    const calculation = computeSettlement(scootyReturn.security_deposit_amount, formattedDamageItems);

    scootyReturn.damage_items = formattedDamageItems;
    scootyReturn.gross_damage_total = calculation.grossDamageTotal;
    scootyReturn.payable_damage_total = calculation.payableDamageTotal;
    scootyReturn.waived_damage_total = calculation.waivedDamageTotal;
    scootyReturn.settlement_type = calculation.settlementType;
    scootyReturn.refund_amount_to_rider = calculation.refundAmountToRider;
    scootyReturn.due_amount_from_rider = calculation.dueAmountFromRider;
    scootyReturn.status = 'Inspection Completed';
    scootyReturn.inspection_completed_at = now;
    if (meter_reading) scootyReturn.initial_meter_reading = Number(meter_reading);
    scootyReturn.updated_at = now;

    const itemCount = formattedDamageItems.length;
    const eventDesc = itemCount > 0
      ? `Technician ${performerName} completed physical inspection: logged ${itemCount} damage item(s) totaling ₹${calculation.grossDamageTotal}. Ready for Hub Incharge settlement review.`
      : `Technician ${performerName} completed physical inspection: Verified zero damages. Full security deposit (₹${scootyReturn.security_deposit_amount}) eligible for 100% refund.`;

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_returns SET
            damage_items = $1,
            gross_damage_total = $2,
            payable_damage_total = $3,
            waived_damage_total = $4,
            settlement_type = $5,
            refund_amount_to_rider = $6,
            due_amount_from_rider = $7,
            status = $8,
            inspection_completed_at = $9,
            initial_meter_reading = COALESCE($10, initial_meter_reading),
            updated_at = $11
           WHERE id = $12 OR return_number = $13`,
          [
            JSON.stringify(formattedDamageItems),
            scootyReturn.gross_damage_total,
            scootyReturn.payable_damage_total,
            scootyReturn.waived_damage_total,
            scootyReturn.settlement_type,
            scootyReturn.refund_amount_to_rider,
            scootyReturn.due_amount_from_rider,
            scootyReturn.status,
            now,
            scootyReturn.initial_meter_reading,
            now,
            scootyReturn.id,
            id
          ]
        );

        await pool.query(
          `INSERT INTO scooty_return_events (
            return_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            scootyReturn.id,
            'INSPECTION_COMPLETED',
            'Damage Inspection Report Submitted',
            eventDesc,
            scootyReturn.status,
            req.user?.id || 5,
            performerName,
            performerRole,
            JSON.stringify({ damage_count: itemCount, gross_total: calculation.grossDamageTotal }),
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[submitTechnicianInspection] DB update error:', dbErr);
      }
    }

    memoryStore.scootyReturnEvents.push({
      id: (memoryStore.scootyReturnEvents?.length || 0) + 1,
      return_id: scootyReturn.id,
      event_type: 'INSPECTION_COMPLETED',
      title: 'Damage Inspection Report Submitted',
      description: eventDesc,
      status: scootyReturn.status,
      performed_by_id: req.user?.id || 5,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: { damage_count: itemCount, gross_total: calculation.grossDamageTotal },
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'SUBMIT_RETURN_INSPECTION',
      module: 'Returns',
      recordId: scootyReturn.id,
      newValues: { damage_items: formattedDamageItems, gross_damage_total: calculation.grossDamageTotal },
      notes: `Technician submitted damage inspection for return ticket ${scootyReturn.return_number}`
    });

    return res.json({
      success: true,
      message: 'Damage inspection submitted successfully. Sent to Hub Incharge for final settlement.',
      data: scootyReturn
    });
  } catch (error: any) {
    console.error('Error submitting technician inspection:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit inspection report' });
  }
};

// 6. SETTLE RETURN & FINALIZE PAYMENT (HUB INCHARGE WORKFLOW)
export const settleReturn = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      damage_items = [],
      security_deposit_amount,
      settlement_notes,
      rider_payment_mode,
      rider_payment_reference,
      rider_payment_status = 'Paid'
    } = req.body;

    const returnId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    const scootyReturn = (memoryStore.scootyReturns || []).find(
      r => r.id === returnId || r.return_number.toLowerCase() === id.toLowerCase()
    );

    if (!scootyReturn) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    const secDeposit = Number(security_deposit_amount) >= 0 ? Number(security_deposit_amount) : Number(scootyReturn.security_deposit_amount);

    // Process damage items with Hub Incharge remark types & "No Payment" logic
    const finalDamageItems = (damage_items || []).map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const isNoPayment = item.hub_remark_type === 'No Payment';
      return {
        ...item,
        quantity: qty,
        unit_price: price,
        total_price: Number(item.total_price) !== undefined ? Number(item.total_price) : qty * price,
        hub_remark_type: item.hub_remark_type || 'Charge Customer',
        hub_remark_text: item.hub_remark_text || '',
        is_payable: isNoPayment ? false : true
      };
    });

    const calculation = computeSettlement(secDeposit, finalDamageItems);

    scootyReturn.security_deposit_amount = secDeposit;
    scootyReturn.damage_items = finalDamageItems;
    scootyReturn.gross_damage_total = calculation.grossDamageTotal;
    scootyReturn.payable_damage_total = calculation.payableDamageTotal;
    scootyReturn.waived_damage_total = calculation.waivedDamageTotal;
    scootyReturn.settlement_type = calculation.settlementType;
    scootyReturn.refund_amount_to_rider = calculation.refundAmountToRider;
    scootyReturn.due_amount_from_rider = calculation.dueAmountFromRider;
    scootyReturn.settlement_notes = settlement_notes?.trim() || null;
    scootyReturn.rider_payment_mode = rider_payment_mode || 'UPI';
    scootyReturn.rider_payment_reference = rider_payment_reference?.trim() || null;
    scootyReturn.rider_payment_status = rider_payment_status;
    scootyReturn.status = 'Completed';
    scootyReturn.settled_at = now;
    scootyReturn.updated_at = now;

    // Update Fleet vehicle status to Available
    const fleetVehicle = (memoryStore.fleet || []).find(f => f.reg_number.toUpperCase() === scootyReturn.scooter_number.toUpperCase());
    if (fleetVehicle) {
      fleetVehicle.status = 'Available';
    }

    let summaryText = '';
    if (calculation.settlementType === 'FULL_REFUND') {
      summaryText = `Settlement approved with zero deductions. Full security deposit of ₹${calculation.refundAmountToRider} refunded to rider ${scootyReturn.rider_name}.`;
    } else if (calculation.settlementType === 'PARTIAL_REFUND') {
      summaryText = `Settlement approved. Damage deductions: ₹${calculation.payableDamageTotal} (Waived: ₹${calculation.waivedDamageTotal}). Balance refund of ₹${calculation.refundAmountToRider} issued to rider via ${rider_payment_mode || 'UPI'}.`;
    } else if (calculation.settlementType === 'ZERO_BALANCE') {
      summaryText = `Settlement approved. Total payable damages (₹${calculation.payableDamageTotal}) exactly balanced the ₹${secDeposit} security deposit. Zero refund balance.`;
    } else {
      summaryText = `Settlement approved. Payable damages (₹${calculation.payableDamageTotal}) exceeded security deposit (₹${secDeposit}). Additional due amount of ₹${calculation.dueAmountFromRider} collected from rider via ${rider_payment_mode || 'UPI'}.`;
    }

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_returns SET
            security_deposit_amount = $1,
            damage_items = $2,
            gross_damage_total = $3,
            payable_damage_total = $4,
            waived_damage_total = $5,
            settlement_type = $6,
            refund_amount_to_rider = $7,
            due_amount_from_rider = $8,
            settlement_notes = $9,
            rider_payment_mode = $10,
            rider_payment_reference = $11,
            rider_payment_status = $12,
            status = $13,
            settled_at = $14,
            updated_at = $15
           WHERE id = $16 OR return_number = $17`,
          [
            scootyReturn.security_deposit_amount,
            JSON.stringify(finalDamageItems),
            scootyReturn.gross_damage_total,
            scootyReturn.payable_damage_total,
            scootyReturn.waived_damage_total,
            scootyReturn.settlement_type,
            scootyReturn.refund_amount_to_rider,
            scootyReturn.due_amount_from_rider,
            scootyReturn.settlement_notes,
            scootyReturn.rider_payment_mode,
            scootyReturn.rider_payment_reference,
            scootyReturn.rider_payment_status,
            scootyReturn.status,
            now,
            now,
            scootyReturn.id,
            id
          ]
        );

        await pool.query(
          `UPDATE fleet SET status = 'Available' WHERE reg_number = $1`,
          [scootyReturn.scooter_number]
        ).catch(() => {});

        await pool.query(
          `INSERT INTO scooty_return_events (
            return_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            scootyReturn.id,
            'SETTLED_COMPLETED',
            'Scooty Return Settled & Closed',
            summaryText,
            scootyReturn.status,
            req.user?.id || 6,
            performerName,
            performerRole,
            JSON.stringify({
              settlement_type: calculation.settlementType,
              refund: calculation.refundAmountToRider,
              due: calculation.dueAmountFromRider,
              payable_damages: calculation.payableDamageTotal
            }),
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[settleReturn] DB update error:', dbErr);
      }
    }

    memoryStore.scootyReturnEvents.push({
      id: (memoryStore.scootyReturnEvents?.length || 0) + 1,
      return_id: scootyReturn.id,
      event_type: 'SETTLED_COMPLETED',
      title: 'Scooty Return Settled & Closed',
      description: summaryText,
      status: scootyReturn.status,
      performed_by_id: req.user?.id || 6,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: {
        settlement_type: calculation.settlementType,
        refund: calculation.refundAmountToRider,
        due: calculation.dueAmountFromRider,
        payable_damages: calculation.payableDamageTotal
      },
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'SETTLE_SCOOTY_RETURN',
      module: 'Returns',
      recordId: scootyReturn.id,
      newValues: {
        status: 'Completed',
        settlement_type: calculation.settlementType,
        refund: calculation.refundAmountToRider,
        due: calculation.dueAmountFromRider
      },
      notes: `Settled return ticket ${scootyReturn.return_number} for rider ${scootyReturn.rider_name}`
    });

    return res.json({
      success: true,
      message: 'Scooty return settled and closed successfully. Vehicle restored to active inventory.',
      data: scootyReturn
    });
  } catch (error: any) {
    console.error('Error settling scooty return:', error);
    return res.status(500).json({ success: false, message: 'Failed to settle scooty return' });
  }
};

// 7. UPDATE RETURN STATUS / CANCEL
export const updateReturnStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const returnId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    const scootyReturn = (memoryStore.scootyReturns || []).find(
      r => r.id === returnId || r.return_number.toLowerCase() === id.toLowerCase()
    );

    if (!scootyReturn) {
      return res.status(404).json({ success: false, message: 'Return record not found' });
    }

    scootyReturn.status = status;
    scootyReturn.updated_at = now;

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_returns SET status = $1, updated_at = $2 WHERE id = $3 OR return_number = $4`,
          [status, now, scootyReturn.id, id]
        );

        await pool.query(
          `INSERT INTO scooty_return_events (
            return_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scootyReturn.id,
            'STATUS_UPDATED',
            `Status Updated to ${status}`,
            `${performerName} updated return ticket status to ${status}. ${remarks || ''}`.trim(),
            status,
            req.user?.id || 6,
            performerName,
            performerRole,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[updateReturnStatus] DB update error:', dbErr);
      }
    }

    memoryStore.scootyReturnEvents.push({
      id: (memoryStore.scootyReturnEvents?.length || 0) + 1,
      return_id: scootyReturn.id,
      event_type: 'STATUS_UPDATED',
      title: `Status Updated to ${status}`,
      description: `${performerName} updated return ticket status to ${status}. ${remarks || ''}`.trim(),
      status: status,
      performed_by_id: req.user?.id || 6,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: null,
      created_at: now
    });

    return res.json({
      success: true,
      message: `Return status updated to ${status}`,
      data: scootyReturn
    });
  } catch (error: any) {
    console.error('Error updating return status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update return status' });
  }
};
