/** @format */
const { captureException } = require('@sentry/node');
const { web3 } = require('../config/web3Instance');
const { initRedis } = require('../config/redisInstance');
const {
	setLastProcessedBlock,
	getLastProcessedBlock
} = require('./utils/redisBlockStorage');
const {
	sendEventToSQS,
	decodeLog,
	transformSubscriptionEvents,
	sendEventToNftSQS,
	sendEventToTransferSQS,
	readData,
	saveDataToFile,
	deleteNFT
} = require('./utils/utils');

(async () => {
	const { Secrets } = require('./utils/secrets');
	const {
		NFT_STAKING_ADDRESS,
		NFT_STAKED_TOPIC,
		NFT_UNSTAKED_TOPIC,
		ALI_STAKING_ADDRESS,
		TOKEN_DEPOSITED_TOPIC,
		TOKEN_WITHDRAWN_TOPIC,
		REWARD_SYSTEM_CONTRACT,
		ROOT_CHANGED_TOPIC,
		ERC20_REWARD_CLAIMED,
		INTELLILINKER_ADDRESS,
		NFT_LINKED_TOPIC,
		NFT_UNLINKED_TOPIC,
		TRANSFER_TOPIC,
		POD_ADDRESS,
		REVENANTS_ADDRESS,
		INTELLIGENTNFT_V2
	} = Secrets;

	let FILE_NAME = "nftCollection.json";
	let lastProcessedBlock = null;
	const processEvent = async (event) => {
		try {
			if (event) {
				await sendEventToSQS(event);
			}
		} catch (err) {
			console.error('Fatal error: Error sending message to SQS:', err);
			captureException(err);
		}
	};
	const processTransferEvent = async (event) => {
		try {
			if (event) {
				await sendEventToTransferSQS(event);
			}
		} catch (err) {
			console.error('Fatal error: Error sending message to SQS:', err);
			captureException(err);
		}
	};
	const processNftEvent = async (event) => {
		try {
			if (event) {
				await sendEventToNftSQS(event);
			}
		} catch (err) {
			console.error('Fatal error: Error sending message to SQS:', err);
			captureException(err);
		}
	};

	async function subscribeToBlockNumber() {
		// Initialize Redis (optional, fails silently if not available)
		await initRedis();

		// Try to load last processed block from Redis
		const redisLastBlock = await getLastProcessedBlock();
		if (redisLastBlock !== null) {
			lastProcessedBlock = redisLastBlock;
			console.log(`Resumed from Redis: last processed block ${lastProcessedBlock}`);
		}

		var subscription = web3.eth
			.subscribe(
				'newBlockHeaders',
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (blockHeader) {
				let blockNumber = blockHeader.number;
				console.log("New Block Mined", blockNumber);
				if (lastProcessedBlock === null) {
					lastProcessedBlock = blockNumber - 1;
				}
				for (let blockNum = lastProcessedBlock + 1; blockNum <= blockNumber; blockNum++) {
					console.log("Processing Block:", blockNum)
					await processBlock(blockNum);
					lastProcessedBlock = blockNum;

					// Store in Redis (fails silently if Redis not available)
					await setLastProcessedBlock(lastProcessedBlock);
				}

			})
			.on('error', console.error);
	}

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
	async function processLogs(log) {
		try {
			const eventKey = `${log.topics[0]}-${log.address.toLowerCase()}`;

			switch (eventKey) {
				case `${TRANSFER_TOPIC}-${POD_ADDRESS.toLowerCase()}`:
					await handleTransferEvent(log, [NFT_STAKING_ADDRESS, INTELLIGENTNFT_V2]);
					break;

				case `${NFT_LINKED_TOPIC}-${INTELLILINKER_ADDRESS.toLowerCase()}`:
					await handleNftLinkedEvent(log);
					break;

				case `${NFT_UNLINKED_TOPIC}-${INTELLILINKER_ADDRESS.toLowerCase()}`:
					await handleNftUnLinkedEvent(log);
					break;

				case `${TRANSFER_TOPIC}-${REVENANTS_ADDRESS.toLowerCase()}`:
					await handleTransferEvent(log);
					break;

				case `${NFT_STAKED_TOPIC}-${NFT_STAKING_ADDRESS.toLowerCase()}`:
					await handleNftEvent(log);
					break;

				case `${NFT_UNSTAKED_TOPIC}-${NFT_STAKING_ADDRESS.toLowerCase()}`:
					await handleNftEvent(log);
					break;

				case `${TOKEN_DEPOSITED_TOPIC}-${ALI_STAKING_ADDRESS.toLowerCase()}`:
					await handleGenericEvent(log);
					break;

				case `${TOKEN_WITHDRAWN_TOPIC}-${ALI_STAKING_ADDRESS.toLowerCase()}`:
					await handleGenericEvent(log);
					break;

				case `${ROOT_CHANGED_TOPIC}-${REWARD_SYSTEM_CONTRACT.toLowerCase()}`:
					await handleGenericEvent(log);
					break;

				case `${ERC20_REWARD_CLAIMED}-${REWARD_SYSTEM_CONTRACT.toLowerCase()}`:
					await handleGenericEvent(log);
					break;

				default:
					if (log.topics[0] === TRANSFER_TOPIC) {
						await handleCollectionTransfer(log);
					}
					break;
			}
		} catch (error) {
			console.error('Event processing error:', error);
		}
	}

	// Helper functions for each event type
	async function handleTransferEvent(log, excludeAddresses = []) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);
			if (!excludeAddresses.includes(eventData.events.Transfer.to)) {
				await processTransferEvent(eventData);
			}
		}
	}

	async function handleNftEvent(log) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);
			await processNftEvent(eventData);
		}
	}

	async function handleNftLinkedEvent(log) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);
			if (!(eventData.events.Linked.targetContract === REVENANTS_ADDRESS)) {
				saveDataToFile(
					eventData.events.Linked.targetContract,
					eventData.events.Linked.iNftId,
					eventData.events.Linked.targetId,
					FILE_NAME
				)
			}
			await processNftEvent(eventData);
		}
	}
	async function handleNftUnLinkedEvent(log) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);
			deleteNFT(
				eventData.events.Unlinked.iNftId,
				FILE_NAME
			)
			await processNftEvent(eventData);
		}
	}

	async function handleGenericEvent(log) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);
			await processEvent(eventData);
		}
	}

	async function handleCollectionTransfer(log) {
		const decodedLog = await decodeLog(log);
		const existingNFTs = readData(FILE_NAME);

		if (decodedLog && !decodedLog.error && existingNFTs.length > 0) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);

			const matchingNFTs = existingNFTs.filter(nft =>
				nft.collectionAddress.toLowerCase() === eventData.contractAddress.toLowerCase() &&
				nft.tokenId === eventData.events.Transfer.tokenId
			);
			if (matchingNFTs.length > 0 &&
				![NFT_STAKING_ADDRESS, INTELLIGENTNFT_V2].includes(eventData.events.Transfer.to)) {
				await processTransferEvent(eventData);
			}
		}
	}

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