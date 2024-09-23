/** @format */

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const {
  AWS_REGION,
  SQS_QUEUE_URL,
  NFT_STAKED_TOPIC,
  NFT_UNSTAKED_TOPIC,
  TOKEN_DEPOSITED_TOPIC,
  TOKEN_WITHDRAWN_TOPIC,
  CHAIN_ID,
} = process.env;
const { abi } = require("../../abi/NFTStakingV2.json");
const { abi: stakingAbi } = require("../../abi/ERC1363StakingTrackerV1.json")
const { web3 } = require("../../config/web3Instance");
const { captureException } = require("@sentry/node");
const sqs = new SQSClient({ region: AWS_REGION });

// Create a mapping of event signatures to their ABI entries
const eventABIMap = {
  [NFT_STAKED_TOPIC]: abi.find((e) => e.name === "Staked"),
  [NFT_UNSTAKED_TOPIC]: abi.find(
    (e) => e.name === "Unstaked"
  ),
  [TOKEN_DEPOSITED_TOPIC]: stakingAbi.find((e) => e.name === "TokenDeposited"),
  [TOKEN_WITHDRAWN_TOPIC]: stakingAbi.find((e) => e.name === "TokenWithdrawn")
};

async function sendEventToSQS(eventData) {
  // console.log("eventData", JSON.stringify(eventData, null, 2));
  const params = {
    MessageBody: JSON.stringify(eventData),
    QueueUrl: SQS_QUEUE_URL,
  };
  await sqs.send(new SendMessageCommand(params));
  console.log("data added to SQS", JSON.stringify(eventData, null, 2));
}


// decoding subscription logs
async function decodeLog(log) {
  const eventSignatureHash = log.topics[0];
  const eventAbi = eventABIMap[eventSignatureHash];

  if (eventAbi) {
    // Check if the number of topics matches the number of indexed parameters in the ABI
    const indexedInputs = eventAbi.inputs.filter((input) => input.indexed);
    if (log.topics.length - 1 !== indexedInputs.length) {
      console.log("Skipping log due to abi mismatch");
      return { error: "Parameter mismatch" };
    }

    try {
      const decodedParameters = await web3.eth.abi.decodeLog(
        eventAbi.inputs,
        log.data,
        log.topics.slice(1)
      );
      return {
        eventName: eventAbi.name,
        decodedParameters,
      };
    } catch (error) {
      console.error("Error decoding log:", error);
      captureException(error);
      return { error: "Error decoding log" };
    }
  } else {
    return { error: "Unknown event type" };
  }
}


async function transformSubscriptionEvents(decodedEvent, event, eType) {
  let jsonData = {
    eventType: eType,
    contractAddress: event.address,
    chainId: parseInt(CHAIN_ID, 10),
    transactionHash: event.transactionHash,
    events: {},
  };

  switch (eType) {
    // Handling Staked and Unstaked events
    case "Staked":
    case "Unstaked": {
      // Ensure that all expected fields are present
      const expectedFields = ['_by', '_tokenId', '_when'];
      const hasAllFields = expectedFields.every(field => field in decodedEvent.decodedParameters);

      if (!hasAllFields) {
        console.error("Error: Missing fields in decoded parameters for Staked/Unstaked");
        return null; // Or handle this case as needed
      }

      // Store the event data for Staked and Unstaked
      jsonData.events[eType] = {
        by: decodedEvent.decodedParameters._by,               // Address of the user who staked/unstaked
        tokenId: parseInt(decodedEvent.decodedParameters._tokenId, 10),  // Token ID involved
        timestamp: decodedEvent.decodedParameters._when,      // Timestamp when the action occurred
      };
      break;
    }

    // Handling TokenDeposited event
    case "TokenDeposited": {
      const expectedFields = ['depositToken', 'depositOwner', 'depositAmount', 'depositDuration', 'account'];
      const hasAllFields = expectedFields.every(field => field in decodedEvent.decodedParameters);

      if (!hasAllFields) {
        console.error("Error: Missing fields in decoded parameters for TokenDeposited");
        return null; // Handle this case as needed
      }

      // Store the event data for TokenDeposited
      const account = decodedEvent.decodedParameters.account;

      if (!account || !('amountLocked' in account && 'maturesOn' in account && 'lastUpdatedOn' in account && 'createdOn' in account)) {
        console.error("Error: Missing fields in 'account' struct for TokenDeposited");
        return null;
      }

      jsonData.events[eType] = {
        depositToken: decodedEvent.decodedParameters.depositToken,        // Token address
        depositOwner: decodedEvent.decodedParameters.depositOwner,        // Address of the deposit owner
        depositAmount: decodedEvent.decodedParameters.depositAmount,      // Amount transferred
        depositDuration: decodedEvent.decodedParameters.depositDuration,  // Duration in seconds
        account: {
          amountLocked: account.amountLocked,         // Amount locked in the contract (Wei)
          maturesOn: account.maturesOn,               // Timestamp when tokens can be unlocked
          lastUpdatedOn: account.lastUpdatedOn,       // Last update timestamp
          createdOn: account.createdOn,               // Account creation timestamp
        },
      };
      console.log("Transformed data:", JSON.stringify(jsonData, null, 2));  // Log the full data

      break;
    }

    // Handling TokenWithdrawn event
    case "TokenWithdrawn": {
      const expectedFields = ['depositToken', 'depositOwner', 'to', 'account'];
      const hasAllFields = expectedFields.every(field => field in decodedEvent.decodedParameters);

      if (!hasAllFields) {
        console.error("Error: Missing fields in decoded parameters for TokenWithdrawn");
        return null; // Handle this case as needed
      }

      // Store the event data for TokenWithdrawn
      const account = decodedEvent.decodedParameters.account;

      if (!account || !('amountLocked' in account && 'maturesOn' in account && 'lastUpdatedOn' in account && 'createdOn' in account)) {
        console.error("Error: Missing fields in 'account' struct for TokenWithdrawn");
        return null;
      }

      jsonData.events[eType] = {
        depositToken: decodedEvent.decodedParameters.depositToken,        // Token address
        depositOwner: decodedEvent.decodedParameters.depositOwner,        // Address of the deposit owner
        to: decodedEvent.decodedParameters.to,                            // Address the tokens were sent to
        account: {
          amountLocked: account.amountLocked,         // Amount locked in the contract (Wei)
          maturesOn: account.maturesOn,               // Timestamp when tokens can be unlocked
          lastUpdatedOn: account.lastUpdatedOn,       // Last update timestamp
          createdOn: account.createdOn,               // Account creation timestamp
        },
      };
      console.log("Transformed data:", JSON.stringify(jsonData, null, 2));  // Log the full data

      break;
    }

    default:
      console.error(`Error: Unsupported event type ${eType}`);
      return null; // Or handle this case as needed
  }

  return jsonData;
}

module.exports = {
  sendEventToSQS,
  decodeLog,
  transformSubscriptionEvents,
};