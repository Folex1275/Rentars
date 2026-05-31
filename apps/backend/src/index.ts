import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { errorMiddleware } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import propertyRoutes from './routes/property.routes.js';
import { env } from './config/env.js';
import { findAvailablePort } from './utils/port.util.js';

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

// Routes
app.use('/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/properties', propertyRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Rentars API 🚀' });
});

app.use(errorMiddleware);

async function start() {
  try {
    const port = await findAvailablePort(env.PORT);
    app.listen(port, () => {
      console.log(`🚀 Rentars API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
