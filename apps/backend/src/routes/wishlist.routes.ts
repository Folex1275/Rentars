import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { listWishlist, addWishlist, removeWishlist } from '../controllers/wishlist.controller.js';

const router = Router();

// GET /api/wishlists
router.get('/', authenticate, listWishlist);

// POST /api/wishlists/:propertyId
router.post('/:propertyId', authenticate, addWishlist);

// DELETE /api/wishlists/:propertyId
router.delete('/:propertyId', authenticate, removeWishlist);

export default router;
