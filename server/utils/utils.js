/** @format */

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const {
  AWS_REGION,
  SQS_QUEUE_URL,
  ASSET_LINKED_TOPIC,
  ASSET_UNLINKED_TOPIC,
  CHAIN_ID,
} = process.env;
const {abi} = require("../../abi/HiveRegistryV1.json");
const { web3 } = require("../../config/web3Instance");
const { captureException } = require("@sentry/node");
const sqs = new SQSClient({ region: AWS_REGION });

// Create a mapping of event signatures to their ABI entries
const eventABIMap = {
  [ASSET_LINKED_TOPIC]: abi.find((e) => e.name === "AssetLinked"),
  [ASSET_UNLINKED_TOPIC]: abi.find(
    (e) => e.name === "AssetUnlinked"
  ),
};

async function sendEventToSQS(eventData) {
  const params = {
    MessageBody: JSON.stringify(eventData),
    QueueUrl: SQS_QUEUE_URL,
  };
  await sqs.send(new SendMessageCommand(params));
  console.log("data added to SQS",eventData);
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

  // Ensure that all expected fields are present
  const expectedFields = ['by', 'tokenAddress', 'tokenId', 'hiveId', 'category', 'timestamp'];
  const hasAllFields = expectedFields.every(field => field in decodedEvent.decodedParameters);

  if (!hasAllFields) {
    console.error("Error: Missing fields in decoded parameters");
    return null; // Or handle this case as needed
  }

  switch (eType) {
    // Combining both cases as they share the same structure
    case "AssetLinked":
    case "AssetUnlinked": 
      jsonData.events[eType] = {
        by: decodedEvent.decodedParameters.by,
        tokenAddress: decodedEvent.decodedParameters.tokenAddress,
        tokenId: parseInt(decodedEvent.decodedParameters.tokenId, 10), 
        hiveId: parseInt(decodedEvent.decodedParameters.hiveId, 10), 
        category: parseInt(decodedEvent.decodedParameters.category, 10), 
        timestamp: decodedEvent.decodedParameters.timestamp,
      };
      break;
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