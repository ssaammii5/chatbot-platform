import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
