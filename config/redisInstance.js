/** @format */
const Redis = require("ioredis");
const { captureException } = require('@sentry/node');
const { Secrets } = require('../server/utils/secrets');

let redis = null;

async function initRedis() {
    try {
        const { REDIS_URL, CHAIN_ID } = Secrets;

        if (!REDIS_URL) {
            console.log('REDIS_URL not provided, Redis will not be used for block persistence');
            return null;
        }

        // Determine Redis database based on chain ID
        let db = 0; // Default to DB 0
        if (CHAIN_ID) {
            const chainId = parseInt(CHAIN_ID);
            switch (chainId) {
                case 1:     // Ethereum Mainnet
                    db = 0;
                    break;
                case 8453:  // Base Mainnet
                    db = 1;
                    break;
                case 137:   // Polygon Mainnet (if needed later)
                    db = 2;
                    break;
                default:
                    db = 0;
                    console.warn(`Unknown CHAIN_ID ${chainId}, using Redis DB 0`);
            }
        }

        console.log(`🔗 Connecting to Redis DB ${db} for Chain ID ${CHAIN_ID}`);

        redis = new Redis(REDIS_URL, {
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            db: db  // Use specific database for this chain
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
