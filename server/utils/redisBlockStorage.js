/** @format */
const { captureException } = require('@sentry/node');
const { getRedis } = require('../../config/redisInstance');
const { Secrets } = require('./secrets');

// 🚀 PRODUCTION REDIS MANAGER - Professional Implementation
class RedisBlockManager {
    constructor() {
        this.chainId = Secrets.CHAIN_ID;
        this.serviceKey = Secrets.LAST_PROCESSED_BLOCK_KEY;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    // 🔧 DUAL TRACKING: Real-time and historical processing
    getRealtimeProgressKey() {
        return `realtime_processed_block`;
    }

    getHistoricalProgressKey() {
        return `historical_processed_block`;
    }

    getHistoricalRangeKey() {
        return `historical_range`;
    }

    // 🚀 PROFESSIONAL: Retry logic with exponential backoff
    async executeWithRetry(operation, context = '') {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === this.retryAttempts) {
                    console.error(`Redis operation failed after ${this.retryAttempts} attempts [${context}]:`, error.message);
                    captureException(error);
                    throw error;
                }

                const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`Redis retry ${attempt}/${this.retryAttempts} [${context}] - waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 🚀 REAL-TIME: Store real-time processed block
    async setRealtimeProcessedBlock(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const progressData = {
                block: blockNumber,
                chain: this.chainId,
                updated: Date.now(),
                service: this.serviceKey,
                type: 'realtime'
            };

            await redis.hset(this.getRealtimeProgressKey(), progressData);
            return true;
        }, `setRealtimeProgress:${blockNumber}`);
    }

    // 🔄 HISTORICAL: Store historical processed block
    async setHistoricalProcessedBlock(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const progressData = {
                block: blockNumber,
                chain: this.chainId,
                updated: Date.now(),
                service: this.serviceKey,
                type: 'historical'
            };

            await redis.hset(this.getHistoricalProgressKey(), progressData);
            return true;
        }, `setHistoricalProgress:${blockNumber}`);
    }

    // 🎯 HISTORICAL RANGE: Store the range being processed
    async setHistoricalRange(startBlock, endBlock) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const rangeData = {
                startBlock: startBlock,
                endBlock: endBlock,
                chain: this.chainId,
                updated: Date.now(),
                status: 'processing'
            };

            await redis.hset(this.getHistoricalRangeKey(), rangeData);
            console.log(`📝 Stored historical range ${startBlock}-${endBlock} in Redis`);
            return true;
        }, `setHistoricalRange:${startBlock}-${endBlock}`);
    }

    // 🧹 CLEANUP: Clear historical processing when caught up
    async clearHistoricalProcessing() {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            await redis.del(this.getHistoricalProgressKey());
            await redis.del(this.getHistoricalRangeKey());
            console.log(`🧹 Cleared historical processing data`);
            return true;
        }, 'clearHistorical');
    }

    // 🔧 BACKWARD COMPATIBILITY: Use real-time block as main progress
    async setLastProcessedBlock(blockNumber) {
        return this.setRealtimeProcessedBlock(blockNumber);
    }

    // 🚀 GET REAL-TIME: Get last real-time processed block
    async getRealtimeProcessedBlock() {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return null;

            const progressData = await redis.hgetall(this.getRealtimeProgressKey());

            if (!progressData || !progressData.block) {
                return null;
            }

            const blockNumber = parseInt(progressData.block, 10);

            return blockNumber;
        }, 'getRealtimeProgress');
    }

    // 🔄 GET HISTORICAL: Get last historical processed block
    async getHistoricalProcessedBlock() {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return null;

            const progressData = await redis.hgetall(this.getHistoricalProgressKey());

            if (!progressData || !progressData.block) {
                return null;
            }

            return parseInt(progressData.block, 10);
        }, 'getHistoricalProgress');
    }

    // 🎯 GET HISTORICAL RANGE: Get current historical processing range
    async getHistoricalRange() {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return null;

            const rangeData = await redis.hgetall(this.getHistoricalRangeKey());

            if (!rangeData || !rangeData.startBlock) {
                return null;
            }

            return {
                startBlock: parseInt(rangeData.startBlock, 10),
                endBlock: parseInt(rangeData.endBlock, 10),
                status: rangeData.status
            };
        }, 'getHistoricalRange');
    }

    // 🔧 BACKWARD COMPATIBILITY: Use real-time block as main progress
    async getLastProcessedBlock() {
        return this.getRealtimeProcessedBlock();
    }

    // 🚀 SIMPLIFIED: No need for individual block tracking or claims
    // We only track the last processed block number
}

// 🚀 SINGLETON PATTERN - Professional Redis Manager
const redisManager = new RedisBlockManager();

// 🔧 DUAL TRACKING: Export all functions
async function setLastProcessedBlock(blockNumber) {
    return redisManager.setLastProcessedBlock(blockNumber);
}

async function getLastProcessedBlock() {
    return redisManager.getLastProcessedBlock();
}

async function getCurrentLastProcessedBlock() {
    return redisManager.getLastProcessedBlock();
}

// New dual tracking functions
async function setRealtimeProcessedBlock(blockNumber) {
    return redisManager.setRealtimeProcessedBlock(blockNumber);
}

async function setHistoricalProcessedBlock(blockNumber) {
    return redisManager.setHistoricalProcessedBlock(blockNumber);
}

async function getRealtimeProcessedBlock() {
    return redisManager.getRealtimeProcessedBlock();
}

async function getHistoricalProcessedBlock() {
    return redisManager.getHistoricalProcessedBlock();
}

async function setHistoricalRange(startBlock, endBlock) {
    return redisManager.setHistoricalRange(startBlock, endBlock);
}

async function getHistoricalRange() {
    return redisManager.getHistoricalRange();
}

async function clearHistoricalProcessing() {
    return redisManager.clearHistoricalProcessing();
}

// 🚀 DUAL TRACKING: Export all functions
module.exports = {
    // Core functionality (backward compatible)
    setLastProcessedBlock,
    getLastProcessedBlock,
    getCurrentLastProcessedBlock,

    // Dual tracking functionality
    setRealtimeProcessedBlock,
    setHistoricalProcessedBlock,
    getRealtimeProcessedBlock,
    getHistoricalProcessedBlock,
    setHistoricalRange,
    getHistoricalRange,
    clearHistoricalProcessing,

    // Manager class
    redisManager,
    RedisBlockManager
};
