import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { errorMiddleware } from './middleware/error.middleware.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestLoggingMiddleware } from './middleware/logging.middleware.js';
import routes from './routes/index.js';

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

// Centralized routes with versioning
app.use(routes);

app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`🚀 Rentars API running on http://localhost:${PORT}`);
  startSyncScheduler();
});
