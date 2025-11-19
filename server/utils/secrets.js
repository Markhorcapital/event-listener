/** @format */

// Initialize the configuration properties
/**
 * @typedef {Object} ISecrets
 * @property {string|null} AWS_SECRET_NAME - The AWS secret name, initialized as null.
 * @property {string|null} AWS_REGION - The AWS region, initialized as null.
 * @property {string|null} WEB3_PROVIDER - The Web3 provider URL or object, initialized as null.
 * @property {number|null} PORT - The port number for the server, initialized as null.
 * @property {string|null} SENTRY_DSN - The Sentry DSN for error tracking, initialized as null.
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
	PORT: null,
	TRANSFER_TOPIC: null,
	SENTRY_DSN: null,
	CHAIN_ID: null,
	TRANSFER_HANDLER_SQS: null,
	WEB3_PROVIDER_HISTORICAL: null,
	REDIS_URL: null,
	LAST_PROCESSED_BLOCK_KEY: null,
	AWS_ACCESS_KEY_ID: null,
	AWS_SECRET_ACCESS_KEY: null
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
