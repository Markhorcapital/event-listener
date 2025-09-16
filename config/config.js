/** @format */

// ================================================================================================
// CENTRALIZED CONTRACT & CHAIN CONFIGURATION
// ================================================================================================
// This file contains all contract configurations and chain settings.
// To add/remove contracts, simply modify the configurations below.

const { Secrets } = require('../server/utils/secrets');

// Import ABIs
const { abi } = require('../abi/NFTStakingV2.json');
const { abi: IntelliLinkerAbi } = require('../abi/IntelliLinkerV3.json');
const { abi: PersonalityPodERC721Abi } = require('../abi/PersonalityPodERC721.json');
const { abi: stakingAbi } = require('../abi/ERC1363StakingTrackerV1.json');
const { abi: reward_system_abi } = require('../abi/RewardSystem.json');

// ================================================================================================
// CONTRACT CONFIGURATION
// ================================================================================================
// Add/remove contracts here - everything else is automatic!

const CONTRACT_CONFIG = [
    {
        name: 'NFT Staking',
        address: () => Secrets.NFT_STAKING_ADDRESS,
        events: [
            {
                topic: () => Secrets.NFT_STAKED_TOPIC,
                eventName: 'Staked',
                abi: abi,
                handler: 'handleNftEvent'
            },
            {
                topic: () => Secrets.NFT_UNSTAKED_TOPIC,
                eventName: 'Unstaked',
                abi: abi,
                handler: 'handleNftEvent'
            }
        ]
    },
    {
        name: 'ALI Staking',
        address: () => Secrets.ALI_STAKING_ADDRESS,
        events: [
            {
                topic: () => Secrets.TOKEN_DEPOSITED_TOPIC,
                eventName: 'TokenDeposited',
                abi: stakingAbi,
                handler: 'handleGenericEvent'
            },
            {
                topic: () => Secrets.TOKEN_WITHDRAWN_TOPIC,
                eventName: 'TokenWithdrawn',
                abi: stakingAbi,
                handler: 'handleGenericEvent'
            }
        ]
    },
    {
        name: 'Reward System',
        address: () => Secrets.REWARD_SYSTEM_CONTRACT,
        events: [
            {
                topic: () => Secrets.ROOT_CHANGED_TOPIC,
                eventName: 'RootChanged',
                abi: reward_system_abi,
                handler: 'handleGenericEvent'
            },
            {
                topic: () => Secrets.ERC20_REWARD_CLAIMED,
                eventName: 'ERC20RewardClaimed',
                abi: reward_system_abi,
                handler: 'handleGenericEvent'
            }
        ]
    },
    {
        name: 'IntelliLinker',
        address: () => Secrets.INTELLILINKER_ADDRESS,
        events: [
            {
                topic: () => Secrets.NFT_LINKED_TOPIC,
                eventName: 'Linked',
                abi: IntelliLinkerAbi,
                handler: 'handleNftLinkedEvent'
            },
            {
                topic: () => Secrets.NFT_UNLINKED_TOPIC,
                eventName: 'Unlinked',
                abi: IntelliLinkerAbi,
                handler: 'handleNftUnLinkedEvent'
            }
        ]
    },
    {
        name: 'POD Transfers',
        address: () => Secrets.POD_ADDRESS,
        events: [
            {
                topic: () => Secrets.TRANSFER_TOPIC,
                eventName: 'Transfer',
                abi: PersonalityPodERC721Abi,
                handler: 'handleTransferEventWithExclusions',
                excludeAddresses: () => [Secrets.NFT_STAKING_ADDRESS, Secrets.INTELLIGENTNFT_V2].filter(Boolean)
            }
        ]
    },
    {
        name: 'Revenants Transfers',
        address: () => Secrets.REVENANTS_ADDRESS,
        events: [
            {
                topic: () => Secrets.TRANSFER_TOPIC,
                eventName: 'Transfer',
                abi: PersonalityPodERC721Abi,
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
        1: 3,      // Ethereum (12.04s blocks) - Conservative for expensive RPC
        137: 15,   // Polygon (2.14s blocks) - Moderate for fast, cheap blocks  
        8453: 10,  // Base (2s blocks) - Moderate for L2 efficiency
        25: 25     // Cronos (0.56s blocks) - Aggressive for very fast blocks
    },
    delays: {
        1: 300,    // Ethereum - Longer delay (expensive RPC, slow blocks)
        137: 100,  // Polygon - Medium delay (fast blocks, cheap RPC)
        8453: 150, // Base - Medium delay (L2, moderate cost)
        25: 50     // Cronos - Short delay (very fast blocks, need to keep up)
    },
    defaults: {
        batchSize: 5,
        delay: 150
    }
};

// ================================================================================================
// APPLICATION SETTINGS
// ================================================================================================

const APP_CONFIG = {
    nftCollectionFile: "nftCollection.json",
    transferMonitoring: {
        enabled: () => !!Secrets.TRANSFER_TOPIC,
        fallbackHandler: 'handleCollectionTransfer'
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
