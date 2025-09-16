/** @format */

// ================================================================================================
// IMPORTS & DEPENDENCIES
// ================================================================================================
const { captureException } = require('@sentry/node');
const { web3 } = require('../config/web3Instance');
const { initRedis } = require('../config/redisInstance');
const {
	setLastProcessedBlock,
	getLastProcessedBlock,
	getCurrentLastProcessedBlock,
	isBlockProcessed,
	markBlockProcessed
} = require('./utils/redisBlockStorage');
const {
	getChainBatchSize,
	getChainDelay,
	validateCriticalDependencies,
	buildEventHandlers,
	handleCollectionTransfer
} = require('./utils/utils');

// ================================================================================================
// MAIN EVENT LISTENER LOGIC
// ================================================================================================
(async () => {
	const { Secrets } = require('./utils/secrets');

	// 🚀 REDIS-ONLY STATE: Zero memory storage
	let isProcessingHistorical = false;     // Background processing flag only
	let eventHandlers = new Map();          // Event handler registry (built once)

	// ================================================================================================
	// REDIS-BASED UTILITIES (Production Optimized)
	// ================================================================================================

	// 🔧 PRODUCTION: Update last processed block in Redis only
	async function updateLastProcessedBlock(blockNumber) {
		try {
			await setLastProcessedBlock(blockNumber);
			console.log(`📝 Updated Redis: last processed block ${blockNumber}`);
		} catch (error) {
			console.error(`Error updating last processed block:`, error);
			captureException(error);
		}
	}

	// ================================================================================================
	// INTELLIGENT GAP DETECTION & PROCESSING
	// ================================================================================================

	// 🎯 REDIS-ONLY SMART BLOCK PROCESSING: Handles gaps dynamically
	async function handleBlockWithGapDetection(newBlockNumber) {
		// Get current last processed block from Redis (no memory cache)
		const lastProcessedBlock = await getCurrentLastProcessedBlock();

		if (lastProcessedBlock === null) {
			// First run - process new block only
			console.log(`🎯 First run: processing block ${newBlockNumber}`);
			await processNewBlockRealTime(newBlockNumber);
			return;
		}

		const gap = newBlockNumber - lastProcessedBlock - 1;

		if (gap === 0) {
			// ✅ NO GAP: Process normally
			console.log(`✅ No gap detected, processing block ${newBlockNumber}`);
			await processNewBlockRealTime(newBlockNumber);
		} else if (gap <= 5) {
			// 🚀 SMALL GAP (1-5 blocks): Fill immediately before processing new block
			console.log(`🚀 Small gap detected (${gap} blocks), filling immediately`);
			await fillSmallGap(lastProcessedBlock + 1, newBlockNumber - 1);
			await processNewBlockRealTime(newBlockNumber);
		} else {
			// 🔄 LARGE GAP (6+ blocks): Process new block first, then start background catch-up
			console.log(`🔄 Large gap detected (${gap} blocks), processing new block first`);

			// 🚨 FIX: Store original lastProcessedBlock BEFORE updating it
			const originalLastProcessedBlock = lastProcessedBlock;

			await processNewBlockRealTime(newBlockNumber);

			// Start background historical processing if not already running
			if (!isProcessingHistorical) {
				processHistoricalBlocksFromBlock(originalLastProcessedBlock);
			}
		}
	}

	// 🚀 PRODUCTION: Redis-based small gap filling
	async function fillSmallGap(startBlock, endBlock) {
		console.log(`🔧 Filling small gap: blocks ${startBlock} to ${endBlock}`);

		for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
			// Simple duplicate check (single instance per chain)
			if (await isBlockProcessed(blockNum)) {
				console.log(`⏭️ Block ${blockNum} already processed, skipping`);
				continue; // Already processed
			}

			try {
				console.log(`⚡ Gap-fill processing block: ${blockNum}`);
				await processBlock(blockNum);

				// Mark as processed in Redis
				await markBlockProcessed(blockNum);

				// Update Redis persistence (always update with latest processed block)
				await updateLastProcessedBlock(blockNum);

			} catch (error) {
				console.error(`Error filling gap block ${blockNum}:`, error);
				captureException(error);
			}
		}
	}

	// ================================================================================================
	// CORE PROCESSING FUNCTIONS
	// ================================================================================================

	// 🚀 SIMPLIFIED: Redis-based real-time processing (single instance per chain)
	async function processNewBlockRealTime(blockNumber) {
		// Simple duplicate check (single instance per chain)
		if (await isBlockProcessed(blockNumber)) {
			console.log(`⏭️ Block ${blockNumber} already processed, skipping`);
			return;
		}

		try {
			console.log(`⚡ REAL-TIME processing block: ${blockNumber}`);
			await processBlock(blockNumber);

			// Mark as processed in Redis
			await markBlockProcessed(blockNumber);

			// Update Redis persistence (always update with latest processed block)
			await updateLastProcessedBlock(blockNumber);
			console.log(`✅ Updated Redis lastProcessedBlock to ${blockNumber}`);

		} catch (error) {
			console.error(`Error processing real-time block ${blockNumber}:`, error);
			captureException(error);
		}
	}

	// 🔄 REDIS-ONLY HISTORICAL CATCH-UP PROCESSING (Background, non-blocking)
	async function processHistoricalBlocks() {
		if (isProcessingHistorical) {
			return; // Already running
		}

		isProcessingHistorical = true;

		try {
			// Get last processed block from Redis
			let lastProcessedBlock = await getCurrentLastProcessedBlock();
			if (lastProcessedBlock === null) {
				console.log("❌ No last processed block found in Redis, skipping historical processing");
				return;
			}

			console.log(`🔄 Starting historical catch-up from block ${lastProcessedBlock + 1}`);

			// Process ALL missed blocks sequentially until caught up
			const batchSize = getChainBatchSize();

			while (lastProcessedBlock < await web3.eth.getBlockNumber() - 1) {
				const currentBlock = await web3.eth.getBlockNumber();
				const startBlock = lastProcessedBlock + 1;
				const endBlock = Math.min(startBlock + batchSize - 1, currentBlock - 1);

				if (startBlock > endBlock) {
					break; // Caught up
				}

				console.log(`📦 Processing historical batch: ${startBlock} to ${endBlock}`);

				// Process batch sequentially to maintain order
				for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
					// Simple duplicate check (single instance per chain)
					if (await isBlockProcessed(blockNum)) {
						console.log(`⏭️ Block ${blockNum} already processed, skipping`);
						continue; // Already processed
					}

					try {
						console.log(`📜 Historical processing block: ${blockNum}`);
						await processBlock(blockNum);

						// Mark as processed in Redis
						await markBlockProcessed(blockNum);

						// Update Redis persistence (always update with latest processed block)
						await updateLastProcessedBlock(blockNum);
						lastProcessedBlock = blockNum; // Update local variable for loop

					} catch (error) {
						console.error(`Error processing historical block ${blockNum}:`, error);
						captureException(error);
						// Continue with next block
					}
				}

				// Small delay between batches to not overwhelm the RPC
				await new Promise(resolve => setTimeout(resolve, getChainDelay()));
			}

			console.log(`✅ Historical catch-up completed. Current lastProcessedBlock: ${lastProcessedBlock}`);

		} catch (error) {
			console.error("Error in historical processing:", error);
			captureException(error);
		} finally {
			isProcessingHistorical = false;
		}
	}

	// 🚨 FIX: New function that processes from a specific starting block
	async function processHistoricalBlocksFromBlock(startingLastProcessedBlock) {
		if (isProcessingHistorical) {
			return; // Already running
		}

		isProcessingHistorical = true;

		try {
			console.log(`🔄 Starting historical catch-up from original block ${startingLastProcessedBlock + 1}`);

			// Process ALL missed blocks sequentially until caught up
			const batchSize = getChainBatchSize();
			let lastProcessedBlock = startingLastProcessedBlock;

			while (lastProcessedBlock < await web3.eth.getBlockNumber() - 1) {
				const currentBlock = await web3.eth.getBlockNumber();
				const startBlock = lastProcessedBlock + 1;
				const endBlock = Math.min(startBlock + batchSize - 1, currentBlock - 1);

				if (startBlock > endBlock) {
					break; // Caught up
				}

				console.log(`📦 Processing historical batch: ${startBlock} to ${endBlock}`);

				// Process batch sequentially to maintain order
				for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
					// Simple duplicate check (single instance per chain)
					if (await isBlockProcessed(blockNum)) {
						console.log(`⏭️ Block ${blockNum} already processed, skipping`);
						continue; // Already processed
					}

					try {
						console.log(`📜 Historical processing block: ${blockNum}`);
						await processBlock(blockNum);

						// Mark as processed in Redis
						await markBlockProcessed(blockNum);

						// Update Redis persistence (always update with latest processed block)
						await updateLastProcessedBlock(blockNum);
						lastProcessedBlock = blockNum; // Update local variable for loop

					} catch (error) {
						console.error(`Error processing historical block ${blockNum}:`, error);
						captureException(error);
						// Continue with next block
					}
				}

				// Small delay between batches to not overwhelm the RPC
				await new Promise(resolve => setTimeout(resolve, getChainDelay()));
			}

			console.log(`✅ Historical catch-up completed. Current lastProcessedBlock: ${lastProcessedBlock}`);

		} catch (error) {
			console.error("Error in historical processing:", error);
			captureException(error);
		} finally {
			isProcessingHistorical = false;
		}
	}

	// Process individual block
	async function processBlock(blockNumber) {
		try {
			// Get all logs for the block
			const logs = await web3.eth.getPastLogs({
				fromBlock: blockNumber,
				toBlock: blockNumber
			});
			for (const log of logs) {
				await processLogs(log);
			}
		} catch (error) {
			console.error(`Error processing block ${blockNumber}:`, error);
		}
	}

	// Process individual log entry
	async function processLogs(log) {
		try {
			const eventKey = `${log.topics[0]}-${log.address.toLowerCase()}`;

			// O(1) lookup in event handler registry
			const handler = eventHandlers.get(eventKey);

			if (handler) {
				// Handle specific contract events (POD, Revenants, Staking, etc.)
				await handler(log);
			} else if (Secrets.TRANSFER_TOPIC && log.topics[0] === Secrets.TRANSFER_TOPIC) {
				// Handle transfers from OTHER collections in nftCollection.json
				// (POD/Revenants are already handled above)
				await handleCollectionTransfer(log);
			}

		} catch (error) {
			console.error('Event processing error:', error);
		}
	}

	// ================================================================================================
	// MAIN SUBSCRIPTION LOGIC
	// ================================================================================================

	async function subscribeToBlockNumber() {
		// Validate critical dependencies first
		validateCriticalDependencies();

		// Initialize Redis (optional, fails silently if not available)
		await initRedis();

		// Try to load last processed block from Redis (no memory storage)
		const redisLastBlock = await getLastProcessedBlock();
		if (redisLastBlock !== null) {
			console.log(`Resumed from Redis: last processed block ${redisLastBlock}`);
		} else {
			console.log(`No previous state found in Redis - starting fresh`);
		}

		// Build event handler registry and show configuration
		eventHandlers = buildEventHandlers();

		web3.eth
			.subscribe(
				'newBlockHeaders',
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (blockHeader) {
				try {
					const blockNumber = blockHeader.number;
					console.log(`🔥 New Block Mined ${blockNumber}`);

					// Initialize if first run (Redis-based check)
					const currentLastBlock = await getCurrentLastProcessedBlock();
					if (currentLastBlock === null) {
						// First run - initialize Redis with previous block
						await updateLastProcessedBlock(blockNumber - 1);
						console.log(`🎯 Initialized Redis with block ${blockNumber - 1}`);
					}

					// 🎯 INTELLIGENT GAP DETECTION AND PROCESSING
					await handleBlockWithGapDetection(blockNumber);

				} catch (error) {
					console.error('FATAL: Error processing block data:', error);
					captureException(error);
					// Don't exit here - let individual block processing handle errors
				}
			})
			.on('error', (error) => {
				console.error('FATAL: WebSocket subscription error:', error);
				captureException(error);
				// Exit process to prevent zombie state - PM2 will restart
				process.exit(1);
			});
	}

	// ================================================================================================
	// MODULE EXPORTS
	// ================================================================================================

	const startProcessing = async () => {
		try {
			await subscribeToBlockNumber();
		} catch (error) {
			console.error('Fatal error in startProcessing:', error);
			captureException(error);
		}
	};

	module.exports = {
		startProcessing
	};
})();