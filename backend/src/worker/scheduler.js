require('dotenv').config();
const schedule = require('node-schedule');
const sequelize = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config');

const INTERVAL_MS = config.worker.intervalMs;

/**
 * Idempotent scheduler: publishes posts with status='scheduled' where scheduled_for <= NOW()
 * Uses a transaction to prevent double-publishing.
 */
async function publishScheduledPosts() {
    const t = await sequelize.transaction();
    try {
        const [updatedCount] = await sequelize.query(
            `UPDATE posts
       SET status = 'published',
           published_at = NOW(),
           updated_at = NOW()
       WHERE status = 'scheduled'
         AND scheduled_for <= NOW()`,
            { transaction: t, type: sequelize.QueryTypes.UPDATE }
        );

        await t.commit();

        if (updatedCount > 0) {
            logger.info(`[Worker] Published ${updatedCount} scheduled post(s).`);

            // Invalidate cache for published posts listing
            try {
                const { getRedisClient } = require('../config/redis');
                const redis = getRedisClient();
                // Invalidate all published list caches
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
        await t.rollback();
        logger.error('[Worker] Error publishing scheduled posts:', err);
        return 0;
    }
}

module.exports = { publishScheduledPosts };
