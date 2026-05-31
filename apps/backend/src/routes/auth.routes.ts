import { Router } from 'express';
import { login, register, walletChallenge, walletVerify } from '../controllers/auth.controller.js';
import {
  loginSchema,
  registerSchema,
  walletChallengeSchema,
  walletVerifySchema,
  validateBody,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/wallet/challenge', validateBody(walletChallengeSchema), walletChallenge);
router.post('/wallet/verify', validateBody(walletVerifySchema), walletVerify);

export default router;
