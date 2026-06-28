const logger = require('../utils/logger');

// Mock Redis client to allow running without a paid Redis instance on Render
const mockRedisClient = {
    get: async () => null,
    setex: async () => null,
    del: async () => null,
    keys: async () => [],
    on: () => {},
    connect: async () => { logger.info('Redis disabled (Mock mode running for Free Tier)'); }
};

function getRedisClient() {
    return mockRedisClient;
}

async function connectRedis() {
    await mockRedisClient.connect();
}

module.exports = { getRedisClient, connectRedis };
