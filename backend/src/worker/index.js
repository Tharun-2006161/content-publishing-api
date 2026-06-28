require('dotenv').config();
const schedule = require('node-schedule');
const { connectDB, mongoose } = require('../config/database');
const { connectRedis } = require('../config/redis');
const { publishScheduledPosts } = require('./scheduler');
const logger = require('../utils/logger');
const config = require('../config');

const INTERVAL_MS = config.worker.intervalMs;

async function startWorker() {
    // Connect to DB
    try {
        await connectDB();
        logger.info('[Worker] Database connected.');
    } catch (err) {
        logger.error('[Worker] Failed to connect to database:', err);
        process.exit(1);
    }

    // Connect to Redis (non-fatal)
    try {
        await connectRedis();
    } catch (err) {
        logger.warn('[Worker] Redis connection failed (continuing without cache invalidation):', err.message);
    }

    logger.info(`[Worker] Scheduled publisher started. Interval: ${INTERVAL_MS}ms`);

    // Run immediately on start
    await publishScheduledPosts();

    // Schedule recurring job
    const intervalSeconds = Math.round(INTERVAL_MS / 1000);
    const rule = new schedule.RecurrenceRule();
    rule.second = Array.from({ length: Math.ceil(60 / intervalSeconds) }, (_, i) => i * intervalSeconds).filter(s => s < 60);

    schedule.scheduleJob(rule, async () => {
        await publishScheduledPosts();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('[Worker] Shutting down...');
        schedule.gracefulShutdown().then(() => {
            mongoose.connection.close();
            process.exit(0);
        });
    });
}

startWorker();
