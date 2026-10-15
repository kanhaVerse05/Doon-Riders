import express from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbacMiddleware';
import {
  getAllPreBookings,
  createPreBooking,
  updatePreBookingStatus,
  deletePreBooking,
  getQrSettings,
  updateQrSettings
} from '../../controllers/admin/adminPreBookingController';

const router = express.Router();

router.use(authenticateJwt);

router.get('/settings/qr', requirePermission('pre_bookings.settings'), getQrSettings);
router.post('/settings/qr', requirePermission('pre_bookings.settings'), updateQrSettings);

router.get('/', requireAnyPermission('pre_bookings.view', 'pre_bookings.view_all'), getAllPreBookings);
router.post('/', requirePermission('pre_bookings.create'), createPreBooking);
router.patch('/:id', requirePermission('pre_bookings.status_update'), updatePreBookingStatus);
router.delete('/:id', requirePermission('pre_bookings.delete'), deletePreBooking);

export default router;
