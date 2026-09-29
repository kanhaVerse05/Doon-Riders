import express from 'express';
import {
  getAllPreBookings,
  createPreBooking,
  updatePreBookingStatus,
  deletePreBooking,
  getQrSettings,
  updateQrSettings
} from '../../controllers/admin/adminPreBookingController';

const router = express.Router();

router.get('/settings/qr', getQrSettings);
router.post('/settings/qr', updateQrSettings);

router.get('/', getAllPreBookings);
router.post('/', createPreBooking);
router.patch('/:id', updatePreBookingStatus);
router.delete('/:id', deletePreBooking);

export default router;
