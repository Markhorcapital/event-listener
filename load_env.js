/** @format */

const AWS = require('aws-sdk'); // AWS SDK for interacting with AWS services
const dotenv = require('dotenv'); // dotenv for loading environment variables from a .env file
const { Secrets, ISecrets } = require('./server/utils/secrets'); // Custom Secrets class for managing configuration

dotenv.config();

async function loadSecrets() {

	if (process.env.NODE_ENV === 'development') {
		try {
			let env = { ...process.env }
			for (const key of Object.keys(ISecrets)) {
				ISecrets[key] = env[key];
			}
			Secrets.setSecrets(ISecrets)
			
		} catch (err) {
			console.error(
				'-------------- Error occurred during loading secrets from env --------------',
				err
			);
		}
	}

	else {
		try {
			// Configure AWS SDK with the region specified in environment variables
			AWS.config.update({
				region: process.env.AWS_REGION
			});

			// Create a new SecretsManager client to interact with AWS Secrets Manager
			const client = new AWS.SecretsManager();
			// Fetch the secret value from AWS Secrets Manager based on the SecretId
			const data = await client
				.getSecretValue({ SecretId: process.env.AWS_SECRET_NAME })
				.promise();
			const aws_env = JSON.parse(data.SecretString);

			// Combine the secrets from AWS with additional environment variables
			let secrets = {
				...aws_env,
				AWS_SECRET_NAME: process.env.AWS_SECRET_NAME,
				AWS_REGION: process.env.AWS_REGION
			};

			// Set the secrets into the Secrets class for application-wide access
			Secrets.setSecrets(secrets);
		} catch (err) {
			console.error(
				'-------------- Error occurred during loading secrets from AWS --------------',
				err
			);
		}
	}
}
// loadSecrets();
module.exports = loadSecrets;