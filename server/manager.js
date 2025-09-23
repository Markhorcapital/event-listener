/** @format */

// ================================================================================================
// IMPORTS & DEPENDENCIES
// ================================================================================================
const { captureException } = require('@sentry/node');
const { web3 } = require('../config/web3Instance');
const { web3Historical, initHistoricalWeb3 } = require('../config/web3HistoricalInstance');
const { initRedis } = require('../config/redisInstance');
const {
	setLastProcessedBlock,
	getLastProcessedBlock,
	getCurrentLastProcessedBlock,
	setRealtimeProcessedBlock,
	setHistoricalProcessedBlock,
	getRealtimeProcessedBlock,
	getHistoricalProcessedBlock,
	setHistoricalRange,
	getHistoricalRange,
	clearHistoricalProcessing
} = require('./utils/redisBlockStorage');
const {
	getChainBatchSize,
	getChainDelay,
	getHistoricalDelay,
	validateCriticalDependencies,
	buildEventHandlers,
	handleCollectionTransfer
} = require('./utils/utils');

// ================================================================================================
// MAIN EVENT LISTENER LOGIC
// ================================================================================================
(async () => {
	const { Secrets } = require('./utils/secrets');

	// 🚀 SIMPLIFIED STATE: Minimal memory usage
	let eventHandlers = new Map();          // Event handler registry (built once)
	let isProcessingHistorical = false;    // Background processing flag

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
	// SIMPLIFIED BLOCK PROCESSING - NO GAP DETECTION
	// ================================================================================================

	// 🎯 DUAL TRACKING: Process current block + handle gaps with separate tracking
	async function handleNewBlock(newBlockNumber) {
		try {
			// Get real-time processed block from Redis
			const lastRealtimeBlock = await getRealtimeProcessedBlock();

			if (lastRealtimeBlock === null) {
				// First run - process current block only
				console.log(`🎯 First run: processing block ${newBlockNumber}`);
				await processCurrentBlock(newBlockNumber);
				return;
			}

			const gap = newBlockNumber - lastRealtimeBlock - 1;

			if (gap === 0) {
				// ✅ NO GAP: Process normally
				// console.log(`✅ No gap detected, processing block ${newBlockNumber}`);
				await processCurrentBlock(newBlockNumber);
			} else if (gap > 0) {
				// 🚀 GAP DETECTED: Process current block first, then start background catch-up
				console.log(`🔄 Gap detected (${gap} blocks), processing current block first`);

				// Process current block immediately (real-time priority)
				await processCurrentBlock(newBlockNumber);

				// Check if historical processing is needed and not already running
				const historicalRange = await getHistoricalRange();
				if (!historicalRange && !isProcessingHistorical) {
					// 🚀 NON-BLOCKING: Start historical processing in background
					startHistoricalProcessing(lastRealtimeBlock + 1, newBlockNumber - 1)
						.catch(error => {
							console.error('Background historical processing error:', error);
							captureException(error);
						});
				} else if (historicalRange && !isProcessingHistorical) {
					// 🚀 NON-BLOCKING: Resume historical processing in background
					// console.log(`🔄 Resuming historical processing from Redis state`);
					const historicalBlock = await getHistoricalProcessedBlock() || historicalRange.startBlock - 1;
					resumeHistoricalProcessing(historicalBlock + 1, historicalRange.endBlock)
						.catch(error => {
							console.error('Background resumed historical processing error:', error);
							captureException(error);
						});
				}
			}

		} catch (error) {
			console.error(`Error handling block ${newBlockNumber}:`, error);
			captureException(error);
		}
	}

	// 🎯 Process current block and update real-time Redis
	async function processCurrentBlock(blockNumber) {
		try {
			await processBlock(blockNumber);

			// Update Redis with real-time block
			await setRealtimeProcessedBlock(blockNumber);

		} catch (error) {
			console.error(`Error processing current block ${blockNumber}:`, error);
			captureException(error);
		}
	}

	// 🚀 START: New historical processing with Redis tracking
	async function startHistoricalProcessing(startBlock, endBlock) {
		if (isProcessingHistorical) {
			return; // Already running
		}

		isProcessingHistorical = true;
		// console.log(`🔄 Starting historical processing: blocks ${startBlock} to ${endBlock}`);

		try {
			// Store the range in Redis for restart recovery
			await setHistoricalRange(startBlock, endBlock);

			await processHistoricalRange(startBlock, endBlock);

		} catch (error) {
			console.error("Error in historical processing:", error);
			captureException(error);
		} finally {
			isProcessingHistorical = false;
		}
	}

	// 🔄 RESUME: Resume historical processing after restart
	async function resumeHistoricalProcessing(startBlock, endBlock) {
		if (isProcessingHistorical) {
			return; // Already running
		}

		isProcessingHistorical = true;
		// console.log(`🔄 Resuming historical processing: blocks ${startBlock} to ${endBlock}`);

		try {
			await processHistoricalRange(startBlock, endBlock);

		} catch (error) {
			console.error("Error in resumed historical processing:", error);
			captureException(error);
		} finally {
			isProcessingHistorical = false;
		}
	}

	// 🔄 CORE: Process historical range with Redis progress tracking
	async function processHistoricalRange(startBlock, endBlock) {
		const batchSize = getChainBatchSize();

		// 🚨 CIRCUIT BREAKER: Prevent processing extremely large gaps
		const totalBlocks = endBlock - startBlock + 1;
		const MAX_BLOCKS = 50000; // Maximum 50k blocks per session (conservative)

		if (totalBlocks > MAX_BLOCKS) {
			// console.warn(`🚨 Large gap detected: ${totalBlocks} blocks. Processing first ${MAX_BLOCKS} blocks only.`);
			endBlock = startBlock + MAX_BLOCKS - 1;

			// Update the range in Redis to reflect the limited processing
			await setHistoricalRange(startBlock, endBlock);
		}

		for (let blockNum = startBlock; blockNum <= endBlock; blockNum += batchSize) {
			const batchEnd = Math.min(blockNum + batchSize - 1, endBlock);

			// console.log(`📦 Processing historical batch: ${blockNum} to ${batchEnd}`);

			// 🚀 OPTIMIZATION: Check real-time progress only once per batch (not per block)
			const currentRealtimeBlock = await getRealtimeProcessedBlock();
			if (currentRealtimeBlock && blockNum >= currentRealtimeBlock) {
				// console.log(`🎯 Historical batch ${blockNum} caught up by real-time (${currentRealtimeBlock}), stopping historical processing`);
				await clearHistoricalProcessing();
				return;
			}

			// 🚀 OPTIMIZED: Process entire batch in single RPC call
			try {
				// Skip if already caught up (check without Redis call)
				if (currentRealtimeBlock && blockNum >= currentRealtimeBlock) {
					// console.log(`🎯 Historical batch ${blockNum}-${batchEnd} already processed by real-time, skipping`);
					continue;
				}

				// Process entire batch with single RPC call
				await processBatchBlocks(blockNum, batchEnd, true);

				// Update historical progress in Redis
				await setHistoricalProcessedBlock(batchEnd);

				// Shorter delay since we're processing more blocks per call
				await new Promise(resolve => setTimeout(resolve, getHistoricalDelay()));

			} catch (error) {
				console.error(`Error processing historical batch ${blockNum}-${batchEnd}:`, error);
				captureException(error);
			}

			// Delay between batches
			await new Promise(resolve => setTimeout(resolve, getChainDelay()));
		}

		console.log(`✅ Historical processing completed: blocks ${startBlock} to ${endBlock}`);

		// Clear historical processing data from Redis
		await clearHistoricalProcessing();
	}


	// ================================================================================================
	// CORE PROCESSING FUNCTIONS
	// ================================================================================================



	// 🚀 REAL-TIME: Process single block using real-time Web3 instance
	async function processBlock(blockNumber, useHistorical = false) {
		try {
			const web3Instance = useHistorical ? web3Historical : web3;
			const logPrefix = useHistorical ? '📜' : '⚡';

			if (!web3Instance) {
				// console.error(`❌ Web3 instance not available (historical: ${useHistorical})`);
				return;
			}

			// Get all logs for the block
			const logs = await web3Instance.eth.getPastLogs({
				fromBlock: blockNumber,
				toBlock: blockNumber
			});

			// console.log(`${logPrefix} Block ${blockNumber}: Found ${logs.length} logs`);

			for (const log of logs) {
				await processLogs(log);
			}
		} catch (error) {
			console.error(`Error processing block ${blockNumber} (historical: ${useHistorical}):`, error);
			captureException(error);
		}
	}

	// 🚀 OPTIMIZED: Process multiple blocks in single RPC call
	async function processBatchBlocks(startBlock, endBlock, useHistorical = true) {
		try {
			const web3Instance = useHistorical ? web3Historical : web3;

			if (!web3Instance) {
				// console.error(`❌ Web3 instance not available (historical: ${useHistorical})`);
				return [];
			}

			const totalBlocks = endBlock - startBlock + 1;

			// Single RPC call for entire batch
			const startTime = Date.now();
			const logs = await web3Instance.eth.getPastLogs({
				fromBlock: startBlock,
				toBlock: endBlock
			});
			const endTime = Date.now();


			// 📊 DETAILED LOGGING: Show block-by-block breakdown
			const blockLogCounts = {};
			logs.forEach(log => {
				const blockNum = parseInt(log.blockNumber, 16);
				blockLogCounts[blockNum] = (blockLogCounts[blockNum] || 0) + 1;
			});
			for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
				const logCount = blockLogCounts[blockNum] || 0;
			}

			// 🚀 MEMORY OPTIMIZATION: Process logs in chunks to prevent memory explosion
			const CHUNK_SIZE = 1000; // Process 1000 logs at a time

			if (logs.length > CHUNK_SIZE) {
				// console.log(`📦 🔄 Large batch detected (${logs.length} logs), processing in chunks of ${CHUNK_SIZE}`);

				for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
					const chunk = logs.slice(i, i + CHUNK_SIZE);
					for (const log of chunk) {
						await processLogs(log);
					}

					// Small delay between chunks to prevent memory buildup
					if (i + CHUNK_SIZE < logs.length) {
						await new Promise(resolve => setTimeout(resolve, 10));
					}
				}
			} else {
				// console.log(`📦 🔄 Processing all ${logs.length} logs from ${totalBlocks} blocks`);
				for (const log of logs) {
					await processLogs(log);
				}
			}

			return logs;
		} catch (error) {
			console.error(`Error processing batch ${startBlock}-${endBlock}:`, error);
			captureException(error);

			// Fallback: Process individually if batch fails
			console.log(`🔄 Falling back to individual block processing for ${startBlock}-${endBlock}`);
			for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
				await processBlock(blockNum, useHistorical);
			}
			return [];
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

		// Initialize historical Web3 instance
		initHistoricalWeb3();

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

					// 🎯 SIMPLIFIED: Always process current block
					await handleNewBlock(blockNumber);

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