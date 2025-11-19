/** @format */

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { Secrets } = require('../../server/utils/secrets');
const { web3 } = require('../../config/web3Instance');
const { captureException } = require('@sentry/node');
const fs = require('fs');
const { connectDB, mongoose } = require('../../config/mongooseInstance');
const Token = require('../../models/token');

(async () => {
	const {
		AWS_REGION,
		CHAIN_ID,
		TRANSFER_HANDLER_SQS,
		AWS_SECRET_ACCESS_KEY,
		AWS_ACCESS_KEY_ID
	} = Secrets;

	const sqs = new SQSClient({
		region: AWS_REGION,
		credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
	});

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

	async function sendEventToTransferSQS(eventData) {
		// Create unique deduplication ID based on transaction hash and log index
		const deduplicationId = `${eventData.transactionHash}-${eventData.events.Transfer.from}-${eventData.events.Transfer.to}`
			? `${eventData.transactionHash}-${eventData.logIndex || 0}`
			: `transfer-${Date.now()}`;

		const params = {
			MessageBody: JSON.stringify(eventData),
			QueueUrl: TRANSFER_HANDLER_SQS,
			MessageGroupId: eventData.contractAddress || 'transfer-events', // Required for FIFO queues
			MessageDeduplicationId: deduplicationId // Prevents duplicate messages in FIFO queues
		};
		await sqs.send(new SendMessageCommand(params));
		console.log(
			"data added to TRANSFER_HANDLER_SQS",
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

			// Handling transfer event
			case 'Transfer': {
				jsonData = await transferEventsHandler(decodedEvent, eType, jsonData, event);
				break;
			}

			default:
				console.error(`Error: Unsupported event type ${eType}`);
				return null; // Or handle this case as needed
		}


		return jsonData;
	}

	async function transferEventsHandler(decodedEvent, eType, jsonData, event) {
		const block = await web3.eth.getBlock(event.blockNumber);
		// Ensure that all expected fields are present
		const expectedFields = [
			'from',
			'to',
			'value'
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
			from: decodedEvent.decodedParameters.from,
			to: decodedEvent.decodedParameters.to,
			value: decodedEvent.decodedParameters.value,
			timestamp: block.timestamp.toString()
		};
		return jsonData;
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

	function getHistoricalDelay() {
		const chainId = parseInt(Secrets.CHAIN_ID);
		return CHAIN_CONFIG.historicalDelays[chainId] || CHAIN_CONFIG.defaults.historicalDelay;
	}

	// 🛡️ STARTUP VALIDATION
	function validateCriticalDependencies() {
		const { web3 } = require('../../config/web3Instance');

		// Check Web3 connection
		if (!web3 || !web3.eth) {
			throw new Error('FATAL: Web3 connection not available');
		}


	}

	// ================================================================================================
	// EVENT HANDLER FUNCTIONS
	// ================================================================================================

	// Helper functions for each event type
	async function handleTransferEvent(log) {
		const decodedLog = await decodeLog(log);
		if (decodedLog && !decodedLog.error) {
			const eventData = await transformSubscriptionEvents(
				decodedLog,
				log,
				decodedLog.eventName
			);

			// Token validation is now done in manager.js before calling this function
			await processTransferEvent(eventData);
		}
	}


	// ================================================================================================
	// SQS EVENT PROCESSORS
	// ================================================================================================


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

	// Cache for token addresses to avoid repeated database queries
	let cachedTokenAddresses = null;
	let lastTokenCacheTime = 0;
	const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	// Load token addresses from database
	async function loadTokenAddresses() {
		try {
			const now = Date.now();

			// Return cached addresses if still valid
			if (cachedTokenAddresses && (now - lastTokenCacheTime) < TOKEN_CACHE_DURATION) {
				return cachedTokenAddresses;
			}

			// Check if database is already connected, otherwise establish connection
			let connection = null;
			if (mongoose.connection.readyState === 1) {
				// Already connected, reuse existing connection
				connection = mongoose.connection;
			} else {
				// Not connected, establish new connection
				connection = await connectDB();
				if (!connection) {
					console.warn('⚠️  Database not available, skipping token address loading');
					return [];
				}
			}

			// Get current chain ID from secrets
			const currentChainId = CHAIN_ID;

			// Query tokens for current chain
			const tokens = await Token.find({ chainId: currentChainId }).select('address').lean();
			const addresses = tokens.map(token => web3.utils.toChecksumAddress(token.address));

			// Update cache
			cachedTokenAddresses = addresses;
			lastTokenCacheTime = now;

			// console.log(`📋 Loaded ${addresses.length} token addresses from database`);
			return addresses;
		} catch (error) {
			console.error('❌ Error loading token addresses:', error);
			return [];
		}
	}

	// Check if an address is a tracked token
	async function isTrackedToken(eventAddress) {
		const tokenAddresses = await loadTokenAddresses();
		const eventAddressChecksum = web3.utils.toChecksumAddress(eventAddress);
		return tokenAddresses.some(addr => addr === eventAddressChecksum);
	}

	module.exports = {
		// Configuration Utilities (used by manager.js)
		getChainBatchSize,
		getChainDelay,
		getHistoricalDelay,
		validateCriticalDependencies,
		handleTransferEvent,
		loadTokenAddresses,
		isTrackedToken,
		APP_CONFIG
	};
})();
