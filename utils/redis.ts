import 'dotenv/config';
import { Redis } from 'ioredis';

const redisClient = () => {
  if (process.env.REDIS_URI) {
    console.log(`✅ Redis connected`);
    return process.env.REDIS_URI;
  }
  throw new Error('❌ Redis connection failed');
};

export const redis = new Redis(redisClient(), {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  reconnectOnError: () => true,
  retryStrategy: (times) => {
    return Math.min(times * 100, 2000); // retry every 100ms, max 2s
  },
});

redis.on('error', (err) => {
  console.error('🔴 Redis error:', err.message);
});
