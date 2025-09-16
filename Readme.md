# Generic Multi-Chain Event Listener

## Project Overview

This is a **generic, multi-chain blockchain event listener** that can monitor multiple smart contracts across different chains. The system is designed to be flexible and scalable, allowing you to enable/disable specific contracts through environment configuration.

### Current Status:

- The event listener is only actively running for **ALI Staking**.

  - **Note:** In production, we will continue using the old **NFT Staking** smart contract, where Pods are staked.
  - **PersonalityStaking Mainnet (ALI Staking):** `0xAbEffb353dae4A177057e9a3e4A663386cF54758`
  - On Staging we are using new NFTStakingV2 smart contract with locking set to false

- **Owner Wallet on Stage:** `0x4fb57fC72969234Afd3049A7d6dB20c21ec71dFd`

### Contract Addresses:

- **NFT Contract:** `0x0019AFB28fc87aC76061592B0aE20CeF995254f8`
- **NFT Staking Contract (V2):** `0xE856B97c2015293814b4bb5a970b3eE507C118cB`
- **ERC20 Staking (ALI Staking):** `0x4b3717169BE7319B0B35a36905C6671262130aa9`
- **ALI Token (Sepolia):** `0x2722727d9DeB5962f7166E03aE81b1169f784A11`
- **REWARD_SYSTEM_CONTRACT:** `0xA6EC8541979FC97aA9bEd11798fc562cCA577E87`

## 🔧 Contract Management Guide

### Supported Smart Contracts

The event listener supports the following contract types:

1. **NFT Staking Contract** - Monitors NFT staking/unstaking events
2. **ALI Staking Contract** - Monitors token deposit/withdrawal events  
3. **Reward System Contract** - Monitors reward distribution events
4. **IntelliLinker Contract** - Monitors NFT linking/unlinking events
5. **POD/Revenants Contracts** - Monitors NFT transfer events
6. **Linked NFT Collections** - Monitors transfers of linked NFTs

### 🚀 Adding a New Smart Contract

**SUPER SIMPLE!** Just add your contract to the centralized configuration file:

#### 1. Add Contract Configuration (`config/config.js`)

```javascript
// In CONTRACT_CONFIG array
{
    name: 'Your Contract Name',
    address: () => Secrets.YOUR_CONTRACT_ADDRESS,
    events: [
        { 
            topic: () => Secrets.YOUR_CONTRACT_TOPIC, 
            eventName: 'YourEventName',
            abi: YourContractAbi,
            handler: 'handleYourEvent' 
        }
    ]
}
```

#### 2. Add ABI Import (`config/config.js`)

```javascript
// At top of config/config.js
const { abi: YourContractAbi } = require('../abi/YourContract.json');
```

#### 3. Add Environment Variables (`server/utils/secrets.js`)

```javascript
// In ISecrets object (around line 68)
YOUR_CONTRACT_ADDRESS: null,
YOUR_CONTRACT_TOPIC: null
```

#### 4. Add Event Handler (if needed) (`server/utils/utils.js`)

```javascript
// In getHandlerFunction() handlers object
handleYourEvent: (log) => handleYourEvent(log),

// Add handler function
async function handleYourEvent(log) {
    const decodedLog = await decodeLog(log);
    if (decodedLog && !decodedLog.error) {
        const eventData = await transformSubscriptionEvents(
            decodedLog,
            log,
            decodedLog.eventName
        );
        await processEvent(eventData); // or processNftEvent/processTransferEvent
    }
}
```

**That's it!** Everything else (event registry, logging, ABI mapping) is **automatically generated** from your configuration.

### 🗑️ Removing a Smart Contract

**EVEN SIMPLER!** Just comment out or remove the contract from `config/config.js`:

```javascript
// Comment out or delete the entire contract block
/*
{
    name: 'Contract To Remove',
    address: () => Secrets.CONTRACT_ADDRESS,
    events: [...]
}
*/
```

**That's it!** The system will automatically:
- Skip the contract during initialization
- Not register any event handlers  
- Continue processing other contracts normally

The event listener gracefully handles missing configurations without crashing.

### 📁 File Structure Overview

```
HIVE_Listner/
├── config/
│   ├── config.js          ← 🎯 MAIN CONFIGURATION FILE
│   ├── redisInstance.js
│   └── web3Instance.js
├── server/
│   ├── manager.js          ← Main event processing logic
│   └── utils/
│       ├── utils.js        ← All utility functions & handlers
│       └── secrets.js      ← Environment variables
└── abi/                    ← Contract ABI files
```

### 🎯 Configuration-Driven Architecture

#### **Single Source of Truth**: `config/config.js`
- **CONTRACT_CONFIG**: All contract definitions
- **CHAIN_CONFIG**: Chain-specific settings (batch sizes, delays)
- **APP_CONFIG**: Application settings (file names, cache size)

#### **Dynamic Generation**:
- ✅ **Event Registry**: Auto-built from CONTRACT_CONFIG
- ✅ **ABI Mapping**: Auto-created from contract events
- ✅ **Logging**: Auto-generated from active contracts
- ✅ **Chain Optimization**: Auto-selected based on CHAIN_ID

#### **Benefits**:
- 🎯 **Easy Contract Management**: Add/remove in one file
- 🚀 **Zero Code Changes**: Configuration drives everything
- 🔧 **Dynamic Handlers**: Handler functions selected by name
- 📊 **Chain Optimization**: Automatic batch/delay selection

### 📋 Environment Configuration Examples

#### Full Configuration (All Contracts):
```bash
# NFT Staking
NFT_STAKING_ADDRESS=0xE856B97c2015293814b4bb5a970b3eE507C118cB
NFT_STAKED_TOPIC=0x7a61b2f6736839b867822dec33e9b62da0725d9d071eac74323a6e04c79223e0
NFT_UNSTAKED_TOPIC=0x36d8306a3ba641113e235e43a209806d1ed89faf26cf1a0b0406f5bef7da1f8c

# ALI Staking  
ALI_STAKING_ADDRESS=0x4b3717169BE7319B0B35a36905C6671262130aa9
TOKEN_DEPOSITED_TOPIC=0xf223d9f62a25e1cc7de0f82802962e811a982b702699cc85222bf17c0422163b
TOKEN_WITHDRAWN_TOPIC=0x43f48baced8c8f1d748cc1ac8ed7ed56105c833eec2b7ddef9aec537d9593d12

# Reward System
REWARD_SYSTEM_CONTRACT=0xA6EC8541979FC97aA9bEd11798fc562cCA577E87
ROOT_CHANGED_TOPIC=0x714dceb37ab5c7fb26ab805d3dc0423f5d90c3dac9f6702a2ea1402ea847851c
ERC20_REWARD_CLAIMED=0x617dc33bfe6c05895429aa10442ff5716e0040e90d0c04faa92ced6a4d0ae787

# IntelliLinker
INTELLILINKER_ADDRESS=0x73bB799ceA2a9fFE0e2B65620d3dbeeF6D5e2313
NFT_LINKED_TOPIC=0x4c5f6243e66f868e375120e87ec9c0e34ad78379d66dca7921055094b6a7eacd
NFT_UNLINKED_TOPIC=0xdfa02adc9cf1364277c3c57daa66f9e9d90d54e6816235d64c77f3fce73f17be

# Transfer Monitoring
POD_ADDRESS=0x2F419B18c1ff72391A1648FAf6d6A1714AD72fd4
REVENANTS_ADDRESS=0xa6335cEcEB86EC0B041c8DCC84Ff9351dE8776aB
TRANSFER_TOPIC=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
```

#### NFT-Only Configuration:
```bash
# Only NFT Staking - other contracts disabled
NFT_STAKING_ADDRESS=0xE856B97c2015293814b4bb5a970b3eE507C118cB
NFT_STAKED_TOPIC=0x7a61b2f6736839b867822dec33e9b62da0725d9d071eac74323a6e04c79223e0
NFT_UNSTAKED_TOPIC=0x36d8306a3ba641113e235e43a209806d1ed89faf26cf1a0b0406f5bef7da1f8c

# Leave others empty or undefined
# ALI_STAKING_ADDRESS=
# REWARD_SYSTEM_CONTRACT=
```

#### Base Chain Configuration:
```bash
# Different addresses for Base chain
CHAIN_ID=8453
NFT_STAKING_ADDRESS=0x1234... # Base chain address
NFT_STAKED_TOPIC=0x7a61b2f6736839b867822dec33e9b62da0725d9d071eac74323a6e04c79223e0
# ... other Base-specific addresses
```

### 🔍 Startup Logs

When you start the application, you'll see which contracts are active:

```
=== ACTIVE CONTRACT CONFIGURATION ===
✅ NFT Staking: 0xE856B97c2015293814b4bb5a970b3eE507C118cB
✅ ALI Staking: 0x4b3717169BE7319B0B35a36905C6671262130aa9
✅ Reward System: 0xA6EC8541979FC97aA9bEd11798fc562cCA577E87
✅ IntelliLinker: 0x73bB799ceA2a9fFE0e2B65620d3dbeeF6D5e2313
✅ POD Transfers: 0x2F419B18c1ff72391A1648FAf6d6A1714AD72fd4
✅ Revenants Transfers: 0xa6335cEcEB86EC0B041c8DCC84Ff9351dE8776aB
✅ Linked NFT Transfer Monitoring: Enabled
======================================
```

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
AWS_REGION="us-east-2"
WEB3_PROVIDER=wss://eth-sepolia.g.alchemy.com/v2/<your-api-key>

HIVE_EVENT_HANDLER_SQS=https://sqs.us-east-2.amazonaws.com/<your-queue-id>

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

#Reward System
REWARD_SYSTEM_CONTRACT=0xA6EC8541979FC97aA9bEd11798fc562cCA577E87
ROOT_CHANGED_TOPIC=0x714dceb37ab5c7fb26ab805d3dc0423f5d90c3dac9f6702a2ea1402ea847851c
ERC20_REWARD_CLAIMED=0x617dc33bfe6c05895429aa10442ff5716e0040e90d0c04faa92ced6a4d0ae787

#Linker 

# Reward System
NFT_LINKED_TOPIC=0x4c5f6243e66f868e375120e87ec9c0e34ad78379d66dca7921055094b6a7eacd
NFT_UNLINKED_TOPIC=0xdfa02adc9cf1364277c3c57daa66f9e9d90d54e6816235d64c77f3fce73f17be
INTELLILINKER_ADDRESS=0x73bB799ceA2a9fFE0e2B65620d3dbeeF6D5e2313
INTELLIGENTNFT_V2=0x9DE5915eee5Ab749EAbC9A7C57BF7cc2ffF7B83D

# NFT Transfer
POD_ADDRESS=0x2F419B18c1ff72391A1648FAf6d6A1714AD72fd4
REVENANTS_ADDRESS=0xa6335cEcEB86EC0B041c8DCC84Ff9351dE8776aB
TRANSFER_TOPIC=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
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

### Reward System RootChanged Event

```json
{
	"eventType": "RootChanged",
	"contractAddress": "0xA6EC8541979FC97aA9bEd11798fc562cCA577E87",
	"chainId": 1,
	"transactionHash": "0x65854b111eab17273e7e42c1c6ede7a915641a896e36b96ef91e305d03b642c2",
	"events": {
		"RootChanged": {
			"by": "0x27658b44BBbD1a640354F0845b09e709eCE428CC",
			"root": "0xc38cce658171a4f5c7722b377dbdcafc6662ad1c3d253851d7cc502e3a488978"
		}
	}
}
```

### ERC20RewardClaimed Event

```json
{
	"eventType": "ERC20RewardClaimed",
	"contractAddress": "0xA6EC8541979FC97aA9bEd11798fc562cCA577E87",
	"chainId": 1,
	"transactionHash": "0xdbc6ac3f29289097f0619c3b35d9a056cccbeb0b12ee283f8b2c76b77ce7a7e8",
	"events": {
		"ERC20RewardClaimed": {
			"rewardToken": "0x2722727d9DeB5962f7166E03aE81b1169f784A11",
			"user": "0xf8E00719181774261Fb58Fb1e21c7F3317035045",
			"amount": "3000000000000000000"
		}
	}
}
```

## License

This project is licensed under the MIT License.

## Flow of loading secrets

**Configuration Properties**:

- All configuration properties such as AWS_SECRET_NAME, AWS_REGION, SQS_QUEUE_URL, etc., are initialized to null in the ISecrets object.
- These properties include crucial settings like AWS credentials, Web3 provider, smart contract addresses, and event topics.

**Secrets Class**:

- A Secrets class is defined which implements the Singleton pattern, ensuring only one instance of the secrets exists across the application.
- The setSecrets() method allows setting or updating the configuration properties at runtime.
- The class is exported as a pre-initialized instance (Secrets) for use throughout the application.

### Development Environment:

- When the NODE_ENV is set to development, it loads environment variables using the dotenv package.
- These environment variables are then mapped to the ISecrets object, and the secrets are set globally using the Secrets.setSecrets() method.

### Production Environment:

- For production, the AWS SDK is configured using the region specified in the environment variables.
- The code interacts with AWS Secrets Manager to fetch the secret using the getSecretValue() method.
- The secret data retrieved from AWS is combined with any additional environment variables and passed to the Secrets.setSecrets() method.

## Project Execution Flow

=> With 'npm run dev', the prestart code runs which is load_env.js.
=> The load_env.js loads the environment variables from .env file.
=> secrets are then fetched from the AWS secrets manager and then stored in a class named "Secrets" and it present in the global context so that every other file can access the instance of "Secrets".
=> After the prestart, index.js run and then the other files.

## Manager.js

=> In manager.js all the subscriptions are made and websockets starts listening to the subscribes events.

## Utils.js

=> utils.js holds all the utility functions required by other scripts.
=> Like decodeLog(), sendEventToSQS(), transformSubscriptionEvents().
