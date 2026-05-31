import { connectRedis, redisClient } from '../config/redis.js';

async function ensureConnected(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    // Redis unavailable — cache operations will be no-ops
  }
}

export async function get<T>(key: string): Promise<T | null> {
  try {
    await ensureConnected();
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Cache miss is non-fatal
  }
}

export async function del(key: string): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.del(key);
  } catch {
    // Ignore
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    await ensureConnected();
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch {
    // Ignore
  }
}
