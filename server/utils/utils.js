/** @format */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { Secrets } = require('../../server/utils/secrets');
const { web3 } = require('../../config/web3Instance');
const { captureException } = require('@sentry/node');
const fs = require('fs');

(async () => {
	const {
		AWS_REGION,
		HIVE_EVENT_HANDLER_SQS,
		NFT_STAKED_TOPIC,
		NFT_UNSTAKED_TOPIC,
		TOKEN_DEPOSITED_TOPIC,
		TOKEN_WITHDRAWN_TOPIC,
		ROOT_CHANGED_TOPIC,
		ERC20_REWARD_CLAIMED,
		CHAIN_ID,
		NFT_LINKED_TOPIC,
		NFT_UNLINKED_TOPIC,
		TRANSFER_TOPIC,
		NFT_EVENT_HANDLER_SQS,
		NFT_TRANSFER_HANDLER_SQS
	} = Secrets;

	const sqs = new SQSClient({ region: AWS_REGION });

	// Import centralized configuration
	const { CONTRACT_CONFIG, CHAIN_CONFIG, APP_CONFIG } = require('../../config/config');

	// 🚀 AUTOMATIC ABI MAPPING BUILDER
	// Builds ABI mappings from CONTRACT_CONFIG automatically
	const eventABIMap = {};

	function buildABIMapping() {
		CONTRACT_CONFIG.forEach(contract => {
			contract.events.forEach(event => {
				const topic = event.topic();
				if (topic && event.abi) {
					eventABIMap[topic] = event.abi.find((e) => e.name === event.eventName);
				}
			});
		});
	}

	// Build ABI mapping on initialization
	buildABIMapping();


	async function sendEventToSQS(eventData) {
		const params = {
			MessageBody: JSON.stringify(eventData),
			QueueUrl: HIVE_EVENT_HANDLER_SQS,
		};
		await sqs.send(new SendMessageCommand(params));
		console.log(
			"data added to HIVE_EVENT_HANDLER_SQS",
			JSON.stringify(eventData, null, 2)
		);
	}
	async function sendEventToTransferSQS(eventData) {
		const params = {
			MessageBody: JSON.stringify(eventData),
			QueueUrl: NFT_TRANSFER_HANDLER_SQS,
		};
		await sqs.send(new SendMessageCommand(params));
		console.log(
			"data added to NFT_TRANSFER_HANDLER_SQS",
			JSON.stringify(eventData, null, 2)
		);
	}
	async function sendEventToNftSQS(eventData) {
		const params = {
			MessageBody: JSON.stringify(eventData),
			QueueUrl: NFT_EVENT_HANDLER_SQS,
		};
		await sqs.send(new SendMessageCommand(params));
		console.log(
			"data added to NFT_EVENT_HANDLER_SQS",
			JSON.stringify(eventData, null, 2)
		);
	}

	// decoding subscription logs
	async function decodeLog(log) {
		const eventSignatureHash = log.topics[0];
		const eventAbi = eventABIMap[eventSignatureHash];

		if (eventAbi) {
			// Check if the number of topics matches the number of indexed parameters in the ABI
			const indexedInputs = eventAbi.inputs.filter((input) => input.indexed);
			if (log.topics.length - 1 !== indexedInputs.length) {
				// console.log('Skipping log due to abi mismatch');
				return { error: 'Parameter mismatch' };
			}

			try {
				const decodedParameters = await web3.eth.abi.decodeLog(
					eventAbi.inputs,
					log.data,
					log.topics.slice(1)
				);
				return {
					eventName: eventAbi.name,
					decodedParameters
				};
			} catch (error) {
				console.error('Error decoding log:', error);
				captureException(error);
				return { error: 'Error decoding log' };
			}
		} else {
			return { error: 'Unknown event type' };
		}
	}

	async function transformSubscriptionEvents(decodedEvent, event, eType) {
		let jsonData = {
			eventType: eType,
			contractAddress: event.address,
			blockNumber: event.blockNumber,
			chainId: parseInt(CHAIN_ID, 10),
			transactionHash: event.transactionHash,
			events: {}
		};

		switch (eType) {
			// Handling Staked and Unstaked events
			case "Staked": {
				jsonData = await stakingEventsHandler(decodedEvent, eType, jsonData);
				break;
			}

			case "Unstaked": {
				jsonData = await stakingEventsHandler(decodedEvent, eType, jsonData);
				break;
			}

			// Handling Linked event
			case 'Linked': {
				jsonData = await linkedEventsHandler(decodedEvent, eType, jsonData);
				break;
			}

			// Handling Unlinked event
			case 'Unlinked': {
				jsonData = await unlinkedEventsHandler(decodedEvent, eType, jsonData);
				break;
			}

			// Handling transfer event
			case 'Transfer': {
				jsonData = await transferEventsHandler(decodedEvent, eType, jsonData, event);
				break;
			}

			// Handling TokenDeposited event
			case 'TokenDeposited': {
				jsonData = await tokenDepositedEventHandler(
					decodedEvent,
					eType,
					jsonData
				);
				break;
			}

			// Handling TokenWithdrawn event
			case 'TokenWithdrawn': {
				jsonData = await tokenWithdrawnEventHandler(
					decodedEvent,
					eType,
					jsonData
				);
				break;
			}
			// Handling RootChanged event
			case 'RootChanged': {
				jsonData = await rootChangedEventHandler(decodedEvent, eType, jsonData);
				break;
			}

			// Handling ERC20RewardClaimed event
			case 'ERC20RewardClaimed': {
				jsonData = await erc20RewardClaimedEventHandler(
					decodedEvent,
					eType,
					jsonData
				);
				break;
			}

			default:
				console.error(`Error: Unsupported event type ${eType}`);
				return null; // Or handle this case as needed
		}

		// 📋 LOG ALL TRANSFORMED EVENT DATA
		console.log("🎯 TRANSFORMED EVENT DATA:", JSON.stringify(jsonData, null, 2));

		return jsonData;
	}

	async function transferEventsHandler(decodedEvent, eType, jsonData, event) {
		const block = await web3.eth.getBlock(event.blockNumber);
		// Ensure that all expected fields are present
		const expectedFields = [
			'_from',
			'_to',
			'_tokenId'
		];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error('Error: Missing fields in decoded parameters for transfer');
			return null; // Or handle this case as needed
		}

		// Store the event data for Staked and Unstaked
		jsonData.events[eType] = {
			from: decodedEvent.decodedParameters._from,
			to: decodedEvent.decodedParameters._to,
			tokenId: decodedEvent.decodedParameters._tokenId,
			timestamp: block.timestamp.toString()
		};
		return jsonData;
	}

	async function stakingEventsHandler(decodedEvent, eType, jsonData) {
		// Ensure that all expected fields are present
		const expectedFields = ['_by', '_tokenId', '_when'];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error(
				'Error: Missing fields in decoded parameters for Staked/Unstaked'
			);
			return null; // Or handle this case as needed
		}

		// Store the event data for Staked and Unstaked
		jsonData.events[eType] = {
			by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
			tokenId: parseInt(decodedEvent.decodedParameters._tokenId, 10), // Token ID involved
			timestamp: decodedEvent.decodedParameters._when // Timestamp when the action occurred
		};
		return jsonData;
	}

	async function linkedEventsHandler(decodedEvent, eType, jsonData) {
		// Ensure that all expected fields are present
		const expectedFields = [
			'_by',
			'_iNftId',
			'_linkPrice',
			'_linkFee',
			'_personalityContract',
			'_personalityId',
			'_targetContract',
			'_targetId'
		];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error('Error: Missing fields in decoded parameters for linked');
			return null; // Or handle this case as needed
		}

		// Store the event data for Staked and Unstaked
		jsonData.events[eType] = {
			by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
			iNftId: decodedEvent.decodedParameters._iNftId.toString(), // Token ID involved
			linkPrice: decodedEvent.decodedParameters._linkPrice, // Timestamp when the action occurred
			linkFee: decodedEvent.decodedParameters._linkFee,
			personalityContract: decodedEvent.decodedParameters._personalityContract,
			personalityId: decodedEvent.decodedParameters._personalityId,
			targetContract: decodedEvent.decodedParameters._targetContract,
			targetId: decodedEvent.decodedParameters._targetId
		};
		return jsonData;
	}

	async function unlinkedEventsHandler(decodedEvent, eType, jsonData) {
		// Ensure that all expected fields are present
		const expectedFields = ['_by', '_iNftId'];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error('Error: Missing fields in decoded parameters for Unlinked');
			return null; // Or handle this case as needed
		}

		// Store the event data for Staked and Unstaked
		jsonData.events[eType] = {
			by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
			iNftId: decodedEvent.decodedParameters._iNftId // Token ID involvedˇ
		};
		return jsonData;
	}

	async function tokenDepositedEventHandler(decodedEvent, eType, jsonData) {
		const expectedFields = [
			'depositToken',
			'depositOwner',
			'depositAmount',
			'depositDuration',
			'account'
		];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error(
				'Error: Missing fields in decoded parameters for TokenDeposited'
			);
			return null; // Handle this case as needed
		}

		// Store the event data for TokenDeposited
		const account = decodedEvent.decodedParameters.account;

		if (
			!account ||
			!(
				'amountLocked' in account &&
				'maturesOn' in account &&
				'lastUpdatedOn' in account &&
				'createdOn' in account
			)
		) {
			console.error(
				"Error: Missing fields in 'account' struct for TokenDeposited"
			);
			return null;
		}

		jsonData.events[eType] = {
			depositToken: decodedEvent.decodedParameters.depositToken, // Token address
			depositOwner: decodedEvent.decodedParameters.depositOwner, // Address of the deposit owner
			depositAmount: decodedEvent.decodedParameters.depositAmount, // Amount transferred
			depositDuration: decodedEvent.decodedParameters.depositDuration, // Duration in seconds
			account: {
				amountLocked: account.amountLocked, // Amount locked in the contract (Wei)
				maturesOn: account.maturesOn, // Timestamp when tokens can be unlocked
				lastUpdatedOn: account.lastUpdatedOn, // Last update timestamp
				createdOn: account.createdOn // Account creation timestamp
			}
		};
		// console.log('Transformed data:', JSON.stringify(jsonData, null, 2)); // Log the full data
		return jsonData;
	}

	async function tokenWithdrawnEventHandler(decodedEvent, eType, jsonData) {
		const expectedFields = ['depositToken', 'depositOwner', 'to', 'account'];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error(
				'Error: Missing fields in decoded parameters for TokenWithdrawn'
			);
			return null; // Handle this case as needed
		}

		// Store the event data for TokenWithdrawn
		const account = decodedEvent.decodedParameters.account;

		if (
			!account ||
			!(
				'amountLocked' in account &&
				'maturesOn' in account &&
				'lastUpdatedOn' in account &&
				'createdOn' in account
			)
		) {
			console.error(
				"Error: Missing fields in 'account' struct for TokenWithdrawn"
			);
			return null;
		}

		jsonData.events[eType] = {
			depositToken: decodedEvent.decodedParameters.depositToken, // Token address
			depositOwner: decodedEvent.decodedParameters.depositOwner, // Address of the deposit owner
			to: decodedEvent.decodedParameters.to, // Address the tokens were sent to
			account: {
				amountLocked: account.amountLocked, // Amount locked in the contract (Wei)
				maturesOn: account.maturesOn, // Timestamp when tokens can be unlocked
				lastUpdatedOn: account.lastUpdatedOn, // Last update timestamp
				createdOn: account.createdOn // Account creation timestamp
			}
		};
		// console.log('Transformed data:', JSON.stringify(jsonData, null, 2)); // Log the full data
		return jsonData;
	}

	async function rootChangedEventHandler(decodedEvent, eType, jsonData) {
		const expectedFields = ['by', 'root'];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error(
				'Error: Missing fields in decoded parameters for RootChanged'
			);
			return null;
		}

		jsonData.events[eType] = {
			by: decodedEvent.decodedParameters.by, // Address of the user who changed the root
			root: decodedEvent.decodedParameters.root // New Merkle root (bytes32)
		};
		// console.log(
		// 	'Transformed data for RootChanged:',
		// 	JSON.stringify(jsonData, null, 2)
		// );
		return jsonData;
	}

	async function erc20RewardClaimedEventHandler(decodedEvent, eType, jsonData) {
		const expectedFields = ['rewardToken', 'user', 'amount'];
		const hasAllFields = expectedFields.every(
			(field) => field in decodedEvent.decodedParameters
		);

		if (!hasAllFields) {
			console.error(
				'Error: Missing fields in decoded parameters for ERC20RewardClaimed'
			);
			return null;
		}

		jsonData.events[eType] = {
			rewardToken: decodedEvent.decodedParameters.rewardToken, // Address of the reward token contract
			user: decodedEvent.decodedParameters.user, // Address of the user claiming the reward
			amount: decodedEvent.decodedParameters.amount.toString() // Claimed reward amount in wei (converted to string)
		};
		// console.log(
		// 	'Transformed data for ERC20RewardClaimed:',
		// 	JSON.stringify(jsonData, null, 2)
		// );
		return jsonData;
	}


	function loadExistingNFTs(NFT_FILE) {
		try {
			if (fs.existsSync(NFT_FILE)) {
				const data = fs.readFileSync(NFT_FILE, "utf8");
				const nfts = JSON.parse(data);
				nfts.forEach((nft) => {
					nftSet.add(`${nft.collectionAddress.toLowerCase()}_${nft.tokenId}`);
				});
				return nfts;
			}
			return [];
		} catch (err) {
			console.error("Error loading NFT file:", err);
			return [];
		}
	}

	function readData(fileName) {
		try {
			if (!fs.existsSync(fileName)) {
				// Create the file with default data
				const defaultData = [];
				fs.writeFileSync(fileName, JSON.stringify(defaultData, null, 4));
				console.log(`${fileName} created with default data.`);
			}
			// Read and parse the file content
			const fileContent = fs.readFileSync(fileName, "utf-8");
			const data = JSON.parse(fileContent);
			// console.log(data);

			return data;
		} catch (error) {
			console.log("Error read data from JSON file:", error);
		}
	}

	const saveDataToFile = (collectionAddress, iNftId, tokenId, filePath) => {
		try {
			const key = `${collectionAddress.toLowerCase()}_${tokenId}`;
			let nfts;
			const nftSet = new Set();
			if (fs.existsSync(filePath)) {
				const data = fs.readFileSync(filePath, "utf8");
				nfts = JSON.parse(data);
				nfts.forEach((nft) => {
					nftSet.add(`${nft.collectionAddress.toLowerCase()}_${nft.tokenId}`);
				});
			}
			const existingNFTs = nfts;
			if (nftSet.has(key)) {
				console.log(`Duplicate detected: ${collectionAddress} - ${tokenId}`);
				return false;
			}

			// Add new NFT
			const newNFT = {
				collectionAddress: collectionAddress.toLowerCase(),
				iNftId,
				tokenId,
				timestamp: new Date().toISOString(),
			};

			// Update in-memory set and file
			nftSet.add(key);
			existingNFTs.push(newNFT);

			// Save to file
			fs.writeFileSync(filePath, JSON.stringify(existingNFTs, null, 2));
			// console.log(`Saved new NFT: ${collectionAddress} - ${tokenId}`);
			return true;
		} catch (error) {
			console.log("Error saving data to JSON file:", error);
		}
	};

	function deleteNFT(tokenId, NFT_FILE) {
		const key = `${tokenId}`;
		// Load existing NFTs
		const nftSet = new Set();
		let nfts;
		if (fs.existsSync(NFT_FILE)) {
			const data = fs.readFileSync(NFT_FILE, 'utf8');
			nfts = JSON.parse(data);
			nfts.forEach(nft => {
				nftSet.add(`${nft.iNftId}`);
			});
		}
		const existingNFTs = nfts;
		if (!nftSet.has(key)) {
			console.log(`NFT not found: ${tokenId}`);
			return false;
		}

		// Filter out the NFT to delete
		const updatedNFTs = existingNFTs.filter(nft =>
			!(nft.iNftId === tokenId)
		);
		// Update in-memory set and file
		nftSet.delete(key);
		fs.writeFileSync(NFT_FILE, JSON.stringify(updatedNFTs, null, 2));
		return true;
	}


	// ================================================================================================
	// CONFIGURATION UTILITY FUNCTIONS
	// ================================================================================================

	// 🔗 CHAIN-SPECIFIC CONFIGURATIONS
	function getChainBatchSize() {
		const chainId = parseInt(Secrets.CHAIN_ID);
		return CHAIN_CONFIG.batchSizes[chainId] || CHAIN_CONFIG.defaults.batchSize;
	}

	function getChainDelay() {
		const chainId = parseInt(Secrets.CHAIN_ID);
		return CHAIN_CONFIG.delays[chainId] || CHAIN_CONFIG.defaults.delay;
	}

	// 🛡️ STARTUP VALIDATION
	function validateCriticalDependencies() {
		const { web3 } = require('../../config/web3Instance');

		// Check Web3 connection
		if (!web3 || !web3.eth) {
			throw new Error('FATAL: Web3 connection not available');
		}

		// Check if at least one contract is configured OR transfer monitoring is enabled
		const hasContracts = CONTRACT_CONFIG.some(contract => contract.address());
		if (!hasContracts && !APP_CONFIG.transferMonitoring.enabled()) {
			console.warn('⚠️  WARNING: No contracts configured and no transfer monitoring enabled');
			console.warn('⚠️  Event listener will run but process no events');
		}

		console.log('✅ Critical dependencies validated');
	}

	// 🚀 AUTOMATIC EVENT REGISTRY BUILDER
	function buildEventHandlers() {
		const eventHandlers = new Map();
		const activeContracts = [];

		CONTRACT_CONFIG.forEach(contract => {
			const address = contract.address();

			if (address) {
				let hasActiveEvents = false;

				contract.events.forEach(event => {
					const topic = event.topic();

					if (topic) {
						const eventKey = `${topic}-${address.toLowerCase()}`;

						// Get handler function by name
						const handlerFunction = getHandlerFunction(event.handler, event.excludeAddresses);
						eventHandlers.set(eventKey, handlerFunction);
						hasActiveEvents = true;
					}
				});

				if (hasActiveEvents) {
					activeContracts.push({ name: contract.name, address });
				}
			}
		});

		// Auto-generated logging
		console.log('=== ACTIVE CONTRACT CONFIGURATION ===');
		activeContracts.forEach(contract => {
			console.log(`✅ ${contract.name}: ${contract.address}`);
		});
		if (APP_CONFIG.transferMonitoring.enabled()) {
			console.log(`✅ Linked NFT Collections Transfer Monitoring: Enabled (from ${APP_CONFIG.nftCollectionFile})`);
		}
		console.log('======================================');
		console.log(`📋 Event Registry: ${eventHandlers.size} handlers registered`);

		return eventHandlers;
	}

	// Helper function to get handler functions dynamically
	function getHandlerFunction(handlerName, excludeAddresses) {
		const handlers = {
			handleNftEvent: (log) => handleNftEvent(log),
			handleGenericEvent: (log) => handleGenericEvent(log),
			handleNftLinkedEvent: (log) => handleNftLinkedEvent(log),
			handleNftUnLinkedEvent: (log) => handleNftUnLinkedEvent(log),
			handleTransferEvent: (log) => handleTransferEvent(log),
			handleTransferEventWithExclusions: (log) => handleTransferEvent(log, excludeAddresses ? excludeAddresses() : []),
			handleCollectionTransfer: (log) => handleCollectionTransfer(log)
		};

		return handlers[handlerName] || handlers.handleGenericEvent;
	}

	// ================================================================================================
	// EVENT HANDLER FUNCTIONS
	// ================================================================================================

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
			if (!(eventData.events.Linked.targetContract === Secrets.REVENANTS_ADDRESS)) {
				saveDataToFile(
					eventData.events.Linked.targetContract,
					eventData.events.Linked.iNftId,
					eventData.events.Linked.targetId,
					APP_CONFIG.nftCollectionFile
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
				APP_CONFIG.nftCollectionFile
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
		const existingNFTs = readData(APP_CONFIG.nftCollectionFile);

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
				![Secrets.NFT_STAKING_ADDRESS, Secrets.INTELLIGENTNFT_V2].filter(Boolean).includes(eventData.events.Transfer.to)) {
				await processTransferEvent(eventData);
			}
		}
	}

	// ================================================================================================
	// SQS EVENT PROCESSORS
	// ================================================================================================

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

	module.exports = {
		// Configuration Utilities (used by manager.js)
		getChainBatchSize,
		getChainDelay,
		validateCriticalDependencies,
		buildEventHandlers,
		handleCollectionTransfer,
		APP_CONFIG
	};
})();
