import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../config/db';
import { AuthRequest } from '../types/auth';
import { logAuditEvent } from '../helpers/auditLogger';

// Helper to normalize slug
const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// GET /api/pricing-plans (Public active plans)
export const getPublicPricingPlans = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query(
        'SELECT * FROM pricing_plans WHERE is_active = TRUE ORDER BY display_order ASC, id ASC'
      );
      return res.json({ success: true, data: result.rows });
    }

    // Memory Store Fallback
    const plans = ((memoryStore as any).pricingPlans || []).filter((p: any) => p.is_active !== false);
    return res.json({ success: true, data: plans, source: 'memory' });
  } catch (error: any) {
    console.error('Error in getPublicPricingPlans:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/pricing-plans (Admin all plans)
export const getAdminPricingPlans = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query(
        'SELECT * FROM pricing_plans ORDER BY display_order ASC, id ASC'
      );
      return res.json({ success: true, data: result.rows });
    }

    // Memory Store Fallback
    const plans = (memoryStore as any).pricingPlans || [];
    return res.json({ success: true, data: plans, source: 'memory' });
  } catch (error: any) {
    console.error('Error in getAdminPricingPlans:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/pricing-plans (Create plan)
export const createPricingPlan = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      tagline,
      price,
      period = 'week',
      badge,
      features,
      securityDeposit = 2000,
      isPopular = false,
      isActive = true,
      displayOrder = 1
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: 'Plan name and price are required.' });
    }

    const slug = slugify(name) + '-' + Math.floor(Math.random() * 1000);
    const parsedFeatures = Array.isArray(features) ? features : (typeof features === 'string' ? JSON.parse(features) : []);

    if (getDbStatus()) {
      const query = `
        INSERT INTO pricing_plans 
        (name, slug, tagline, price, period, badge, features, security_deposit, is_popular, is_active, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      const values = [
        name,
        slug,
        tagline || '',
        Number(price),
        period,
        badge || null,
        JSON.stringify(parsedFeatures),
        Number(securityDeposit) || 2000,
        Boolean(isPopular),
        Boolean(isActive),
        Number(displayOrder) || 1
      ];

      const result = await pool.query(query, values);
      const newPlan = {
        id: result.insertId,
        name,
        slug,
        tagline,
        price: Number(price),
        period,
        badge,
        features: parsedFeatures,
        security_deposit: Number(securityDeposit) || 2000,
        is_popular: Boolean(isPopular),
        is_active: Boolean(isActive),
        display_order: Number(displayOrder) || 1,
        created_at: new Date().toISOString()
      };

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'CREATE',
        module: 'SETTINGS',
        recordId: result.insertId,
        notes: `Created pricing plan: ${name} (₹${price}/${period})`
      });

      return res.status(201).json({ success: true, message: 'Pricing plan created successfully', data: newPlan });
    }

    // Memory Store Fallback
    if (!(memoryStore as any).pricingPlans) {
      (memoryStore as any).pricingPlans = [];
    }
    const newId = (memoryStore as any).pricingPlans.length > 0
      ? Math.max(...(memoryStore as any).pricingPlans.map((p: any) => p.id)) + 1
      : 1;

    const newPlan = {
      id: newId,
      name,
      slug,
      tagline: tagline || '',
      price: Number(price),
      period,
      badge: badge || null,
      features: parsedFeatures,
      security_deposit: Number(securityDeposit) || 2000,
      is_popular: Boolean(isPopular),
      is_active: Boolean(isActive),
      display_order: Number(displayOrder) || 1,
      created_at: new Date().toISOString()
    };

    (memoryStore as any).pricingPlans.push(newPlan);

    return res.status(201).json({
      success: true,
      message: 'Pricing plan created successfully (Memory Store)',
      data: newPlan
    });
  } catch (error: any) {
    console.error('Error in createPricingPlan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/pricing-plans/:id (Update plan)
export const updatePricingPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const planId = Number(id);

    if (isNaN(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid pricing plan ID.' });
    }

    const {
      name,
      tagline,
      price,
      period,
      badge,
      features,
      securityDeposit,
      isPopular,
      isActive,
      displayOrder
    } = req.body;

    const parsedFeatures = features
      ? (Array.isArray(features) ? features : JSON.parse(features))
      : undefined;

    if (getDbStatus()) {
      const existing = await pool.query('SELECT * FROM pricing_plans WHERE id = $1', [planId]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pricing plan not found.' });
      }

      const prev = existing.rows[0];
      const updatedName = name !== undefined ? name : prev.name;
      const updatedTagline = tagline !== undefined ? tagline : prev.tagline;
      const updatedPrice = price !== undefined ? Number(price) : prev.price;
      const updatedPeriod = period !== undefined ? period : prev.period;
      const updatedBadge = badge !== undefined ? badge : prev.badge;
      const updatedFeatures = parsedFeatures !== undefined ? JSON.stringify(parsedFeatures) : (typeof prev.features === 'string' ? prev.features : JSON.stringify(prev.features));
      const updatedDeposit = securityDeposit !== undefined ? Number(securityDeposit) : prev.security_deposit;
      const updatedPopular = isPopular !== undefined ? Boolean(isPopular) : prev.is_popular;
      const updatedActive = isActive !== undefined ? Boolean(isActive) : prev.is_active;
      const updatedOrder = displayOrder !== undefined ? Number(displayOrder) : prev.display_order;

      await pool.query(`
        UPDATE pricing_plans 
        SET name = $1, tagline = $2, price = $3, period = $4, badge = $5,
            features = $6, security_deposit = $7, is_popular = $8, is_active = $9,
            display_order = $10, updated_at = NOW()
        WHERE id = $11
      `, [
        updatedName,
        updatedTagline,
        updatedPrice,
        updatedPeriod,
        updatedBadge,
        updatedFeatures,
        updatedDeposit,
        updatedPopular,
        updatedActive,
        updatedOrder,
        planId
      ]);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'UPDATE',
        module: 'SETTINGS',
        recordId: planId,
        notes: `Updated pricing plan: ${updatedName} (₹${updatedPrice}/${updatedPeriod})`
      });

      return res.json({ success: true, message: 'Pricing plan updated successfully' });
    }

    // Memory Store Fallback
    const plans = (memoryStore as any).pricingPlans || [];
    const index = plans.findIndex((p: any) => p.id === planId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pricing plan not found.' });
    }

    plans[index] = {
      ...plans[index],
      name: name !== undefined ? name : plans[index].name,
      tagline: tagline !== undefined ? tagline : plans[index].tagline,
      price: price !== undefined ? Number(price) : plans[index].price,
      period: period !== undefined ? period : plans[index].period,
      badge: badge !== undefined ? badge : plans[index].badge,
      features: parsedFeatures !== undefined ? parsedFeatures : plans[index].features,
      security_deposit: securityDeposit !== undefined ? Number(securityDeposit) : plans[index].security_deposit,
      is_popular: isPopular !== undefined ? Boolean(isPopular) : plans[index].is_popular,
      is_active: isActive !== undefined ? Boolean(isActive) : plans[index].is_active,
      display_order: displayOrder !== undefined ? Number(displayOrder) : plans[index].display_order,
      updated_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Pricing plan updated successfully (Memory Store)',
      data: plans[index]
    });
  } catch (error: any) {
    console.error('Error in updatePricingPlan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/pricing-plans/:id (Delete plan)
export const deletePricingPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const planId = Number(id);

    if (isNaN(planId)) {
      return res.status(400).json({ success: false, message: 'Invalid pricing plan ID.' });
    }

    if (getDbStatus()) {
      const existing = await pool.query('SELECT name FROM pricing_plans WHERE id = $1', [planId]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Pricing plan not found.' });
      }

      await pool.query('DELETE FROM pricing_plans WHERE id = $1', [planId]);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'DELETE',
        module: 'SETTINGS',
        recordId: planId,
        notes: `Deleted pricing plan: ${existing.rows[0].name}`
      });

      return res.json({ success: true, message: 'Pricing plan deleted successfully.' });
    }

    // Memory Store Fallback
    const plans = (memoryStore as any).pricingPlans || [];
    const index = plans.findIndex((p: any) => p.id === planId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pricing plan not found.' });
    }
    plans.splice(index, 1);

    return res.json({ success: true, message: 'Pricing plan deleted successfully (Memory Store).' });
  } catch (error: any) {
    console.error('Error in deletePricingPlan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
