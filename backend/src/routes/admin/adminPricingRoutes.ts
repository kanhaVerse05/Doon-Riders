import { Router } from 'express';
import {
  getAdminPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan
} from '../../controllers/pricingController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

// Protect all admin pricing routes with JWT Auth
router.use(authenticateJwt);

router.get('/', requirePermission('settings.view'), getAdminPricingPlans);
router.post('/', requirePermission('settings.edit'), createPricingPlan);
router.put('/:id', requirePermission('settings.edit'), updatePricingPlan);
router.delete('/:id', requirePermission('settings.edit'), deletePricingPlan);

export default router;
