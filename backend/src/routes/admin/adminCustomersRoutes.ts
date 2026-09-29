import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer } from '../../controllers/admin/adminCustomersController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('customers.view'), getCustomers);
router.get('/:id', requirePermission('customers.view'), getCustomerById);
router.post('/', requirePermission('customers.create'), createCustomer);

export default router;
