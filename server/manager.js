/** @format */
const { captureException } = require('@sentry/node');
const { web3,web3_instance } = require('../config/web3Instance');
const {
	sendEventToSQS,
	decodeLog,
	transformSubscriptionEvents,
	sendEventToNftSQS,
	sendEventToTransferSQS,
	decodeLogForCollection,
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
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					await processNftEvent(eventData);
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

					await processNftEvent(eventData);
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
				if (decodedLog && !decodedLog.error) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					if(!(eventData.events.Linked.targetContract === REVENANTS_ADDRESS)){
					saveDataToFile(
						eventData.events.Linked.targetContract,
						eventData.events.Linked.iNftId,
						eventData.events.Linked.targetId,
						FILE_NAME
					)}
					await processNftEvent(eventData);
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
					deleteNFT(
						eventData.events.Unlinked.iNftId,
					    FILE_NAME
					)
					await processNftEvent(eventData);
					
				}
			})
			.on('error', console.error);
	}

	async function subscribeToRevTransferEvents() {
		var subscription = web3_instance.eth
			.subscribe(
				'logs',
				{
					address: REVENANTS_ADDRESS,
					topics: [TRANSFER_TOPIC]
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

					await processTransferEvent(eventData);
				}
			})
			.on('error', console.error);
	}

	async function subscribeToPodTransferEvents() {
		var subscription = web3_instance.eth
			.subscribe(
				'logs',
				{
					address: POD_ADDRESS,
					topics: [TRANSFER_TOPIC]
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
					if(!(eventData.events.Transfer.to === NFT_STAKING_ADDRESS) && !(eventData.events.Transfer.to === INTELLIGENTNFT_V2)){
						await processTransferEvent(eventData);
					} 					
				}
			})
			.on('error', console.error);
	}

	async function subscribeToCollectionTransferEvents() {
		var subscription = web3_instance.eth
			.subscribe(
				'logs',
				{
					topics: [TRANSFER_TOPIC]
				},
				function (error) {
					if (error) {
						console.log(error);
					}
				}
			)
			.on('data', async function (log) {
				const decodedLog = await decodeLogForCollection(log);
				let existingNFTs = readData(FILE_NAME);
				 
				if (decodedLog && !decodedLog.error && Object.keys(decodedLog).length > 0) {
					const eventData = await transformSubscriptionEvents(
						decodedLog,
						log,
						decodedLog.eventName
					);
					let NFTs;
					if(existingNFTs.length > 0){
					NFTs = existingNFTs.filter(nft => 
						(nft.collectionAddress.toLowerCase() === eventData.contractAddress.toLowerCase() && 
						  nft.tokenId === eventData.events.Transfer.tokenId)
					);
					if(NFTs.length > 0){
						if(!(eventData.events.Transfer.to === NFT_STAKING_ADDRESS) && !(eventData.events.Transfer.to === INTELLIGENTNFT_V2)){
						await processTransferEvent(eventData);
						}
				   } 
				  }				
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

			await subscribeToAliStakeEvents();
			await subscribeToAliWithdrawnEvents();

			await subscribeToRevTransferEvents();
			await subscribeToPodTransferEvents();

			await subscribeToERC20RewardClaimedEvents();
			await subscribeToRootChangedEvents();

			await subscribeToCollectionTransferEvents();

		} catch (error) {
			console.error('Fatal error in startProcessing:', error);
			captureException(error);
		}
	};

	module.exports = {
		startProcessing
	};
})();