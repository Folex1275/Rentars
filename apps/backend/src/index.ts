import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import bookingRoutes from './routes/booking.routes';
import propertyRoutes from './routes/property.routes';
import locationRoutes from './routes/location.routes';
import { setupOpenApiRoutes } from './config/swagger';

dotenv.config();

export const app = express();

app.use(express.json());
app.use(
  cors({
    origin: [env.CORS_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(rateLimiter);
app.use(requestLoggingMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Rentars API 🚀' });
});

// OpenAPI docs
setupOpenApiRoutes(app);

app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`🚀 Rentars API running on http://localhost:${PORT}`);
  startSyncScheduler();
});
