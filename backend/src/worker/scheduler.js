require('dotenv').config();
const { connectDB } = require('../config/database');
const { Post } = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

const INTERVAL_MS = config.worker.intervalMs;

async function publishScheduledPosts() {
    try {
        const result = await Post.updateMany(
            { status: 'scheduled', scheduled_for: { $lte: new Date() } },
            { $set: { status: 'published', published_at: new Date(), updated_at: new Date() } }
        );

        const updatedCount = result.modifiedCount;

        if (updatedCount > 0) {
            logger.info(`[Worker] Published ${updatedCount} scheduled post(s).`);
            try {
                const { getRedisClient } = require('../config/redis');
                const redis = getRedisClient();
                const keys = await redis.keys('posts:published:*');
                if (keys.length > 0) await redis.del(...keys);
                logger.info(`[Worker] Invalidated ${keys.length} cache key(s).`);
            } catch (cacheErr) {
                logger.warn('[Worker] Cache invalidation failed (non-fatal):', cacheErr.message);
            }
        } else {
            logger.debug('[Worker] No scheduled posts to publish.');
        }

        return updatedCount;
    } catch (err) {
        logger.error('[Worker] Error publishing scheduled posts:', err);
        return 0;
    }
}

module.exports = { publishScheduledPosts };
