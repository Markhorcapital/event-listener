/** @format */
const Redis = require("ioredis");
const { captureException } = require('@sentry/node');
const { Secrets } = require('../server/utils/secrets');

let redis = null;

async function initRedis() {
    try {
        const { REDIS_URL } = Secrets;

        if (!REDIS_URL) {
            console.log('REDIS_URL not provided, Redis will not be used for block persistence');
            return null;
        }

        redis = new Redis(REDIS_URL, {
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });

        redis.on('connect', () => {
            console.log('Redis connected successfully');
        });

        redis.on('error', (err) => {
            console.error('Redis connection error:', err.message);
            captureException(err);
        });

        redis.on('close', () => {
            console.log('Redis connection closed');
        });

        // Test the connection
        await redis.connect();
        await redis.ping();
        console.log('Redis initialized and ready');

        return redis;
    } catch (error) {
        console.error('Failed to initialize Redis:', error.message);
        captureException(error);
        redis = null;
        return null;
    }
}

async function closeRedis() {
    if (redis) {
        try {
            await redis.quit();
            redis = null;
            console.log('Redis connection closed gracefully');
        } catch (error) {
            console.error('Error closing Redis connection:', error.message);
        }
    }
}

function getRedis() {
    return redis;
}

module.exports = {
    initRedis,
    closeRedis,
    getRedis
};
