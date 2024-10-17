/** @format */

/**
 * Secrets class that implements the Singleton pattern to manage configuration properties
 * such as AWS credentials, Web3 settings, blockchain addresses, and other configuration values.
 * 
 * The first time the class is instantiated, it initializes its properties to `null`. 
 * Any subsequent instantiation returns the already created instance.
 */

class Secrets {
	/**
	 * Creates an instance of the Secrets class if it doesn't already exist.
	 * If an instance exists, it returns the existing instance.
	 *
	 * @constructor
	 * @returns {Secrets} The singleton instance of the Secrets class.
	 */

	constructor() {
		if (Secrets.instance) {
			return Secrets.instance;
		}
		// Initialize the configuration properties
		/**
		 * @property {string|null} AWS_SECRET_NAME - The AWS secret name, initialized as null.
		 * @property {string|null} AWS_REGION - The AWS region, initialized as null.
		 * @property {string|null} WEB3_PROVIDER - The Web3 provider URL or object, initialized as null.
		 * @property {string|null} HIVE_EVENT_HANDLER_SQS - SQS URL for handling Hive events, initialized as null.
		 * @property {string|null} HIVE_CONTRACT_ADDRESS - The Hive contract address, initialized as null.
		 * @property {number|null} PORT - The port number for the server, initialized as null.
		 * @property {string|null} ASSET_LINKED_TOPIC - Topic for asset linked events, initialized as null.
		 * @property {string|null} ASSET_UNLINKED_TOPIC - Topic for asset unlinked events, initialized as null.
		 * @property {string|null} SENTRY_DSN - The Sentry DSN for error tracking, initialized as null.
		 * @property {string|null} ALI_STAKING_ADDRESS - Staking contract address for ALI tokens, initialized as null.
		 * @property {string|null} STAKED_TOPIC - Topic for staked events, initialized as null.
		 * @property {string|null} WITHDRAWN_TOPIC - Topic for withdrawn events, initialized as null.
		 * @property {string|null} NFT_STAKING_ADDRESS - Staking contract address for NFTs, initialized as null.
		 * @property {string|null} NFT_STAKED_TOPIC - Topic for NFT staked events, initialized as null.
		 * @property {string|null} NFT_UNSTAKED_TOPIC - Topic for NFT unstaked events, initialized as null.
		 * @property {string|null} TOKEN_DEPOSITED_TOPIC - Topic for token deposited events, initialized as null.
		 * @property {string|null} TOKEN_WITHDRAWN_TOPIC - Topic for token withdrawn events, initialized as null.
		 * @property {string|null} REWARD_SYSTEM_CONTRACT - Address for the reward system contract, initialized as null.
		 * @property {string|null} ROOT_CHANGED_TOPIC - Topic for root changed events, initialized as null.
		 * @property {string|null} ERC20_REWARD_CLAIMED - Topic for ERC20 reward claimed events, initialized as null.
		 */

		this.AWS_SECRET_NAME = null;
		this.AWS_REGION = null;
		this.WEB3_PROVIDER = null;
		this.HIVE_EVENT_HANDLER_SQS = null;
		this.HIVE_CONTRACT_ADDRESS = null;
		this.PORT = null;
		this.ASSET_LINKED_TOPIC = null;
		this.ASSET_UNLINKED_TOPIC = null;
		this.SENTRY_DSN = null;
		this.ALI_STAKING_ADDRESS = null;
		this.STAKED_TOPIC = null;
		this.WITHDRAWN_TOPIC = null;
		this.NFT_STAKING_ADDRESS = null;
		this.NFT_STAKED_TOPIC = null;
		this.NFT_UNSTAKED_TOPIC = null;
		this.TOKEN_DEPOSITED_TOPIC = null;
		this.TOKEN_WITHDRAWN_TOPIC = null;
		this.REWARD_SYSTEM_CONTRACT = null;
		this.ROOT_CHANGED_TOPIC = null;
		this.ERC20_REWARD_CLAIMED = null;
		// Add other configurations as needed
		Secrets.instance = this;
	}

	/**
	 * Sets the secrets/configuration properties with the provided values.
	 *
	 * @param {Object} secrets - An object containing configuration properties.
	 * @param {string} secrets.AWS_SECRET_NAME - The AWS secret name.
	 * @param {string} secrets.AWS_REGION - The AWS region.
	 * @param {string} secrets.WEB3_PROVIDER - The Web3 provider URL or object.
	 * @param {string} secrets.HIVE_EVENT_HANDLER_SQS - The SQS URL for Hive event handling.
	 * @param {string} secrets.HIVE_CONTRACT_ADDRESS - The Hive contract address.
	 * @param {number} secrets.PORT - The port number for the server.
	 * @param {string} secrets.ASSET_LINKED_TOPIC - Topic for asset linked events.
	 * @param {string} secrets.ASSET_UNLINKED_TOPIC - Topic for asset unlinked events.
	 * @param {string} secrets.SENTRY_DSN - The Sentry DSN for error tracking.
	 * @param {string} secrets.ALI_STAKING_ADDRESS - Staking contract address for ALI tokens.
	 * @param {string} secrets.STAKED_TOPIC - Topic for staked events.
	 * @param {string} secrets.WITHDRAWN_TOPIC - Topic for withdrawn events.
	 * @param {string} secrets.NFT_STAKING_ADDRESS - Staking contract address for NFTs.
	 * @param {string} secrets.NFT_STAKED_TOPIC - Topic for NFT staked events.
	 * @param {string} secrets.NFT_UNSTAKED_TOPIC - Topic for NFT unstaked events.
	 * @param {string} secrets.TOKEN_DEPOSITED_TOPIC - Topic for token deposited events.
	 * @param {string} secrets.TOKEN_WITHDRAWN_TOPIC - Topic for token withdrawn events.
	 * @param {string} secrets.REWARD_SYSTEM_CONTRACT - Address for the reward system contract.
	 * @param {string} secrets.ROOT_CHANGED_TOPIC - Topic for root changed events.
	 * @param {string} secrets.ERC20_REWARD_CLAIMED - Topic for ERC20 reward claimed events.
	 */

	setSecrets(secrets) {
		this.AWS_SECRET_NAME = secrets.AWS_SECRET_NAME;
		this.AWS_REGION = secrets.AWS_REGION;
		this.WEB3_PROVIDER = secrets.WEB3_PROVIDER;
		this.HIVE_EVENT_HANDLER_SQS = secrets.HIVE_EVENT_HANDLER_SQS;
		this.HIVE_CONTRACT_ADDRESS = secrets.HIVE_CONTRACT_ADDRESS;
		this.PORT = secrets.PORT;
		this.ASSET_LINKED_TOPIC = secrets.ASSET_LINKED_TOPIC;
		this.ASSET_UNLINKED_TOPIC = secrets.ASSET_UNLINKED_TOPIC;
		this.SENTRY_DSN = secrets.SENTRY_DSN;
		this.ALI_STAKING_ADDRESS = secrets.ALI_STAKING_ADDRESS;
		this.STAKED_TOPIC = secrets.STAKED_TOPIC;
		this.WITHDRAWN_TOPIC = secrets.WITHDRAWN_TOPIC;
		this.NFT_STAKING_ADDRESS = secrets.NFT_STAKING_ADDRESS;
		this.NFT_STAKED_TOPIC = secrets.NFT_STAKED_TOPIC;
		this.NFT_UNSTAKED_TOPIC = secrets.NFT_UNSTAKED_TOPIC;
		this.TOKEN_DEPOSITED_TOPIC = secrets.TOKEN_DEPOSITED_TOPIC;
		this.TOKEN_WITHDRAWN_TOPIC = secrets.TOKEN_WITHDRAWN_TOPIC;
		this.REWARD_SYSTEM_CONTRACT = secrets.REWARD_SYSTEM_CONTRACT;
		this.ROOT_CHANGED_TOPIC = secrets.ROOT_CHANGED_TOPIC;
		this.ERC20_REWARD_CLAIMED = secrets.ERC20_REWARD_CLAIMED;
	}
}

module.exports = new Secrets();