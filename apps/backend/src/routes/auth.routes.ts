import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';
import {
  loginSchema,
  registerSchema,
  validateBody,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

export default router;
