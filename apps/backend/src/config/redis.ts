import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('[redis] Client error:', err));
redisClient.on('connect', () => console.log('[redis] Connected'));
redisClient.on('reconnecting', () => console.log('[redis] Reconnecting...'));

let connected = false;

export async function connectRedis(): Promise<void> {
  if (connected) return;
  await redisClient.connect();
  connected = true;
}
