import { Router } from 'express';
import { getSettings, updateSetting } from '../../controllers/admin/adminSettingsController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('settings.view'), getSettings);
router.put('/', requirePermission('settings.edit'), updateSetting);

export default router;
