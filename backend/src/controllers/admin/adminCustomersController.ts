import { Response } from 'express';
import { pool } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, kycStatus } = req.query;

    let query = `
      SELECT c.*, 
             COUNT(r.id) as total_rentals_count,
             MAX(r.created_at) as last_rental_date
      FROM customers c
      LEFT JOIN rentals r ON c.id = r.customer_id
      WHERE c.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (kycStatus && kycStatus !== 'All') {
      params.push(kycStatus);
      query += ` AND c.kyc_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.customer_code ILIKE $${params.length})`;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const custRes = await pool.query('SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = custRes.rows[0];

    // Fetch linked rentals
    const rentalsRes = await pool.query(`
      SELECT r.*, f.reg_number, f.model as vehicle_model, f.brand as vehicle_brand
      FROM rentals r
      JOIN fleet f ON r.vehicle_id = f.id
      WHERE r.customer_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    return res.json({
      success: true,
      data: {
        ...customer,
        rentals: rentalsRes.rows
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, alternatePhone, email, address, city, idProofType, idProofNumber, drivingLicenseNumber, leadId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM customers');
    const customerCode = `CUST-2026-${String(Number(countRes.rows[0].count) + 1).padStart(3, '0')}`;

    const query = `
      INSERT INTO customers (
        customer_code, lead_id, name, phone, alternate_phone, email,
        address, city, id_proof_type, id_proof_number, driving_license_number, kyc_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Verified')
    `;

    const result = await pool.query(query, [
      customerCode, leadId || null, name, phone, alternatePhone || null, email || null,
      address || 'Dehradun', city || 'Dehradun', idProofType || 'Aadhaar Card', idProofNumber || null,
      drivingLicenseNumber || null
    ]);

    const newCust = {
      id: result.insertId,
      customer_code: customerCode,
      lead_id: leadId || null,
      name,
      phone,
      alternate_phone: alternatePhone || null,
      email: email || null,
      address: address || 'Dehradun',
      city: city || 'Dehradun',
      id_proof_type: idProofType || 'Aadhaar Card',
      id_proof_number: idProofNumber || null,
      driving_license_number: drivingLicenseNumber || null,
      kyc_status: 'Verified',
      created_at: new Date().toISOString()
    };

    // If converted from lead, mark lead as Converted
    if (leadId) {
      await pool.query("UPDATE leads SET status = 'Converted', updated_at = NOW() WHERE id = $1", [leadId]);
      await pool.query(`
        INSERT INTO lead_timeline (lead_id, performed_by, action, notes)
        VALUES ($1, $2, 'CONVERTED', $3)
      `, [leadId, req.user?.id, `Lead converted to customer account: ${customerCode}`]);
    }

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.roleName,
      action: 'CREATE',
      module: 'CUSTOMERS',
      recordId: customerCode,
      notes: `Created customer profile for ${name}`
    });

    return res.status(201).json({ success: true, data: newCust, message: 'Customer registered successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
