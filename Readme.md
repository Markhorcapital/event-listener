# Event Listener - ALI Staking and NFT Staking

## Project Overview

This project contains two event listeners for the **ALI Staking** and **NFT Staking (Pods)** contracts.

### Current Status:

- The event listener is only actively running for **ALI Staking**.
- A pull request (PR) has been shared for **NFT Staking**, introducing the `NFTStakingV2` contract, which incorporates a locking mechanism.

  - **Note:** In production, we will continue using the old **NFT Staking** smart contract, where Pods are staked.
  - **PersonalityStaking Mainnet (ALI Staking):** `0xAbEffb353dae4A177057e9a3e4A663386cF54758`
  - On Staging we are using new NFTStakingV2 smart contract with locking set to false

- **Owner Wallet on Stage:** `0x4fb57fC72969234Afd3049A7d6dB20c21ec71dFd`

### Contract Addresses:

- **NFT Contract:** `0x0019AFB28fc87aC76061592B0aE20CeF995254f8`
- **NFT Staking Contract (V2):** `0xE856B97c2015293814b4bb5a970b3eE507C118cB`
- **ERC20 Staking (ALI Staking):** `0x4b3717169BE7319B0B35a36905C6671262130aa9`
- **ALI Token (Sepolia):** `0x2722727d9DeB5962f7166E03aE81b1169f784A11`

## Getting Started

### Prerequisites

- **Node.js version:** 18+
- **NPM version:** Latest

### Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:Alethea-FullStack/HIVE_listener.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the project:
   - For development:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

### Environment Variables

Set up the following environment variables in your `.env` file:

```bash
AWS_SECRET_NAME=
AWS_DEFAULT_REGION="us-east-2"
WEB3_PROVIDER=wss://eth-sepolia.g.alchemy.com/v2/<your-api-key>

SQS_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/<your-queue-id>

NFT_STAKING_ADDRESS=0xE856B97c2015293814b4bb5a970b3eE507C118cB
PORT=3001
CHAIN_ID=1

# NFT Staking Event Topics
NFT_STAKED_TOPIC=0x7a61b2f6736839b867822dec33e9b62da0725d9d071eac74323a6e04c79223e0
NFT_UNSTAKED_TOPIC=0x36d8306a3ba641113e235e43a209806d1ed89faf26cf1a0b0406f5bef7da1f8c

# ALI Staking Event Topics
ALI_STAKING_ADDRESS=0x4b3717169BE7319B0B35a36905C6671262130aa9
SENTRY_DSN=https://<your-sentry-dsn>@o1027208.ingest.sentry.io/<project-id>
TOKEN_DEPOSITED_TOPIC=0xf223d9f62a25e1cc7de0f82802962e811a982b702699cc85222bf17c0422163b
TOKEN_WITHDRAWN_TOPIC=0x43f48baced8c8f1d748cc1ac8ed7ed56105c833eec2b7ddef9aec537d9593d12
```

## Event Structure

### ALI Staking Events

#### Token Deposited Event

```json
{
  "eventType": "TokenDeposited",
  "contractAddress": "0x4b3717169BE7319B0B35a36905C6671262130aa9",
  "chainId": 1,
  "transactionHash": "0xa51e7d9df1c4242acea423487c269e1917f004410d9e21f88a614ca89235db50",
  "events": {
    "TokenDeposited": {
      "depositToken": "0x2722727d9DeB5962f7166E03aE81b1169f784A11",
      "depositOwner": "0x707562da7C5e689F23139f4ACc354D163a18985a",
      "depositAmount": "1000000000000000000",
      "depositDuration": "60",
      "account": {
        "amountLocked": "2000000000000000000",
        "maturesOn": "1727106120",
        "lastUpdatedOn": "1727106060",
        "createdOn": "1727105820"
      }
    }
  }
}
```

#### Token Withdrawn Event

```json
{
  "eventType": "TokenWithdrawn",
  "contractAddress": "0x4b3717169BE7319B0B35a36905C6671262130aa9",
  "chainId": 1,
  "transactionHash": "0x2397d644a5a6b3e15c37bb32981ad0dfcef3e563f50b91405d110e380ad556b9",
  "events": {
    "TokenWithdrawn": {
      "depositToken": "0x2722727d9DeB5962f7166E03aE81b1169f784A11",
      "depositOwner": "0x707562da7C5e689F23139f4ACc354D163a18985a",
      "to": "0x707562da7C5e689F23139f4ACc354D163a18985a",
      "account": {
        "amountLocked": "2000000000000000000",
        "maturesOn": "1727106120",
        "lastUpdatedOn": "1727106060",
        "createdOn": "1727105820"
      }
    }
  }
}
```

### NFT Staking Events (Staging on Sepolia)

#### NFT Staked Event

```json
{
  "eventType": "Staked",
  "contractAddress": "0xE856B97c2015293814b4bb5a970b3eE507C118cB",
  "chainId": 1,
  "transactionHash": "0x87d8824f461e1b909d8dbd9f64f074d038c8fe921898c77105b7dafb58dd7acf",
  "events": {
    "Staked": {
      "by": "0x707562da7C5e689F23139f4ACc354D163a18985a",
      "tokenId": 11,
      "timestamp": "1727115192"
    }
  }
}
```

#### NFT Unstaked Event

```json
{
  "eventType": "Unstaked",
  "contractAddress": "0xE856B97c2015293814b4bb5a970b3eE507C118cB",
  "chainId": 1,
  "transactionHash": "0x8dc1116e7af64b6aec0393bf6b77445d14f44a6fdf62b8f1d620b00da3127b9e",
  "events": {
    "Unstaked": {
      "by": "0x707562da7C5e689F23139f4ACc354D163a18985a",
      "tokenId": 11,
      "timestamp": "1727115252"
    }
  }
}
```

## License

This project is licensed under the MIT License.
