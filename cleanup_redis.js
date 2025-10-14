#!/usr/bin/env node
/** @format */

// Redis Cleanup Script - Remove old keys and setup new structure
const Redis = require("ioredis");

async function cleanupRedis() {
    console.log('🧹 Starting Redis cleanup...');

    // Connect to Redis (default DB 0)
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    try {
        // Get all old keys
        const allKeys = await redis.keys('*');
        console.log(`Found ${allKeys.length} keys to clean up`);

        if (allKeys.length > 0) {
            // Delete all old keys
            await redis.del(...allKeys);
            console.log(`✅ Deleted ${allKeys.length} old keys from DB 0`);
        }

        // Clean up Base chain DB (DB 1)
        await redis.select(1);
        const baseKeys = await redis.keys('*');
        console.log(`Found ${baseKeys.length} keys in Base DB to clean up`);

        if (baseKeys.length > 0) {
            await redis.del(...baseKeys);
            console.log(`✅ Deleted ${baseKeys.length} old keys from DB 1`);
        }

        // Clean up Polygon DB (DB 2) if exists
        await redis.select(2);
        const polygonKeys = await redis.keys('*');
        if (polygonKeys.length > 0) {
            await redis.del(...polygonKeys);
            console.log(`✅ Deleted ${polygonKeys.length} old keys from DB 2`);
        }

        console.log('🎉 Redis cleanup completed successfully!');
        console.log('');
        console.log('📋 New Redis Structure:');
        console.log('  - Ethereum (Chain ID 1): DB 0, Key: "last_processed_block"');
        console.log('  - Base (Chain ID 8453): DB 1, Key: "last_processed_block"');
        console.log('  - Polygon (Chain ID 137): DB 2, Key: "last_processed_block"');
        console.log('');
        console.log('✅ Each chain now uses its own Redis database!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await redis.quit();
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupRedis().catch(console.error);
}

module.exports = { cleanupRedis };
