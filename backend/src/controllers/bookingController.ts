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
