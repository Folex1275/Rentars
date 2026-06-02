import { connectRedis, redisClient } from '@/config/redis.js';

async function ensureConnected(): Promise<void> {
  try {
    await connectRedis();
  } catch {
    // Redis unavailable — cache operations will be no-ops
  }
}

/**
 * Retrieve a cached value by key.
 *
 * @template T - Expected type of the cached value
 * @param key - Cache key
 * @returns The cached value, or null if not found or Redis is unavailable
 * @example
 * const properties = await cache.get<Property[]>('properties:all');
 */
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

/**
 * Store a value in the cache with a TTL.
 *
 * @param key - Cache key
 * @param value - Value to cache (must be JSON-serialisable)
 * @param ttlSeconds - Seconds until the key expires
 * @example
 * await cache.set('properties:all', properties, 60);
 */
export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Cache miss is non-fatal
  }
}

/**
 * Delete a single key from the cache.
 *
 * @param key - Cache key to remove
 */
export async function del(key: string): Promise<void> {
  try {
    await ensureConnected();
    await redisClient.del(key);
  } catch {
    // Ignore
  }
}

/**
 * Delete all keys matching a glob pattern.
 * Useful for bulk cache invalidation (e.g., `properties:*`).
 *
 * @param pattern - Redis KEYS glob pattern
 * @example
 * await cache.invalidatePattern('property:*');
 */
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
