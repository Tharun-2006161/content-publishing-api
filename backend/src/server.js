require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const { connectDB } = require('./config/database');

connectDB().then(() => {
    const server = app.listen(config.port, () => {
        logger.info(`Content Publishing API running on port ${config.port} in ${config.nodeEnv} mode`);
        logger.info(`API docs: http://localhost:${config.port}/api-docs`);
        
        // Start background scheduler in main process to bypass Paid Worker tier
        const { publishScheduledPosts } = require('./worker/scheduler');
        setInterval(publishScheduledPosts, config.worker.intervalMs || 60000);
        logger.info('In-process background scheduler started');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully...');
        server.close(() => {
            logger.info('Server closed.');
            process.exit(0);
        });
    });

    process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down...');
        server.close(() => process.exit(0));
    });

    module.exports = server;
});


