/** @format */
const { captureException } = require('@sentry/node');
const { web3 } = require('../config/web3Instance');
const {
	sendEventToSQS,
	decodeLog,
	transformSubscriptionEvents
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
		NFT_TRANSFER_TOPIC,
		POD_ADDRESS,
		REVENANTS_ADDRESS,
		INTELLILINKER_ADDRESS_V1
	} = Secrets;

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

	async function subscribeToAssetStakedEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: NFT_STAKING_ADDRESS,
					topics: [NFT_STAKED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				console.log('decodedLog', decodedLog);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAssetUnstakedEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: NFT_STAKING_ADDRESS,
					topics: [NFT_UNSTAKED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);

					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAssetLinkEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: INTELLILINKER_ADDRESS,
					topics: [NFT_LINKED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				console.log('decodedLog', decodedLog);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAssetLinkV1Events() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: INTELLILINKER_ADDRESS_V1,
					topics: [NFT_LINKED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				console.log('decodedLog', decodedLog);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAssetUnlinkEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: INTELLILINKER_ADDRESS,
					topics: [NFT_UNLINKED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);

					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToRevTransferEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: REVENANTS_ADDRESS,
					topics: [NFT_TRANSFER_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				console.log("REV log: ", log);
				const decodedLog = await decodeLog(log);
				console.log('REV decodedLog: ', decodedLog);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);

					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToPodTransferEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: POD_ADDRESS,
					topics: [NFT_TRANSFER_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAliStakeEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: ALI_STAKING_ADDRESS,
					topics: [TOKEN_DEPOSITED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToAliWithdrawnEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: ALI_STAKING_ADDRESS,
					topics: [TOKEN_WITHDRAWN_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}
	/// reward system
	async function subscribeToRootChangedEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: REWARD_SYSTEM_CONTRACT,
					topics: [ROOT_CHANGED_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToERC20RewardClaimedEvents() {
		var subscription = web3.eth
			.subscribe(
				'logs',
				{
					address: REWARD_SYSTEM_CONTRACT,
					topics: [ERC20_REWARD_CLAIMED]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLog(log);
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	const startProcessing = async () => {
		try {
			await subscribeToAssetStakedEvents();
			await subscribeToAssetUnstakedEvents();

			await subscribeToAssetLinkEvents();
			await subscribeToAssetUnlinkEvents();

			await subscribeToAssetLinkV1Events()

			await subscribeToAliStakeEvents();
			await subscribeToAliWithdrawnEvents();

			await subscribeToRootChangedEvents();
			await subscribeToERC20RewardClaimedEvents();

			await subscribeToRevTransferEvents();
			await subscribeToPodTransferEvents();

		} catch (error) {
			console.error('Fatal error in startProcessing:', error);
			captureException(error);
		}
	};

	module.exports = {
		startProcessing
	};
})();