import { Request, Response } from 'express';
import { pool, memoryStore, getDbStatus } from '../../config/db';

export const getAllPreBookings = async (req: Request, res: Response) => {
  try {
    const { search, status, paymentMode, date, user_id, role } = req.query;
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const currentUserId = user_id ? Number(user_id) : null;

    if (getDbStatus()) {
      let sql = 'SELECT * FROM pre_bookings WHERE 1=1';
      const params: any[] = [];

      // RBAC: If not super admin, only show pre-bookings created by this user
      if (!isSuperAdmin && currentUserId) {
        sql += ' AND (created_by_id = ? OR created_by_id IS NULL)';
        params.push(currentUserId);
      }

      if (status && status !== 'All') {
        sql += ' AND payment_status = ?';
        params.push(status);
      }

      if (paymentMode && paymentMode !== 'All') {
        sql += ' AND payment_mode = ?';
        params.push(paymentMode);
      }

      if (date) {
        sql += ' AND booking_date = ?';
        params.push(date);
      }

      if (search) {
        sql += ' AND (customer_name LIKE ? OR mobile_number LIKE ? OR booking_code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await pool.query(sql, params);
      const bookings = result.rows || [];

      // Calculate stats (scoped to current view)
      const totalCount = bookings.length;
      const totalRevenue = bookings
        .filter((b: any) => b.payment_status === 'PAID')
        .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
      const totalQty = bookings
        .filter((b: any) => b.payment_status === 'PAID')
        .reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0);
      const upiCount = bookings.filter((b: any) => b.payment_mode === 'UPI' && b.payment_status === 'PAID').length;
      const upiAmount = bookings
        .filter((b: any) => b.payment_mode === 'UPI' && b.payment_status === 'PAID')
        .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
      const cashCount = bookings.filter((b: any) => b.payment_mode === 'Cash' && b.payment_status === 'PAID').length;
      const cashAmount = bookings
        .filter((b: any) => b.payment_mode === 'Cash' && b.payment_status === 'PAID')
        .reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);

      return res.json({
        success: true,
        isSuperAdmin,
        data: bookings,
        stats: {
          totalCount,
          totalRevenue,
          totalQty,
          upiCount,
          upiAmount,
          cashCount,
          cashAmount
        }
      });
    }

    // In-memory fallback
    let list = [...(memoryStore.preBookings || [])];

    // RBAC: If not super admin, only show pre-bookings created by this user
    if (!isSuperAdmin && currentUserId) {
      list = list.filter(b => b.created_by_id === currentUserId || !b.created_by_id);
    }

    if (status && status !== 'All') {
      list = list.filter(b => b.payment_status === status);
    }
    if (paymentMode && paymentMode !== 'All') {
      list = list.filter(b => b.payment_mode === paymentMode);
    }
    if (date) {
      list = list.filter(b => b.booking_date === date);
    }
    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(
        b =>
          b.customer_name?.toLowerCase().includes(s) ||
          b.mobile_number?.toLowerCase().includes(s) ||
          b.booking_code?.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalCount = list.length;
    const totalRevenue = list
      .filter(b => b.payment_status === 'PAID')
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const totalQty = list
      .filter(b => b.payment_status === 'PAID')
      .reduce((sum, b) => sum + Number(b.quantity || 0), 0);
    const upiCount = list.filter(b => b.payment_mode === 'UPI' && b.payment_status === 'PAID').length;
    const upiAmount = list
      .filter(b => b.payment_mode === 'UPI' && b.payment_status === 'PAID')
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const cashCount = list.filter(b => b.payment_mode === 'Cash' && b.payment_status === 'PAID').length;
    const cashAmount = list
      .filter(b => b.payment_mode === 'Cash' && b.payment_status === 'PAID')
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    return res.json({
      success: true,
      isSuperAdmin,
      data: list,
      stats: {
        totalCount,
        totalRevenue,
        totalQty,
        upiCount,
        upiAmount,
        cashCount,
        cashAmount
      }
    });
  } catch (error: any) {
    console.error('Error fetching pre-bookings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pre-bookings' });
  }
};

export const createPreBooking = async (req: Request, res: Response) => {
  try {
    const {
      customer_name,
      mobile_number,
      booking_date,
      quantity = 1,
      payment_mode = 'UPI',
      payment_status = 'PAID',
      notes = '',
      created_by_id = null,
      created_by_name = 'Staff'
    } = req.body;

    if (!customer_name || !mobile_number) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and mobile number are required'
      });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const unitPrice = 499.00;
    const totalAmount = qty * unitPrice;
    const validDate = booking_date || new Date().toISOString().split('T')[0];

    // Determine sequential booking code from series settings
    let prefix = 'DR-PB-';
    let nextNum = 1001;

    if (getDbStatus()) {
      const qrRows = (await pool.query('SELECT * FROM upi_qr_settings WHERE id = 1')).rows;
      if (qrRows.length > 0) {
        prefix = qrRows[0].booking_id_prefix || 'DR-PB-';
        nextNum = qrRows[0].next_booking_number || qrRows[0].starting_booking_number || 1001;
      }

      // Check max existing ID in db to avoid duplicate key collisions
      const countRes = (await pool.query('SELECT COUNT(*) as cnt FROM pre_bookings')).rows;
      const totalInDb = countRes[0]?.cnt || 0;
      if (totalInDb > 0) {
        nextNum = Math.max(nextNum, 1001 + totalInDb);
      }

      const bookingCode = `${prefix}${nextNum}`;

      const insertSql = `
        INSERT INTO pre_bookings (
          booking_code,
          customer_name,
          mobile_number,
          booking_date,
          unit_price,
          quantity,
          total_amount,
          payment_mode,
          payment_status,
          notes,
          created_by_id,
          created_by_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await pool.query(insertSql, [
        bookingCode,
        customer_name,
        mobile_number,
        validDate,
        unitPrice,
        qty,
        totalAmount,
        payment_mode,
        payment_status,
        notes,
        created_by_id,
        created_by_name
      ]);

      // Update next booking number
      await pool.query('UPDATE upi_qr_settings SET next_booking_number = ? WHERE id = 1', [nextNum + 1]);

      const [newRow] = (await pool.query('SELECT * FROM pre_bookings WHERE id = ?', [result.insertId])).rows;
      return res.status(201).json({
        success: true,
        data: newRow,
        message: 'Pre-booking created successfully!'
      });
    }

    // In-memory fallback
    const settings = (memoryStore as any).qrSettings || {
      booking_id_prefix: 'DR-PB-',
      starting_booking_number: 1001,
      next_booking_number: 1003
    };

    prefix = settings.booking_id_prefix || 'DR-PB-';
    const currentNext = settings.next_booking_number || settings.starting_booking_number || 1001;
    const bookingCode = `${prefix}${currentNext}`;
    settings.next_booking_number = currentNext + 1;

    const newBooking = {
      id: Date.now(),
      booking_code: bookingCode,
      customer_name,
      mobile_number,
      booking_date: validDate,
      unit_price: unitPrice,
      quantity: qty,
      total_amount: totalAmount,
      payment_mode: payment_mode as 'UPI' | 'Cash',
      payment_status: payment_status as 'PAID' | 'CANCELLED' | 'PENDING',
      notes,
      created_by_id: created_by_id ? Number(created_by_id) : null,
      created_by_name,
      created_at: new Date().toISOString()
    };

    if (!memoryStore.preBookings) memoryStore.preBookings = [];
    memoryStore.preBookings.unshift(newBooking as any);

    return res.status(201).json({
      success: true,
      data: newBooking,
      message: 'Pre-booking created successfully!'
    });
  } catch (error: any) {
    console.error('Error creating pre-booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to create pre-booking' });
  }
};

export const updatePreBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_mode, notes } = req.body;

    if (getDbStatus()) {
      await pool.query(
        'UPDATE pre_bookings SET payment_status = COALESCE(?, payment_status), payment_mode = COALESCE(?, payment_mode), notes = COALESCE(?, notes) WHERE id = ?',
        [payment_status, payment_mode, notes, id]
      );
      const [updated] = (await pool.query('SELECT * FROM pre_bookings WHERE id = ?', [id])).rows;
      return res.json({ success: true, data: updated, message: 'Pre-booking updated' });
    }

    // In-memory
    const idx = (memoryStore.preBookings || []).findIndex(b => String(b.id) === String(id));
    if (idx !== -1) {
      if (payment_status) memoryStore.preBookings[idx].payment_status = payment_status;
      if (payment_mode) memoryStore.preBookings[idx].payment_mode = payment_mode;
      if (notes !== undefined) memoryStore.preBookings[idx].notes = notes;
      return res.json({ success: true, data: memoryStore.preBookings[idx], message: 'Pre-booking updated' });
    }

    return res.status(404).json({ success: false, message: 'Pre-booking not found' });
  } catch (error: any) {
    console.error('Error updating pre-booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to update pre-booking' });
  }
};

export const deletePreBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (getDbStatus()) {
      await pool.query('DELETE FROM pre_bookings WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Pre-booking deleted' });
    }

    // In-memory
    if (memoryStore.preBookings) {
      memoryStore.preBookings = memoryStore.preBookings.filter(b => String(b.id) !== String(id));
    }
    return res.json({ success: true, message: 'Pre-booking deleted' });
  } catch (error: any) {
    console.error('Error deleting pre-booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete pre-booking' });
  }
};

// UPI QR Settings endpoints (Super Admin can configure QR Code Image, UPI ID & ID Series starting number)
export const getQrSettings = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const rows = (await pool.query('SELECT * FROM upi_qr_settings WHERE id = 1')).rows;
      if (rows.length > 0) {
        return res.json({ success: true, data: rows[0] });
      }
    }

    return res.json({
      success: true,
      data: (memoryStore as any).qrSettings || {
        upi_id: 'doonriders@icici',
        merchant_name: 'DOON RIDERS EV MOBILITY',
        qr_image_url: '',
        booking_id_prefix: 'DR-PB-',
        starting_booking_number: 1001,
        next_booking_number: 1003
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch QR settings' });
  }
};

export const updateQrSettings = async (req: Request, res: Response) => {
  try {
    const {
      upi_id,
      merchant_name,
      qr_image_url,
      booking_id_prefix = 'DR-PB-',
      starting_booking_number = 1001
    } = req.body;

    const startNum = Number(starting_booking_number) || 1001;

    if (getDbStatus()) {
      await pool.query(
        `INSERT INTO upi_qr_settings (id, upi_id, merchant_name, qr_image_url, booking_id_prefix, starting_booking_number, next_booking_number)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           upi_id = VALUES(upi_id),
           merchant_name = VALUES(merchant_name),
           qr_image_url = VALUES(qr_image_url),
           booking_id_prefix = VALUES(booking_id_prefix),
           starting_booking_number = VALUES(starting_booking_number),
           next_booking_number = VALUES(next_booking_number)`,
        [
          upi_id || 'doonriders@icici',
          merchant_name || 'DOON RIDERS EV MOBILITY',
          qr_image_url || '',
          booking_id_prefix || 'DR-PB-',
          startNum,
          startNum
        ]
      );
    }

    (memoryStore as any).qrSettings = {
      upi_id: upi_id || 'doonriders@icici',
      merchant_name: merchant_name || 'DOON RIDERS EV MOBILITY',
      qr_image_url: qr_image_url || '',
      booking_id_prefix: booking_id_prefix || 'DR-PB-',
      starting_booking_number: startNum,
      next_booking_number: startNum
    };

    return res.json({
      success: true,
      data: (memoryStore as any).qrSettings,
      message: 'Payment & Receipt Series settings updated successfully!'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update QR settings' });
  }
};
