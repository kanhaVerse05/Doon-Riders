import { Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const isSalesExec = user?.roleName === 'SALES_EXECUTIVE';

    if (getDbStatus()) {
      // 1. Leads Stats
      let leadFilter = 'WHERE deleted_at IS NULL';
      if (isSalesExec) {
        leadFilter += ` AND assigned_to = ${user.id}`;
      }

      const leadsQuery = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'New' THEN 1 END) as new_leads,
          COUNT(CASE WHEN status = 'Contacted' THEN 1 END) as contacted_leads,
          COUNT(CASE WHEN status = 'Interested' THEN 1 END) as interested_leads,
          COUNT(CASE WHEN status = 'Follow-up' THEN 1 END) as followup_leads,
          COUNT(CASE WHEN status = 'Documents Pending' THEN 1 END) as docs_pending_leads,
          COUNT(CASE WHEN status = 'Booking Confirmed' THEN 1 END) as confirmed_leads,
          COUNT(CASE WHEN status = 'Converted' THEN 1 END) as converted_leads,
          COUNT(CASE WHEN status = 'Lost' THEN 1 END) as lost_leads
        FROM leads
        ${leadFilter}
      `;

      // 2. Leads by Marketing Channel / Source
      const sourceQuery = `
        SELECT lead_source, COUNT(*) as count
        FROM leads
        ${leadFilter}
        GROUP BY lead_source
        ORDER BY count DESC
      `;

      // 3. Today's Priority Follow-ups
      const followupsQuery = `
        SELECT l.id, l.lead_code, l.name, l.phone, l.status, l.vehicle_interested_in, l.next_followup_date, l.notes,
               u.name as assigned_to_name
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        ${leadFilter} AND l.status IN ('Follow-up', 'Interested', 'Contacted', 'New')
        ORDER BY l.created_at DESC
        LIMIT 10
      `;

      // 4. Team Performance (For Manager / Admin / Super Admin)
      let teamPerformance: any[] = [];
      if (!isSalesExec) {
        const teamQuery = `
          SELECT u.id, u.name, u.email, u.avatar_url,
                 COUNT(l.id) as assigned_leads,
                 COUNT(CASE WHEN l.status = 'Converted' THEN 1 END) as converted_leads,
                 COUNT(CASE WHEN l.status = 'Interested' THEN 1 END) as active_deals,
                 COUNT(CASE WHEN l.status = 'Follow-up' THEN 1 END) as followups_count
          FROM users u
          LEFT JOIN leads l ON u.id = l.assigned_to AND l.deleted_at IS NULL
          WHERE u.role_id = (SELECT id FROM roles WHERE name = 'SALES_EXECUTIVE') AND u.status = 'active'
          GROUP BY u.id
        `;
        const teamRes = await pool.query(teamQuery);
        teamPerformance = teamRes.rows;
      }

      const [leadsRes, sourceRes, followupsRes] = await Promise.all([
        pool.query(leadsQuery),
        pool.query(sourceQuery),
        pool.query(followupsQuery)
      ]);

      const leadData = leadsRes.rows[0];
      const totalLeads = Number(leadData.total_leads) || 1;
      const convertedLeads = Number(leadData.converted_leads) || 0;
      const conversionRate = ((convertedLeads / totalLeads) * 100).toFixed(1);

      return res.json({
        success: true,
        data: {
          role: user?.roleName,
          leads: {
            ...leadData,
            conversion_rate: `${conversionRate}%`
          },
          leadsBySource: sourceRes.rows,
          todayFollowups: followupsRes.rows,
          teamPerformance
        }
      });
    }

    // Memory Store Fallback
    const leads = memoryStore.leads || [];
    return res.json({
      success: true,
      data: {
        role: user?.roleName || 'SUPER_ADMIN',
        leads: {
          total_leads: leads.length,
          new_leads: leads.filter(l => l.status === 'New').length,
          contacted_leads: leads.filter(l => l.status === 'Contacted').length,
          interested_leads: leads.filter(l => l.status === 'Interested').length,
          followup_leads: leads.filter(l => l.status === 'Follow-up').length,
          docs_pending_leads: leads.filter(l => l.status === 'Documents Pending').length,
          confirmed_leads: leads.filter(l => l.status === 'Booking Confirmed').length,
          converted_leads: leads.filter(l => l.status === 'Converted').length,
          lost_leads: 0,
          conversion_rate: '25.0%'
        },
        leadsBySource: [
          { lead_source: 'Meta Ads', count: 1 }
        ],
        todayFollowups: leads,
        teamPerformance: []
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
