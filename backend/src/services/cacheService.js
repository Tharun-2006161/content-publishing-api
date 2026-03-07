const { getRedisClient } = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

const TTL = config.cache.ttlSeconds;

async function getCached(key) {
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        if (data) {
            logger.info(`Cache HIT: ${key}`);
            return JSON.parse(data);
        }
        logger.info(`Cache MISS: ${key}`);
        return null;
    } catch (err) {
        logger.error('Cache get error:', err.message);
        return null;
    }
}

async function setCached(key, value, ttl = TTL) {
    try {
        const client = getRedisClient();
        await client.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
        logger.error('Cache set error:', err.message);
    }
}

async function invalidateCache(key) {
    try {
        const client = getRedisClient();
        await client.del(key);
        logger.info(`Cache invalidated: ${key}`);
    } catch (err) {
        logger.error('Cache invalidate error:', err.message);
    }
}

async function invalidatePattern(pattern) {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
            logger.info(`Cache pattern invalidated: ${pattern} (${keys.length} keys)`);
        }
    } catch (err) {
        logger.error('Cache pattern invalidate error:', err.message);
    }
}

const CacheKeys = {
    publishedPost: (id) => `post:published:${id}`,
    publishedPosts: (page, limit) => `posts:published:${page}:${limit}`,
    postRevisions: (id) => `post:revisions:${id}`,
};

module.exports = { getCached, setCached, invalidateCache, invalidatePattern, CacheKeys };
