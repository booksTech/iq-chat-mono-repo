import { Router } from 'express';
import {
  forgotPassword,
  getCurrentUser,
  resetPassword,
  signin,
  signout,
  signup
} from '../controllers/auth.controller.js';
import { decryptAuthPayload } from '../middleware/decryptAuthPayload.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { forgotPasswordSchema, resetPasswordSchema, signinSchema, signupSchema } from './auth.schemas.js';

const router = Router();
router.post('/signup', decryptAuthPayload, validateRequest(signupSchema), signup);
router.post('/signin', decryptAuthPayload, validateRequest(signinSchema), signin);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', decryptAuthPayload, validateRequest(resetPasswordSchema), resetPassword);
router.get('/me', requireAuth, getCurrentUser);
router.post('/signout', signout);

export default router;
