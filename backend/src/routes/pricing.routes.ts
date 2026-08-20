import { Router } from 'express';

import { calculatePrice } from '../controllers/pricing.controller';

const router = Router();

router.post('/calculate', calculatePrice);

export default router;
