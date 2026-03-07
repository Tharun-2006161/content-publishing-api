const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

function getRedisClient() {
    if (!redisClient) {
        redisClient = new Redis(config.redis.url, {
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 100, 3000);
                return delay;
            },
        });

        redisClient.on('connect', () => logger.info('Redis connected'));
        redisClient.on('error', (err) => logger.error('Redis error:', err.message));
        redisClient.on('close', () => logger.warn('Redis connection closed'));
    }
    return redisClient;
}

async function connectRedis() {
    const client = getRedisClient();
    try {
        await client.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis:', err.message);
    }
}

module.exports = { getRedisClient, connectRedis };
