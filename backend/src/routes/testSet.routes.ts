import { Router } from 'express';
import { createTestSet, listTestSets } from '../controllers/testSet.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createTestSetSchema, listTestSetSchema } from './testSet.schemas.js';

const router = Router();

router.get('/', requireAuth, validateRequest(listTestSetSchema), listTestSets);
router.post('/', requireAuth, validateRequest(createTestSetSchema), createTestSet);

export default router;
