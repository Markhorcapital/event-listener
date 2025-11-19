/** @format */

// ================================================================================================
// CENTRALIZED CONTRACT & CHAIN CONFIGURATION
// ================================================================================================
// This file contains all contract configurations and chain settings.
// To add/remove contracts, simply modify the configurations below.

const { Secrets } = require('../server/utils/secrets');

// Import ABIs

const { abi } = require('../abi/ERC20.json');


// ================================================================================================
// CONTRACT CONFIGURATION
// ================================================================================================
// Add/remove contracts here - everything else is automatic!

const CONTRACT_CONFIG = [
    {
        name: 'Transfer',
        events: [
            {
                topic: () => Secrets.TRANSFER_TOPIC,
                eventName: 'Transfer',
                abi: abi,
                handler: 'handleTransferEvent'
            }
        ]
    }
];

// ================================================================================================
// CHAIN-SPECIFIC CONFIGURATIONS
// ================================================================================================
// Based on actual block times and RPC characteristics

const CHAIN_CONFIG = {
    batchSizes: {
        1: 100,    // Ethereum - Conservative and consistent
        137: 100,  // Polygon - Conservative and consistent
        8453: 100, // Base - Conservative and consistent
        25: 100    // Cronos - Conservative and consistent
    },
    delays: {
        1: 300,    // Ethereum - Longer delay (expensive RPC, slow blocks)
        137: 100,  // Polygon - Medium delay (fast blocks, cheap RPC)
        8453: 150, // Base - Medium delay (L2, moderate cost)
        25: 50     // Cronos - Short delay (very fast blocks, need to keep up)
    },
    // Historical processing delays (between individual blocks)
    historicalDelays: {
        1: 100,    // Ethereum - Moderate delay for historical
        137: 25,   // Polygon - Fast historical processing
        8453: 50,  // Base - Moderate historical processing
        25: 20     // Cronos - Fast historical processing
    },
    defaults: {
        batchSize: 5,
        delay: 150,
        historicalDelay: 50
    }
};

// ================================================================================================
// APPLICATION SETTINGS
// ================================================================================================

const APP_CONFIG = {
    nftCollectionFile: "nftCollection.json",
    transferMonitoring: {
        enabled: () => !!Secrets.TRANSFER_TOPIC,
        fallbackHandler: 'handleTransferEvent'
    }
};

// ================================================================================================
// EXPORTS
// ================================================================================================

module.exports = {
    CONTRACT_CONFIG,
    CHAIN_CONFIG,
    APP_CONFIG
};
