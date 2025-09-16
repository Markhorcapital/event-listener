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

    // 🔧 PROFESSIONAL: Generate optimized Redis keys
    getProgressKey() {
        return `chain:${this.chainId}:progress`;
    }

    getProcessedKey(blockNumber) {
        return `chain:${this.chainId}:block:${blockNumber}`;
    }

    getBatchKey(startBlock, endBlock) {
        return `chain:${this.chainId}:batch:${startBlock}-${endBlock}`;
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

    // 🔧 PROFESSIONAL: Atomic progress update with metadata
    async setLastProcessedBlock(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const progressData = {
                block: blockNumber,
                chain: this.chainId,
                updated: Date.now(),
                service: this.serviceKey
            };

            await redis.hset(this.getProgressKey(), progressData);
            return true;
        }, `setProgress:${blockNumber}`);
    }

    // 🔧 PROFESSIONAL: Efficient progress retrieval with hash operations
    async getLastProcessedBlock() {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return null;

            const progressData = await redis.hgetall(this.getProgressKey());

            if (!progressData || !progressData.block) {
                return null;
            }

            const blockNumber = parseInt(progressData.block, 10);
            console.log(`📊 Retrieved progress: Block ${blockNumber} (Chain: ${progressData.chain}, Updated: ${new Date(parseInt(progressData.updated)).toISOString()})`);

            return blockNumber;
        }, 'getProgress');
    }

    // 🚀 PROFESSIONAL: Batch duplicate checking with pipeline
    async checkBlocksBatch(blockNumbers) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return blockNumbers.map(() => false);

            const pipeline = redis.pipeline();
            blockNumbers.forEach(blockNum => {
                pipeline.exists(this.getProcessedKey(blockNum));
            });

            const results = await pipeline.exec();
            return results.map(([err, result]) => err ? false : result === 1);
        }, `batchCheck:${blockNumbers.length}`);
    }

    // 🔧 PROFESSIONAL: Efficient single block check
    async isBlockProcessed(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const exists = await redis.exists(this.getProcessedKey(blockNumber));
            return exists === 1;
        }, `checkBlock:${blockNumber}`);
    }

    // 🚀 PROFESSIONAL: Batch marking with pipeline + optimized TTL
    async markBlocksBatch(blockNumbers) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            const pipeline = redis.pipeline();
            const ttl = 86400; // 24 hours

            blockNumbers.forEach(blockNum => {
                pipeline.setex(this.getProcessedKey(blockNum), ttl, '1');
            });

            await pipeline.exec();
            return true;
        }, `batchMark:${blockNumbers.length}`);
    }

    // 🔧 PROFESSIONAL: Single block marking
    async markBlockProcessed(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return false;

            await redis.setex(this.getProcessedKey(blockNumber), 86400, '1');
            return true;
        }, `markBlock:${blockNumber}`);
    }

    // 🚀 ATOMIC: Claim block for processing (prevents race conditions)
    async claimBlockForProcessing(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return true; // Allow processing if Redis unavailable

            const claimKey = `chain:${this.chainId}:claim:${blockNumber}`;

            // Atomic operation: SET only if key doesn't exist (NX) with TTL
            const result = await redis.set(claimKey, '1', 'EX', 300, 'NX'); // 5 min TTL

            return result === 'OK'; // Returns true if we successfully claimed the block
        }, `claimBlock:${blockNumber}`);
    }

    // 🚀 ATOMIC: Release block claim (cleanup)
    async releaseBlockClaim(blockNumber) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return true;

            const claimKey = `chain:${this.chainId}:claim:${blockNumber}`;
            await redis.del(claimKey);
            return true;
        }, `releaseClaim:${blockNumber}`);
    }

    // 🚀 PROFESSIONAL: Memory optimization - cleanup old processed blocks
    async cleanupOldBlocks(currentBlock, keepBlocks = 1000) {
        return this.executeWithRetry(async () => {
            const redis = getRedis();
            if (!redis) return 0;

            const pattern = `chain:${this.chainId}:block:*`;
            const keys = await redis.keys(pattern);

            const oldKeys = keys.filter(key => {
                const blockNum = parseInt(key.split(':').pop());
                return blockNum < currentBlock - keepBlocks;
            });

            if (oldKeys.length > 0) {
                await redis.del(...oldKeys);
                console.log(`🧹 Cleaned up ${oldKeys.length} old block keys`);
            }

            return oldKeys.length;
        }, 'cleanup');
    }
}

// 🚀 SINGLETON PATTERN - Professional Redis Manager
const redisManager = new RedisBlockManager();

// 🔧 BACKWARD COMPATIBILITY - Maintain existing function signatures
async function setLastProcessedBlock(blockNumber) {
    return redisManager.setLastProcessedBlock(blockNumber);
}

async function getLastProcessedBlock() {
    return redisManager.getLastProcessedBlock();
}

async function getCurrentLastProcessedBlock() {
    return redisManager.getLastProcessedBlock();
}

async function isBlockProcessed(blockNumber) {
    return redisManager.isBlockProcessed(blockNumber);
}

async function markBlockProcessed(blockNumber) {
    return redisManager.markBlockProcessed(blockNumber);
}

async function claimBlockForProcessing(blockNumber) {
    return redisManager.claimBlockForProcessing(blockNumber);
}

async function releaseBlockClaim(blockNumber) {
    return redisManager.releaseBlockClaim(blockNumber);
}

// 🚀 PROFESSIONAL: Export both individual functions and manager class
module.exports = {
    // Backward compatibility
    setLastProcessedBlock,
    getLastProcessedBlock,
    getCurrentLastProcessedBlock,
    isBlockProcessed,
    markBlockProcessed,

    // Race condition prevention
    claimBlockForProcessing,
    releaseBlockClaim,

    // Professional features
    redisManager,
    RedisBlockManager
};
