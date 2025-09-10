/** @format */
const { captureException } = require('@sentry/node');
const { getRedis } = require('../../config/redisInstance');
const { Secrets } = require('./secrets');

/**
 * Store the last processed block number in Redis
 * @param {number} blockNumber - The block number to store
 * @returns {Promise<boolean>} - Success status
 */
async function setLastProcessedBlock(blockNumber) {
    try {
        const redis = getRedis();
        if (!redis) {
            return false; // Redis not available, fail silently
        }

        const blockData = {
            blockNumber: blockNumber,
            timestamp: new Date().toISOString(),
            updatedAt: Date.now()
        };

        const redisKey = `${Secrets.CHAIN_ID}_${Secrets.LAST_PROCESSED_BLOCK_KEY}`;
        await redis.set(redisKey, JSON.stringify(blockData));
        return true;
    } catch (error) {
        console.error('Error storing last processed block:', error.message);
        captureException(error);
        return false;
    }
}

/**
 * Retrieve the last processed block number from Redis
 * @returns {Promise<number|null>} - The last processed block number or null if not found
 */
async function getLastProcessedBlock() {
    try {
        const redis = getRedis();
        if (!redis) {
            return null; // Redis not available
        }

        const redisKey = `${Secrets.CHAIN_ID}_${Secrets.LAST_PROCESSED_BLOCK_KEY}`;
        const blockDataString = await redis.get(redisKey);

        if (!blockDataString) {
            return null;
        }

        const blockData = JSON.parse(blockDataString);
        console.log(`Retrieved last processed block: ${blockData.blockNumber} (stored at: ${blockData.timestamp})`);

        return parseInt(blockData.blockNumber, 10);
    } catch (error) {
        console.error('Error retrieving last processed block:', error.message);
        captureException(error);
        return null;
    }
}

/**
 * Check if Redis is available and healthy
 * @returns {Promise<boolean>} - Connection status
 */
async function isRedisHealthy() {
    try {
        const redis = getRedis();
        if (!redis) {
            return false;
        }

        await redis.ping();
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    setLastProcessedBlock,
    getLastProcessedBlock,
    isRedisHealthy
};
