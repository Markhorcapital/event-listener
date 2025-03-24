/** @format */

// Initialize the configuration properties
/**
 * @typedef {Object} ISecrets
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

/**
 * Secrets class that implements the Singleton pattern to manage configuration properties
 * such as AWS credentials, Web3 settings, blockchain addresses, and other configuration values.
 * @implements {ISecrets}
 */

const ISecrets = {
	AWS_SECRET_NAME: null,
	AWS_REGION: null,
	WEB3_PROVIDER: null,
	HIVE_EVENT_HANDLER_SQS: null,
	HIVE_CONTRACT_ADDRESS: null,
	PORT: null,
	POD_ADDRESS: null,
	REVENANTS_ADDRESS: null,
	TRANSFER_TOPIC: null,
	INTELL_NFT_V2: null,
	ASSET_LINKED_TOPIC: null,
	ASSET_UNLINKED_TOPIC: null,
	SENTRY_DSN: null,
	ALI_STAKING_ADDRESS: null,
	STAKED_TOPIC: null,
	WITHDRAWN_TOPIC: null,
	NFT_STAKING_ADDRESS: null,
	NFT_STAKED_TOPIC: null,
	NFT_UNSTAKED_TOPIC: null,
	TOKEN_DEPOSITED_TOPIC: null,
	TOKEN_WITHDRAWN_TOPIC: null,
	REWARD_SYSTEM_CONTRACT: null,
	ROOT_CHANGED_TOPIC: null,
	ERC20_REWARD_CLAIMED: null,
	NFT_LINKED_TOPIC: null,
	NFT_UNLINKED_TOPIC: null,
	INTELLILINKER_ADDRESS: null,
	NFT_TRANSFER_TOPIC: null,
	INTELLILINKER_ADDRESS_V1: null,
	CHAIN_ID: null,
	NFT_EVENT_HANDLER_SQS: null
};

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
		Object.assign(this, ISecrets); // Initialize attributes based on ISecrets
		Secrets.instance = this;
	}

	/**
	 * Sets the secrets/configuration properties with the provided values.
	 *
	 * @param {Object} secrets - An object containing configuration properties.
	 */

	setSecrets(secrets) {
		Object.assign(this, secrets);
	}
}

module.exports = {
	Secrets: new Secrets(),
	ISecrets // Export ISecrets for reuse in other files
};
