import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../config/db';

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, vehicleId, vehicleName, preferredDate, preferredTime, message } = req.body;

    if (!fullName || !email || !phone || !preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, phone, preferred date, and preferred time.'
      });
    }

    const newBooking = {
      id: memoryStore.bookings.length + 1,
      full_name: fullName,
      email,
      phone,
      vehicle_id: vehicleId || null,
      vehicle_name: vehicleName || 'DOON Electric Fleet',
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      message: message || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    if (getDbStatus()) {
      const query = `
        INSERT INTO test_drive_bookings 
        (full_name, email, phone, vehicle_id, vehicle_name, preferred_date, preferred_time, message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [fullName, email, phone, vehicleId || null, vehicleName || 'DOON Electric Fleet', preferredDate, preferredTime, message || ''];
      const result = await pool.query(query, values);
      const insertedBooking = {
        id: result.insertId,
        full_name: fullName,
        email,
        phone,
        vehicle_id: vehicleId || null,
        vehicle_name: vehicleName || 'DOON Electric Fleet',
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        message: message || '',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // ─── AUTO-CREATE LEAD in leads table ──────────────────────────────────────
      // Extract plan name from message: "Plan: XYZ | Note: ..."
      let rentalPlan = 'Website Inquiry';
      if (message) {
        const planMatch = message.match(/^Plan:\s*(.+?)\s*\|/);
        if (planMatch) rentalPlan = planMatch[1].trim();
      }

      try {
        const countRes = await pool.query("SELECT COUNT(*) FROM leads WHERE lead_code LIKE 'LD-%'");
        const nextNum = 1000 + Number(countRes.rows[0].count) + 1;
        const leadCode = `LD-${nextNum}`;

        await pool.query(`
          INSERT INTO leads (
            lead_code, name, phone, email, location,
            vehicle_interested_in, rental_plan, lead_source,
            status, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'Dehradun', $5, $6, 'Website Form', 'New', $7, NOW(), NOW())
        `, [
          leadCode,
          fullName,
          phone,
          email || null,
          vehicleName || 'DOON Electro Pro',
          rentalPlan,
          message || null
        ]);
      } catch (leadErr: any) {
        // Don't fail the booking if lead creation fails — just log
        console.warn('Auto lead creation failed (non-critical):', leadErr.message);
      }
      // ─────────────────────────────────────────────────────────────────────────

      return res.status(201).json({
        success: true,
        message: 'Test drive booked successfully! Our DOON Riders specialist will contact you.',
        data: insertedBooking
      });
    }

    memoryStore.bookings.push(newBooking);
    return res.status(201).json({
      success: true,
      message: 'Test drive booked successfully! Our DOON Riders specialist will contact you.',
      data: newBooking
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query('SELECT * FROM test_drive_bookings ORDER BY created_at DESC');
      return res.json({ success: true, data: result.rows });
    }
    return res.json({ success: true, data: memoryStore.bookings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
