import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../config/db';

export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    if (getDbStatus()) {
      const query = `
        INSERT IGNORE INTO newsletters (email)
        VALUES ($1)
      `;
      await pool.query(query, [email]);
      return res.status(201).json({
        success: true,
        message: 'Thank you for subscribing to DOON Riders updates!'
      });
    }

    if (!memoryStore.newsletters.find(n => n.email === email)) {
      memoryStore.newsletters.push({
        id: memoryStore.newsletters.length + 1,
        email,
        subscribed_at: new Date().toISOString()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to DOON Riders updates!'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
