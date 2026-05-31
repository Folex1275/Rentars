import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';
import {
  loginSchema,
  registerSchema,
  validateBody,
} from '../validators/auth.validator.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validateBody(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), login);

export default router;
