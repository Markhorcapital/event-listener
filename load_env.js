/** @format */

const AWS = require('aws-sdk');
const dotenv = require('dotenv');

dotenv.config();

// Set the AWS credentials from environment variables
AWS.config.update({
	region: process.env.AWS_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Load AWS Access Key ID from environment
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // Load AWS Secret Access Key from environment
});

const client = new AWS.SecretsManager();

class Secrets {
	constructor() {
		if (Secrets.instance) {
			return Secrets.instance;
		}
		// Initialize your configuration properties
		this.AWS_SECRET_NAME = null;
		this.AWS_REGION = null;
		this.AWS_ACCESS_KEY_ID = null;
		this.AWS_SECRET_ACCESS_KEY = null;
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

	async loadSecrets() {
		if (this.loaded) return;
		try {
			const data = await client
				.getSecretValue({ SecretId: process.env.AWS_SECRET_NAME })
				.promise();
			const aws_env = JSON.parse(data.SecretString);

			// Store the secrets in the class instance
			let secrets = {
				...aws_env,
				AWS_SECRET_NAME: process.env.AWS_SECRET_NAME,
				AWS_REGION: process.env.AWS_REGION,
				AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
				AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
			};
			this.AWS_SECRET_NAME = secrets.AWS_SECRET_NAME;
			this.AWS_REGION = secrets.AWS_REGION;
			this.AWS_ACCESS_KEY_ID = secrets.AWS_ACCESS_KEY_ID;
			this.AWS_SECRET_ACCESS_KEY = secrets.AWS_SECRET_ACCESS_KEY;
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
		} catch (err) {
			console.error(
				'-------------- Error occurred during loading env from AWS --------------'
			);
			console.error(err);
		}
	}
}

// Export a singleton instance of the Secrets class
// Load secrets when the module is imported
module.exports = new Secrets();

// changing the code

// /** @format */

// const fs = require('fs/promises'); // Use fs.promises for async file operations

// const AWS = require('aws-sdk');
// const dotenv = require('dotenv');

// dotenv.config();
// AWS.config.update({ region: process.env.AWS_REGION });
// const client = new AWS.SecretsManager();

// async function loadEnvSecrets() {
// 	try {
// 		const data = await client
// 			.getSecretValue({ SecretId: process.env.AWS_SECRET_NAME })
// 			.promise();
// 		const aws_env = JSON.parse(data.SecretString);

// 		const env_list = [
// 			`AWS_SECRET_NAME=${process.env.AWS_SECRET_NAME}`,
// 			`AWS_REGION=${process.env.AWS_REGION}`
// 		];

// 		Object.keys(aws_env).forEach((key) => {
// 			env_list.push(`${key}=${aws_env[key]}`);
// 			console.log('key', key);
// 		});

// 		await fs.writeFile('.env', env_list.join('\n'), 'utf-8');
// 		console.log(
// 			'-------------- Finished loading secrets from AWS --------------'
// 		);
// 		console.log('env_list', env_list);
// 	} catch (err) {
// 		console.error(
// 			'-------------- Error occurred during loading env from AWS --------------'
// 		);
// 		console.error(err);
// 	}
// }

// loadEnvSecrets();
