import { Redis } from 'ioredis';
import 'dotenv/config';

const redisUri = process.env.REDIS_URI;

if (!redisUri) {
  throw new Error('REDIS_URI is not defined');
}

export const redis = new Redis(redisUri, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },
});

redis.on('connect', () => console.log('✅ Redis client connected'));
redis.on('error', (err) => console.error('🔴 Redis error:', err.message));
