## Server Configuration

PORT=3000

# Sentry Configuration

SENTRY_DSN=your_sentry_dsn_here

# AWS SQS Configuration

AWS_REGION=your_aws_region_here
SQS_QUEUE_URL=your_sqs_queue_url_here

# Ethereum Node Configuration via Alchemy

ALCHEMY_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your_api_key_here

# Smart Contract Configuration

NFT_STAKING_ADDRESS=your_contract_address_here
NFT_STAKED_TOPIC=0xYourAssetLinkedEventTopicHash
NFT_UNSTAKED_TOPIC=0xYourAssetUnlinkedEventTopicHash

# Optional: Chain ID for Ethereum Mainnet is 1, for Ropsten Testnet is 3, etc.

CHAIN_ID=1

# Ethereum Event Listener and SQS Forwarder

This project listens for specific smart contract events (`AssetLinked` and `AssetUnlinked`) on the Ethereum blockchain and forwards these events to an AWS SQS queue for further processing.

## Features

- Connects to the Ethereum network via Alchemy RPC.
- Listens for `AssetLinked` and `AssetUnlinked` events emitted by a specified smart contract.
- Forwards received events to a configured AWS SQS queue.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed on your machine.
- An AWS account and a created SQS queue.
- An Alchemy account for Ethereum RPC access.

## Installation

Clone the repository and install its dependencies:

```bash
git clone git@github.com:Alethea-FullStack/HIVE_listener.git
npm install
npm start
npm run dev


```
