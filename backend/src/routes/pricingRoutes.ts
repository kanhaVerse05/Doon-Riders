import { Router } from 'express';
import { getPublicPricingPlans } from '../controllers/pricingController';

const router = Router();

router.get('/', getPublicPricingPlans);

export default router;
