/** @format */

const Web3 = require('web3');
const { Secrets } = require('../server/utils/secrets');
const { captureException } = require('@sentry/node');

let web3Historical = null;

// 🚀 DEDICATED HISTORICAL WEB3 INSTANCE - Separate from real-time
function createHistoricalWeb3Instance(retryCount = 0) {
    try {
        const provider = Secrets.WEB3_PROVIDER_HISTORICAL || Secrets.WEB3_PROVIDER;

        if (!provider) {
            console.error('❌ No WEB3_PROVIDER_HISTORICAL or WEB3_PROVIDER found');
            return null;
        }

        const providerType = Secrets.WEB3_PROVIDER_HISTORICAL ? 'HISTORICAL' : 'FALLBACK';
        console.log(`🔗 Creating historical Web3 instance (${providerType}, attempt ${retryCount + 1})`);

        web3Historical = new Web3(provider);

        // Test connection
        web3Historical.eth.getBlockNumber()
            .then(blockNumber => {
                // console.log(`✅ Historical Web3 connected successfully. Latest block: ${blockNumber}`);
            })
            .catch(error => {
                console.error('❌ Historical Web3 connection test failed:', error.message);
                captureException(error);

                if (retryCount < 3) {
                    const delay = calculateBackoffDelay(retryCount);
                    console.log(`🔄 Retrying historical Web3 connection in ${delay}ms...`);
                    setTimeout(() => createHistoricalWeb3Instance(retryCount + 1), delay);
                }
            });

        return web3Historical;

    } catch (error) {
        console.error('❌ Failed to create historical Web3 instance:', error.message);
        captureException(error);

        if (retryCount < 3) {
            const delay = calculateBackoffDelay(retryCount);
            setTimeout(() => createHistoricalWeb3Instance(retryCount + 1), delay);
        }

        return null;
    }
}

// Function to calculate the backoff delay
function calculateBackoffDelay(retryCount) {
    const baseDelay = 2000; // Base delay in milliseconds (shorter for historical)
    const maxDelay = 15000; // Maximum delay in milliseconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    return delay;
}

// Initialize historical Web3 instance
function initHistoricalWeb3() {
    if (!web3Historical) {
        web3Historical = createHistoricalWeb3Instance();
    }
    return web3Historical;
}

// Get historical Web3 instance
function getHistoricalWeb3() {
    if (!web3Historical) {
        return initHistoricalWeb3();
    }
    return web3Historical;
}

module.exports = {
    web3Historical: getHistoricalWeb3(),
    initHistoricalWeb3,
    getHistoricalWeb3
};
