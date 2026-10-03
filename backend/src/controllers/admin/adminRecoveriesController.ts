import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

// Helper: Format duration
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

// Helper: Calculate Recovery Settlement
// Formula: (Payable Damage Total + Fixed Recovery Charge (1000)) - Security Deposit Amount
export function computeRecoverySettlement(
  securityDeposit: number = 2000,
  recoveryCharge: number = 1000,
  damageItems: any[] = []
) {
  let grossDamageTotal = 0;
  let payableDamageTotal = 0;
  let waivedDamageTotal = 0;

  (damageItems || []).forEach((item: any) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const itemTotal = Number(item.total_price) !== undefined ? Number(item.total_price) : qty * price;

    grossDamageTotal += itemTotal;

    const isNoPayment = item.hub_remark_type === 'No Payment' || item.is_payable === false;
    if (isNoPayment) {
      waivedDamageTotal += itemTotal;
    } else {
      payableDamageTotal += itemTotal;
    }
  });

  const sec = Number(securityDeposit) >= 0 ? Number(securityDeposit) : 2000;
  const recFee = Number(recoveryCharge) >= 0 ? Number(recoveryCharge) : 1000;
  const totalCharges = Math.round((payableDamageTotal + recFee) * 100) / 100;

  let settlementType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ZERO_BALANCE' | 'DUE_FROM_RIDER' = 'FULL_REFUND';
  let refundAmount = 0;
  let dueAmount = 0;

  if (totalCharges === 0) {
    settlementType = 'FULL_REFUND';
    refundAmount = sec;
    dueAmount = 0;
  } else if (totalCharges < sec) {
    settlementType = 'PARTIAL_REFUND';
    refundAmount = Math.round((sec - totalCharges) * 100) / 100;
    dueAmount = 0;
  } else if (totalCharges === sec) {
    settlementType = 'ZERO_BALANCE';
    refundAmount = 0;
    dueAmount = 0;
  } else {
    settlementType = 'DUE_FROM_RIDER';
    refundAmount = 0;
    dueAmount = Math.round((totalCharges - sec) * 100) / 100;
  }

  return {
    grossDamageTotal: Math.round(grossDamageTotal * 100) / 100,
    payableDamageTotal: Math.round(payableDamageTotal * 100) / 100,
    waivedDamageTotal: Math.round(waivedDamageTotal * 100) / 100,
    recoveryCharge: recFee,
    totalCharges,
    settlementType,
    refundAmountToRider: refundAmount,
    dueAmountFromRider: dueAmount
  };
}

// 1. GET ALL RECOVERIES (LIST WITH STATS & FILTERS)
export const getAllRecoveries = async (req: AuthRequest, res: Response) => {
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

        // Role-based scoping: Hub Incharge only sees their Hub's recoveries
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
            LOWER(r.recovery_number) LIKE $${pIndex} OR
            LOWER(r.scooter_number) LIKE $${pIndex} OR
            LOWER(r.rider_name) LIKE $${pIndex} OR
            LOWER(r.rider_phone) LIKE $${pIndex} OR
            LOWER(r.recovered_by) LIKE $${pIndex} OR
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
          whereClauses.push(`r.recovery_date = CURRENT_DATE`);
        } else if (date_filter === 'week') {
          whereClauses.push(`r.recovery_date >= CURRENT_DATE - INTERVAL '7 days'`);
        }

        let orderSql = 'r.id DESC';
        if (sort_by === 'oldest') orderSql = 'r.id ASC';

        const sql = `
          SELECT 
            r.*,
            tech.specialization as technician_specialization,
            tech.rating as technician_rating
          FROM scooty_recoveries r
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
          FROM scooty_recoveries
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
        console.warn('[getAllRecoveries] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    // MemoryStore Fallback
    let list = [...(memoryStore.scootyRecoveries || [])];

    if (userRole.includes('HUB') && (req.user as any)?.hub_id) {
      list = list.filter(r => r.hub_id === (req.user as any)?.hub_id);
    } else if (userRole.includes('TECH')) {
      const techRecord = memoryStore.technicians.find(
        t => t.name.toLowerCase() === req.user?.name.toLowerCase() || t.id === userId
      );
      const techId = techRecord ? techRecord.id : userId;
      list = list.filter(r => r.technician_id === techId);
    }

    if (searchTerm) {
      list = list.filter(r =>
        r.recovery_number?.toLowerCase().includes(searchTerm) ||
        r.scooter_number?.toLowerCase().includes(searchTerm) ||
        r.rider_name?.toLowerCase().includes(searchTerm) ||
        r.rider_phone?.toLowerCase().includes(searchTerm) ||
        r.recovered_by?.toLowerCase().includes(searchTerm) ||
        r.hub_name?.toLowerCase().includes(searchTerm)
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
    console.error('Error fetching scooty recoveries:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching recoveries' });
  }
};

// 2. GET RECOVERY BY ID (WITH TIMELINE EVENTS & DETAILS)
export const getRecoveryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const recoveryId = Number(id);

    if (getDbStatus()) {
      try {
        const rRes = await pool.query(
          `SELECT r.*, tech.phone as technician_phone, tech.technician_code, tech.specialization as technician_specialization, tech.rating as technician_rating
           FROM scooty_recoveries r
           LEFT JOIN technicians tech ON r.technician_id = tech.id
           WHERE r.id = $1 OR r.recovery_number = $2`,
          [recoveryId || 0, id]
        );

        if (rRes.rows.length > 0) {
          const scootyRecovery = rRes.rows[0];
          const eventsRes = await pool.query(
            `SELECT * FROM scooty_recovery_events WHERE recovery_id = $1 ORDER BY created_at ASC`,
            [scootyRecovery.id]
          );

          return res.json({
            success: true,
            data: scootyRecovery,
            timeline: eventsRes.rows,
            hubs: memoryStore.repairHubs,
            technicians: memoryStore.technicians,
            inventoryParts: memoryStore.inventory
          });
        }
      } catch (dbErr) {
        console.warn('[getRecoveryById] DB query error, falling back to memoryStore:', dbErr);
      }
    }

    const scootyRecovery = (memoryStore.scootyRecoveries || []).find(
      r => r.id === recoveryId || r.recovery_number?.toLowerCase() === id.toLowerCase()
    );

    if (!scootyRecovery) {
      return res.status(404).json({ success: false, message: 'Scooty Recovery record not found' });
    }

    const timeline = (memoryStore.scootyRecoveryEvents || [])
      .filter(e => e.recovery_id === scootyRecovery.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return res.json({
      success: true,
      data: scootyRecovery,
      timeline,
      hubs: memoryStore.repairHubs,
      technicians: memoryStore.technicians,
      inventoryParts: memoryStore.inventory
    });
  } catch (error: any) {
    console.error('Error fetching recovery details:', error);
    return res.status(500).json({ success: false, message: 'Failed to load recovery details' });
  }
};

// 3. CREATE SCOOTY RECOVERY (HUB INCHARGE OR ADMIN)
export const createRecovery = async (req: AuthRequest, res: Response) => {
  try {
    const {
      rider_name,
      rider_phone,
      scooter_number,
      scooter_id,
      hub_id,
      recovered_by,
      recovery_date,
      recovery_time,
      recovery_charge = 1000,
      security_deposit_amount = 2000,
      technician_id,
      recovery_reason,
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

    const recoveryNumber = `DR-REC-${1000 + (memoryStore.scootyRecoveries?.length || 0) + 1}`;
    const now = new Date().toISOString();
    const secDeposit = Number(security_deposit_amount) >= 0 ? Number(security_deposit_amount) : 2000.00;
    const recFee = Number(recovery_charge) >= 0 ? Number(recovery_charge) : 1000.00;
    const recoveredByName = recovered_by?.trim() || req.user?.name || targetHub.incharge_name || 'Hub Incharge';

    const calculation = computeRecoverySettlement(secDeposit, recFee, []);

    const newRecovery: any = {
      id: (memoryStore.scootyRecoveries?.length || 0) + 1,
      recovery_number: recoveryNumber,
      rider_name: rider_name.trim(),
      rider_phone: rider_phone.trim(),
      scooter_number: scooter_number.toUpperCase().trim(),
      scooter_id: scooter_id ? Number(scooter_id) : null,
      hub_id: targetHub.id,
      hub_name: targetHub.hub_name,
      hub_incharge_id: req.user?.id || 6,
      hub_incharge_name: req.user?.name || targetHub.incharge_name,
      recovered_by: recoveredByName,
      recovery_date: recovery_date || new Date().toISOString().split('T')[0],
      recovery_time: recovery_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      recovery_charge: recFee,
      security_deposit_amount: secDeposit,
      technician_id: assignedTech ? assignedTech.id : null,
      technician_name: assignedTech ? assignedTech.name : null,
      technician_phone: assignedTech ? assignedTech.phone : null,
      technician_code: assignedTech ? assignedTech.technician_code : null,
      status: 'Pending Inspection',
      damage_items: [],
      gross_damage_total: 0.00,
      payable_damage_total: 0.00,
      waived_damage_total: 0.00,
      total_charges: calculation.totalCharges,
      settlement_type: calculation.settlementType,
      refund_amount_to_rider: calculation.refundAmountToRider,
      due_amount_from_rider: calculation.dueAmountFromRider,
      rider_payment_status: 'Pending',
      rider_payment_mode: null,
      rider_payment_reference: null,
      settlement_notes: null,
      recovery_reason: recovery_reason?.trim() || null,
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
          `INSERT INTO scooty_recoveries (
            recovery_number, rider_name, rider_phone, scooter_number, scooter_id,
            hub_id, hub_name, hub_incharge_id, hub_incharge_name, recovered_by, recovery_date, recovery_time,
            recovery_charge, security_deposit_amount, technician_id, technician_name,
            technician_phone, technician_code, status, damage_items, gross_damage_total,
            payable_damage_total, waived_damage_total, total_charges, settlement_type, refund_amount_to_rider,
            due_amount_from_rider, rider_payment_status, recovery_reason, initial_remarks, created_by_id,
            created_by_name, created_by_role, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
          RETURNING id`,
          [
            newRecovery.recovery_number,
            newRecovery.rider_name,
            newRecovery.rider_phone,
            newRecovery.scooter_number,
            newRecovery.scooter_id,
            newRecovery.hub_id,
            newRecovery.hub_name,
            newRecovery.hub_incharge_id,
            newRecovery.hub_incharge_name,
            newRecovery.recovered_by,
            newRecovery.recovery_date,
            newRecovery.recovery_time,
            newRecovery.recovery_charge,
            newRecovery.security_deposit_amount,
            newRecovery.technician_id,
            newRecovery.technician_name,
            newRecovery.technician_phone,
            newRecovery.technician_code,
            newRecovery.status,
            JSON.stringify(newRecovery.damage_items),
            newRecovery.gross_damage_total,
            newRecovery.payable_damage_total,
            newRecovery.waived_damage_total,
            newRecovery.total_charges,
            newRecovery.settlement_type,
            newRecovery.refund_amount_to_rider,
            newRecovery.due_amount_from_rider,
            newRecovery.rider_payment_status,
            newRecovery.recovery_reason,
            newRecovery.initial_remarks,
            newRecovery.created_by_id,
            newRecovery.created_by_name,
            newRecovery.created_by_role,
            newRecovery.created_at,
            newRecovery.updated_at
          ]
        );

        if (insertRes.rows.length > 0) {
          newRecovery.id = insertRes.rows[0].id;
        }

        await pool.query(
          `INSERT INTO scooty_recovery_events (
            recovery_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newRecovery.id,
            'RECOVERY_INITIATED',
            'Scooty Recovery Registered',
            `Vehicle ${newRecovery.scooter_number} recovered by ${newRecovery.recovered_by} from rider ${newRecovery.rider_name}. Fixed recovery charge: ₹${newRecovery.recovery_charge}. Security deposit: ₹${newRecovery.security_deposit_amount}. Assigned for technician damage check.`,
            newRecovery.status,
            newRecovery.created_by_id,
            newRecovery.created_by_name,
            newRecovery.created_by_role,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[createRecovery] DB insert error, falling back to memoryStore:', dbErr);
      }
    }

    // Update memoryStore
    memoryStore.scootyRecoveries.unshift(newRecovery);
    memoryStore.scootyRecoveryEvents.push({
      id: (memoryStore.scootyRecoveryEvents?.length || 0) + 1,
      recovery_id: newRecovery.id,
      event_type: 'RECOVERY_INITIATED',
      title: 'Scooty Recovery Registered',
      description: `Vehicle ${newRecovery.scooter_number} recovered by ${newRecovery.recovered_by} from rider ${newRecovery.rider_name}. Fixed recovery charge: ₹${newRecovery.recovery_charge}. Security deposit: ₹${newRecovery.security_deposit_amount}. Assigned for technician damage check.`,
      status: newRecovery.status,
      performed_by_id: newRecovery.created_by_id,
      performed_by_name: newRecovery.created_by_name,
      performed_by_role: newRecovery.created_by_role,
      metadata: null,
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE_SCOOTY_RECOVERY',
      module: 'Recoveries',
      recordId: newRecovery.id,
      newValues: newRecovery,
      notes: `Logged recovery ticket ${newRecovery.recovery_number} for rider ${newRecovery.rider_name} (${newRecovery.scooter_number})`
    });

    return res.status(201).json({
      success: true,
      message: `Scooty recovery ticket ${newRecovery.recovery_number} created successfully.`,
      data: newRecovery
    });
  } catch (error: any) {
    console.error('Error creating recovery:', error);
    return res.status(500).json({ success: false, message: 'Server error creating scooty recovery' });
  }
};

// 4. ASSIGN TECHNICIAN FOR RECOVERY INSPECTION
export const assignTechnicianForRecovery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    const recoveryId = Number(id);

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

    const scootyRecovery = (memoryStore.scootyRecoveries || []).find(
      r => r.id === recoveryId || r.recovery_number?.toLowerCase() === id.toLowerCase()
    );

    if (!scootyRecovery) {
      return res.status(404).json({ success: false, message: 'Recovery record not found' });
    }

    scootyRecovery.technician_id = tech.id;
    scootyRecovery.technician_name = tech.name;
    scootyRecovery.technician_phone = tech.phone;
    scootyRecovery.technician_code = tech.technician_code;
    scootyRecovery.updated_at = now;

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_recoveries SET
            technician_id = $1,
            technician_name = $2,
            technician_phone = $3,
            technician_code = $4,
            updated_at = $5
           WHERE id = $6 OR recovery_number = $7`,
          [tech.id, tech.name, tech.phone, tech.technician_code, now, scootyRecovery.id, id]
        );

        await pool.query(
          `INSERT INTO scooty_recovery_events (
            recovery_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scootyRecovery.id,
            'TECHNICIAN_ASSIGNED',
            'Technician Assigned for Inspection',
            `Hub Incharge assigned technician ${tech.name} to inspect physical damages on recovered scooty.`,
            scootyRecovery.status,
            req.user?.id || 6,
            performerName,
            performerRole,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[assignTechnicianForRecovery] DB update error:', dbErr);
      }
    }

    memoryStore.scootyRecoveryEvents.push({
      id: (memoryStore.scootyRecoveryEvents?.length || 0) + 1,
      recovery_id: scootyRecovery.id,
      event_type: 'TECHNICIAN_ASSIGNED',
      title: 'Technician Assigned for Inspection',
      description: `Hub Incharge assigned technician ${tech.name} to inspect physical damages on recovered scooty.`,
      status: scootyRecovery.status,
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
      action: 'ASSIGN_RECOVERY_INSPECTION',
      module: 'Recoveries',
      recordId: scootyRecovery.id,
      newValues: { technician_id: tech.id, technician_name: tech.name },
      notes: `Assigned technician ${tech.name} to recovery ticket ${scootyRecovery.recovery_number}`
    });

    return res.json({
      success: true,
      message: `Technician ${tech.name} assigned for recovery damage inspection.`,
      data: scootyRecovery
    });
  } catch (error: any) {
    console.error('Error assigning technician for recovery:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign technician' });
  }
};

// 5. SUBMIT TECHNICIAN DAMAGE INSPECTION REPORT (TECHNICIAN WORKFLOW)
export const submitTechnicianRecoveryInspection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { damage_items = [], technician_remarks } = req.body;
    const recoveryId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Technician';
    const performerRole = req.user?.roleDisplayName || 'Technician';

    const scootyRecovery = (memoryStore.scootyRecoveries || []).find(
      r => r.id === recoveryId || r.recovery_number?.toLowerCase() === id.toLowerCase()
    );

    if (!scootyRecovery) {
      return res.status(404).json({ success: false, message: 'Recovery record not found' });
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

    const calculation = computeRecoverySettlement(
      scootyRecovery.security_deposit_amount,
      scootyRecovery.recovery_charge,
      formattedDamageItems
    );

    scootyRecovery.damage_items = formattedDamageItems;
    scootyRecovery.gross_damage_total = calculation.grossDamageTotal;
    scootyRecovery.payable_damage_total = calculation.payableDamageTotal;
    scootyRecovery.waived_damage_total = calculation.waivedDamageTotal;
    scootyRecovery.total_charges = calculation.totalCharges;
    scootyRecovery.settlement_type = calculation.settlementType;
    scootyRecovery.refund_amount_to_rider = calculation.refundAmountToRider;
    scootyRecovery.due_amount_from_rider = calculation.dueAmountFromRider;
    scootyRecovery.status = 'Inspection Completed';
    scootyRecovery.inspection_completed_at = now;
    scootyRecovery.updated_at = now;

    const itemCount = formattedDamageItems.length;
    const eventDesc = itemCount > 0
      ? `Technician ${performerName} completed physical inspection: logged ${itemCount} damage item(s) totaling ₹${calculation.grossDamageTotal}. Total payable charges (Damages + ₹${scootyRecovery.recovery_charge} Recovery Fee) = ₹${calculation.totalCharges}. Ready for Hub Incharge settlement review.`
      : `Technician ${performerName} completed physical inspection: Verified zero damages. Only fixed recovery fee (₹${scootyRecovery.recovery_charge}) applies. Balance security of ₹${calculation.refundAmountToRider} eligible for refund.`;

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_recoveries SET
            damage_items = $1,
            gross_damage_total = $2,
            payable_damage_total = $3,
            waived_damage_total = $4,
            total_charges = $5,
            settlement_type = $6,
            refund_amount_to_rider = $7,
            due_amount_from_rider = $8,
            status = $9,
            inspection_completed_at = $10,
            updated_at = $11
           WHERE id = $12 OR recovery_number = $13`,
          [
            JSON.stringify(formattedDamageItems),
            scootyRecovery.gross_damage_total,
            scootyRecovery.payable_damage_total,
            scootyRecovery.waived_damage_total,
            scootyRecovery.total_charges,
            scootyRecovery.settlement_type,
            scootyRecovery.refund_amount_to_rider,
            scootyRecovery.due_amount_from_rider,
            scootyRecovery.status,
            now,
            now,
            scootyRecovery.id,
            id
          ]
        );

        await pool.query(
          `INSERT INTO scooty_recovery_events (
            recovery_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            scootyRecovery.id,
            'INSPECTION_COMPLETED',
            'Damage Inspection Report Submitted',
            eventDesc,
            scootyRecovery.status,
            req.user?.id || 5,
            performerName,
            performerRole,
            JSON.stringify({ damage_count: itemCount, gross_total: calculation.grossDamageTotal, total_charges: calculation.totalCharges }),
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[submitTechnicianRecoveryInspection] DB update error:', dbErr);
      }
    }

    memoryStore.scootyRecoveryEvents.push({
      id: (memoryStore.scootyRecoveryEvents?.length || 0) + 1,
      recovery_id: scootyRecovery.id,
      event_type: 'INSPECTION_COMPLETED',
      title: 'Damage Inspection Report Submitted',
      description: eventDesc,
      status: scootyRecovery.status,
      performed_by_id: req.user?.id || 5,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: { damage_count: itemCount, gross_total: calculation.grossDamageTotal, total_charges: calculation.totalCharges },
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'SUBMIT_RECOVERY_INSPECTION',
      module: 'Recoveries',
      recordId: scootyRecovery.id,
      newValues: { damage_items: formattedDamageItems, gross_damage_total: calculation.grossDamageTotal },
      notes: `Technician submitted damage inspection for recovery ticket ${scootyRecovery.recovery_number}`
    });

    return res.json({
      success: true,
      message: 'Damage inspection submitted successfully. Sent to Hub Incharge for final recovery settlement.',
      data: scootyRecovery
    });
  } catch (error: any) {
    console.error('Error submitting technician recovery inspection:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit inspection report' });
  }
};

// 6. SETTLE RECOVERY & FINALIZE PAYMENT (HUB INCHARGE WORKFLOW)
export const settleRecovery = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      damage_items = [],
      recovery_charge,
      security_deposit_amount,
      settlement_notes,
      rider_payment_mode,
      rider_payment_reference,
      rider_payment_status = 'Paid'
    } = req.body;

    const recoveryId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    const scootyRecovery = (memoryStore.scootyRecoveries || []).find(
      r => r.id === recoveryId || r.recovery_number?.toLowerCase() === id.toLowerCase()
    );

    if (!scootyRecovery) {
      return res.status(404).json({ success: false, message: 'Recovery record not found' });
    }

    const secDeposit = Number(security_deposit_amount) >= 0 ? Number(security_deposit_amount) : Number(scootyRecovery.security_deposit_amount);
    const recFee = Number(recovery_charge) >= 0 ? Number(recovery_charge) : Number(scootyRecovery.recovery_charge || 1000);

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

    const calculation = computeRecoverySettlement(secDeposit, recFee, finalDamageItems);

    scootyRecovery.security_deposit_amount = secDeposit;
    scootyRecovery.recovery_charge = recFee;
    scootyRecovery.damage_items = finalDamageItems;
    scootyRecovery.gross_damage_total = calculation.grossDamageTotal;
    scootyRecovery.payable_damage_total = calculation.payableDamageTotal;
    scootyRecovery.waived_damage_total = calculation.waivedDamageTotal;
    scootyRecovery.total_charges = calculation.totalCharges;
    scootyRecovery.settlement_type = calculation.settlementType;
    scootyRecovery.refund_amount_to_rider = calculation.refundAmountToRider;
    scootyRecovery.due_amount_from_rider = calculation.dueAmountFromRider;
    scootyRecovery.settlement_notes = settlement_notes?.trim() || null;
    scootyRecovery.rider_payment_mode = rider_payment_mode || 'UPI';
    scootyRecovery.rider_payment_reference = rider_payment_reference?.trim() || null;
    scootyRecovery.rider_payment_status = rider_payment_status;
    scootyRecovery.status = 'Completed';
    scootyRecovery.settled_at = now;
    scootyRecovery.updated_at = now;

    // Update Fleet vehicle status to Available
    const fleetVehicle = (memoryStore.fleet || []).find(
      f => f.reg_number.toUpperCase() === scootyRecovery.scooter_number.toUpperCase()
    );
    if (fleetVehicle) {
      fleetVehicle.status = 'Available';
    }

    let summaryText = '';
    if (calculation.settlementType === 'FULL_REFUND') {
      summaryText = `Recovery settlement approved with ₹0 charges. Full security of ₹${calculation.refundAmountToRider} refunded to rider.`;
    } else if (calculation.settlementType === 'PARTIAL_REFUND') {
      summaryText = `Recovery settlement approved. Total Deductions: ₹${calculation.totalCharges} (Damage: ₹${calculation.payableDamageTotal}, Recovery Fee: ₹${recFee}). Balance refund of ₹${calculation.refundAmountToRider} issued to rider via ${rider_payment_mode || 'UPI'}.`;
    } else if (calculation.settlementType === 'ZERO_BALANCE') {
      summaryText = `Recovery settlement approved. Total charges (₹${calculation.totalCharges}) exactly offset security deposit (₹${secDeposit}). Zero refund balance.`;
    } else {
      summaryText = `Recovery settlement approved. Total charges (Damage: ₹${calculation.payableDamageTotal} + Recovery: ₹${recFee} = ₹${calculation.totalCharges}) exceeded security deposit (₹${secDeposit}). Extra due amount of ₹${calculation.dueAmountFromRider} collected from rider via ${rider_payment_mode || 'UPI'}.`;
    }

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_recoveries SET
            security_deposit_amount = $1,
            recovery_charge = $2,
            damage_items = $3,
            gross_damage_total = $4,
            payable_damage_total = $5,
            waived_damage_total = $6,
            total_charges = $7,
            settlement_type = $8,
            refund_amount_to_rider = $9,
            due_amount_from_rider = $10,
            settlement_notes = $11,
            rider_payment_mode = $12,
            rider_payment_reference = $13,
            rider_payment_status = $14,
            status = $15,
            settled_at = $16,
            updated_at = $17
           WHERE id = $18 OR recovery_number = $19`,
          [
            scootyRecovery.security_deposit_amount,
            scootyRecovery.recovery_charge,
            JSON.stringify(finalDamageItems),
            scootyRecovery.gross_damage_total,
            scootyRecovery.payable_damage_total,
            scootyRecovery.waived_damage_total,
            scootyRecovery.total_charges,
            scootyRecovery.settlement_type,
            scootyRecovery.refund_amount_to_rider,
            scootyRecovery.due_amount_from_rider,
            scootyRecovery.settlement_notes,
            scootyRecovery.rider_payment_mode,
            scootyRecovery.rider_payment_reference,
            scootyRecovery.rider_payment_status,
            scootyRecovery.status,
            now,
            now,
            scootyRecovery.id,
            id
          ]
        );

        await pool.query(
          `UPDATE fleet SET status = 'Available' WHERE reg_number = $1`,
          [scootyRecovery.scooter_number]
        ).catch(() => {});

        await pool.query(
          `INSERT INTO scooty_recovery_events (
            recovery_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            scootyRecovery.id,
            'SETTLED_COMPLETED',
            'Scooty Recovery Settled & Closed',
            summaryText,
            scootyRecovery.status,
            req.user?.id || 6,
            performerName,
            performerRole,
            JSON.stringify({
              settlement_type: calculation.settlementType,
              recovery_fee: recFee,
              payable_damages: calculation.payableDamageTotal,
              total_charges: calculation.totalCharges,
              refund: calculation.refundAmountToRider,
              due: calculation.dueAmountFromRider
            }),
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[settleRecovery] DB update error:', dbErr);
      }
    }

    memoryStore.scootyRecoveryEvents.push({
      id: (memoryStore.scootyRecoveryEvents?.length || 0) + 1,
      recovery_id: scootyRecovery.id,
      event_type: 'SETTLED_COMPLETED',
      title: 'Scooty Recovery Settled & Closed',
      description: summaryText,
      status: scootyRecovery.status,
      performed_by_id: req.user?.id || 6,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: {
        settlement_type: calculation.settlementType,
        recovery_fee: recFee,
        payable_damages: calculation.payableDamageTotal,
        total_charges: calculation.totalCharges,
        refund: calculation.refundAmountToRider,
        due: calculation.dueAmountFromRider
      },
      created_at: now
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'SETTLE_SCOOTY_RECOVERY',
      module: 'Recoveries',
      recordId: scootyRecovery.id,
      newValues: {
        status: 'Completed',
        settlement_type: calculation.settlementType,
        total_charges: calculation.totalCharges,
        refund: calculation.refundAmountToRider,
        due: calculation.dueAmountFromRider
      },
      notes: `Settled recovery ticket ${scootyRecovery.recovery_number} for rider ${scootyRecovery.rider_name}`
    });

    return res.json({
      success: true,
      message: 'Scooty recovery settled and closed successfully. Vehicle restored to active fleet.',
      data: scootyRecovery
    });
  } catch (error: any) {
    console.error('Error settling scooty recovery:', error);
    return res.status(500).json({ success: false, message: 'Failed to settle scooty recovery' });
  }
};

// 7. UPDATE RECOVERY STATUS / CANCEL
export const updateRecoveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const recoveryId = Number(id);
    const now = new Date().toISOString();
    const performerName = req.user?.name || 'Hub Incharge';
    const performerRole = req.user?.roleDisplayName || 'Hub Incharge';

    const scootyRecovery = (memoryStore.scootyRecoveries || []).find(
      r => r.id === recoveryId || r.recovery_number?.toLowerCase() === id.toLowerCase()
    );

    if (!scootyRecovery) {
      return res.status(404).json({ success: false, message: 'Recovery record not found' });
    }

    scootyRecovery.status = status;
    scootyRecovery.updated_at = now;

    if (getDbStatus()) {
      try {
        await pool.query(
          `UPDATE scooty_recoveries SET status = $1, updated_at = $2 WHERE id = $3 OR recovery_number = $4`,
          [status, now, scootyRecovery.id, id]
        );

        await pool.query(
          `INSERT INTO scooty_recovery_events (
            recovery_id, event_type, title, description, status, performed_by_id, performed_by_name, performed_by_role, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scootyRecovery.id,
            'STATUS_UPDATED',
            `Status Updated to ${status}`,
            `${performerName} updated recovery ticket status to ${status}. ${remarks || ''}`.trim(),
            status,
            req.user?.id || 6,
            performerName,
            performerRole,
            now
          ]
        );
      } catch (dbErr) {
        console.warn('[updateRecoveryStatus] DB update error:', dbErr);
      }
    }

    memoryStore.scootyRecoveryEvents.push({
      id: (memoryStore.scootyRecoveryEvents?.length || 0) + 1,
      recovery_id: scootyRecovery.id,
      event_type: 'STATUS_UPDATED',
      title: `Status Updated to ${status}`,
      description: `${performerName} updated recovery ticket status to ${status}. ${remarks || ''}`.trim(),
      status: status,
      performed_by_id: req.user?.id || 6,
      performed_by_name: performerName,
      performed_by_role: performerRole,
      metadata: null,
      created_at: now
    });

    return res.json({
      success: true,
      message: `Recovery status updated to ${status}`,
      data: scootyRecovery
    });
  } catch (error: any) {
    console.error('Error updating recovery status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update recovery status' });
  }
};
