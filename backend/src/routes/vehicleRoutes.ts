import { Router } from 'express';
import { getVehicles, getVehicleBySlug } from '../controllers/vehicleController';

const router = Router();
router.get('/', getVehicles);
router.get('/:slug', getVehicleBySlug);

export default router;
