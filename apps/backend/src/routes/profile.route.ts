import { Router } from 'express';
import {
  getOwnProfileHandler,
  getPublicProfileHandler,
  updateProfileHandler,
  updateStellarAddressHandler,
} from '../controllers/profile.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/profile — own profile (auth required)
router.get('/', authenticate, getOwnProfileHandler);

// GET /api/profile/:id — public profile view
router.get('/:id', getPublicProfileHandler);

// PATCH /api/profile — update own profile (auth required)
router.patch('/', authenticate, updateProfileHandler);

// PATCH /api/profile/stellar — update Stellar wallet address (auth required)
router.patch('/stellar', authenticate, updateStellarAddressHandler);

export default router;
