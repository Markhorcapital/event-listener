/** @format */

const fs = require("fs/promises"); // Use fs.promises for async file operations

const AWS = require("aws-sdk");
const dotenv = require("dotenv");

dotenv.config();
AWS.config.update({ region: process.env.AWS_DEFAULT_REGION });
const client = new AWS.SecretsManager();

async function loadEnvSecrets() {
  try {
    const data = await client
      .getSecretValue({ SecretId: process.env.AWS_SECRET_NAME })
      .promise();
    const aws_env = JSON.parse(data.SecretString);

    const env_list = [
      `AWS_SECRET_NAME=${process.env.AWS_SECRET_NAME}`,
      `AWS_REGION=${process.env.AWS_DEFAULT_REGION}`,
    ];

    Object.keys(aws_env).forEach((key) =>
      env_list.push(`${key}=${aws_env[key]}`)
    );

    await fs.writeFile(".env", env_list.join("\n"), "utf-8");
    console.log(
      "-------------- Finished loading secrets from AWS --------------"
    );
  } catch (err) {
    console.error(
      "-------------- Error occurred during loading env from AWS --------------"
    );
    console.error(err);
  }
}

loadEnvSecrets();
