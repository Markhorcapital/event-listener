/** @format */

const fs = require('fs/promises'); // Use fs.promises for async file operations
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

async function loadEnvSecrets() {
	try {
		const data = await client
			.getSecretValue({ SecretId: process.env.AWS_SECRET_NAME })
			.promise();
		const aws_env = JSON.parse(data.SecretString);

		const env_list = [
			`AWS_SECRET_NAME=${process.env.AWS_SECRET_NAME}`,
			`AWS_REGION=${process.env.AWS_REGION}`,
			`AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}`, // Add AWS Access Key ID to env list
			`AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}` // Add AWS Secret Access Key to env list
		];

		Object.keys(aws_env).forEach((key) => {
			env_list.push(`${key}=${aws_env[key]}`);
		});

		await fs.writeFile('.env', env_list.join('\n'), 'utf-8');
		console.log(
			'-------------- Finished loading secrets from AWS --------------'
		);
	} catch (err) {
		console.error(
			'-------------- Error occurred during loading env from AWS --------------'
		);
		console.error(err);
	}
}

loadEnvSecrets();

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
