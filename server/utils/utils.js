/** @format */

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { Secrets } = require("../../server/utils/secrets");
const { abi } = require("../../abi/NFTStakingV2.json");
const { abi: IntelliLinkerAbi } = require("../../abi/IntelliLinkerV3.json");
const { abi: PersonalityPodERC721Abi } = require("../../abi/PersonalityPodERC721.json");
const { abi: stakingAbi } = require("../../abi/ERC1363StakingTrackerV1.json");
const { abi: reward_system_abi } = require("../../abi/RewardSystem.json");
const { web3 } = require("../../config/web3Instance");
const { captureException } = require("@sentry/node");

(async () => {
  const {
    AWS_REGION,
    HIVE_EVENT_HANDLER_SQS,
    NFT_STAKED_TOPIC,
    NFT_UNSTAKED_TOPIC,
    TOKEN_DEPOSITED_TOPIC,
    TOKEN_WITHDRAWN_TOPIC,
    ROOT_CHANGED_TOPIC,
    ERC20_REWARD_CLAIMED,
    CHAIN_ID,
    NFT_LINKED_TOPIC,
    NFT_UNLINKED_TOPIC,
	NFT_TRANSFER_TOPIC
  } = Secrets;

  const sqs = new SQSClient({ region: AWS_REGION });

  // Create a mapping of event signatures to their ABI entries
  const eventABIMap = {
    [NFT_STAKED_TOPIC]: abi.find((e) => e.name === "Staked"),
    [NFT_UNSTAKED_TOPIC]: abi.find((e) => e.name === "Unstaked"),
    [NFT_LINKED_TOPIC]: IntelliLinkerAbi.find((e) => e.name === "Linked"),
    [NFT_UNLINKED_TOPIC]: IntelliLinkerAbi.find((e) => e.name === "Unlinked"),
	[NFT_TRANSFER_TOPIC]: PersonalityPodERC721Abi.find((e) => e.name === "Transfer"),
    [TOKEN_DEPOSITED_TOPIC]: stakingAbi.find(
      (e) => e.name === "TokenDeposited"
    ),
    [TOKEN_WITHDRAWN_TOPIC]: stakingAbi.find(
      (e) => e.name === "TokenWithdrawn"
    ),
    [ROOT_CHANGED_TOPIC]: reward_system_abi.find(
      (e) => e.name === "RootChanged"
    ),
    [ERC20_REWARD_CLAIMED]: reward_system_abi.find(
      (e) => e.name === "ERC20RewardClaimed"
    ),
  };

  async function sendEventToSQS(eventData) {
    // console.log("eventData", JSON.stringify(eventData, null, 2));
    const params = {
      MessageBody: JSON.stringify(eventData),
      QueueUrl: HIVE_EVENT_HANDLER_SQS,
    };
    await sqs.send(new SendMessageCommand(params));
    console.log(
      "data added to HIVE_EVENT_HANDLER_SQS",
      JSON.stringify(eventData, null, 2)
    );
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
        jsonData = await stakingEventsHandler(decodedEvent, eType, jsonData);
        break;
      }

      // Handling Linked event
      case "Linked": {
        jsonData = await linkedEventsHandler(decodedEvent, eType, jsonData);
        break;
      }

      // Handling Unlinked event
      case "Unlinked": {
        jsonData = await unlinkedEventsHandler(decodedEvent, eType, jsonData);
        break;
      }

	  

      // Handling TokenDeposited event
      case "TokenDeposited": {
        jsonData = await tokenDepositedEventHandler(
          decodedEvent,
          eType,
          jsonData
        );
        break;
      }

      // Handling TokenWithdrawn event
      case "TokenWithdrawn": {
        jsonData = await tokenWithdrawnEventHandler(
          decodedEvent,
          eType,
          jsonData
        );
        break;
      }
      // Handling RootChanged event
      case "RootChanged": {
        jsonData = await rootChangedEventHandler(decodedEvent, eType, jsonData);
        break;
      }

      // Handling ERC20RewardClaimed event
      case "ERC20RewardClaimed": {
        jsonData = await erc20RewardClaimedEventHandler(
          decodedEvent,
          eType,
          jsonData
        );
        break;
      }

      default:
        console.error(`Error: Unsupported event type ${eType}`);
        return null; // Or handle this case as needed
    }

    return jsonData;
  }

  async function stakingEventsHandler(decodedEvent, eType, jsonData) {
    // Ensure that all expected fields are present
    const expectedFields = ["_by", "_tokenId", "_when"];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for Staked/Unstaked"
      );
      return null; // Or handle this case as needed
    }

    // Store the event data for Staked and Unstaked
    jsonData.events[eType] = {
      by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
      tokenId: parseInt(decodedEvent.decodedParameters._tokenId, 10), // Token ID involved
      timestamp: decodedEvent.decodedParameters._when, // Timestamp when the action occurred
    };
    return jsonData;
  }

  async function linkedEventsHandler(decodedEvent, eType, jsonData) {
    // Ensure that all expected fields are present
    const expectedFields = [
      "_by",
      "_iNftId",
      "_linkPrice",
      "_linkFee",
      "_personalityContract",
      "_personalityId",
      "_targetContract",
      "_targetId",
    ];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error("Error: Missing fields in decoded parameters for linked");
      return null; // Or handle this case as needed
    }

    // Store the event data for Staked and Unstaked
    jsonData.events[eType] = {
      by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
      iNftId: decodedEvent.decodedParameters._iNftId.toString(), // Token ID involved
      linkPrice: decodedEvent.decodedParameters._linkPrice, // Timestamp when the action occurred
      linkFee: decodedEvent.decodedParameters._linkFee,
      personalityContract: decodedEvent.decodedParameters._personalityContract,
      personalityId: decodedEvent.decodedParameters._personalityId,
      targetContract: decodedEvent.decodedParameters._targetContract,
      targetId: decodedEvent.decodedParameters._targetId,
    };
    return jsonData;
  }

  async function unlinkedEventsHandler(decodedEvent, eType, jsonData) {
    // Ensure that all expected fields are present
    const expectedFields = ["_by", "_iNftId"];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for Unlinked"
      );
      return null; // Or handle this case as needed
    }

    // Store the event data for Staked and Unstaked
    jsonData.events[eType] = {
      by: decodedEvent.decodedParameters._by, // Address of the user who staked/unstaked
      iNftId: decodedEvent.decodedParameters._iNftId, // Token ID involvedˇ
    };
    return jsonData;
  }

  async function tokenDepositedEventHandler(decodedEvent, eType, jsonData) {
    const expectedFields = [
      "depositToken",
      "depositOwner",
      "depositAmount",
      "depositDuration",
      "account",
    ];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for TokenDeposited"
      );
      return null; // Handle this case as needed
    }

    // Store the event data for TokenDeposited
    const account = decodedEvent.decodedParameters.account;

    if (
      !account ||
      !(
        "amountLocked" in account &&
        "maturesOn" in account &&
        "lastUpdatedOn" in account &&
        "createdOn" in account
      )
    ) {
      console.error(
        "Error: Missing fields in 'account' struct for TokenDeposited"
      );
      return null;
    }

    jsonData.events[eType] = {
      depositToken: decodedEvent.decodedParameters.depositToken, // Token address
      depositOwner: decodedEvent.decodedParameters.depositOwner, // Address of the deposit owner
      depositAmount: decodedEvent.decodedParameters.depositAmount, // Amount transferred
      depositDuration: decodedEvent.decodedParameters.depositDuration, // Duration in seconds
      account: {
        amountLocked: account.amountLocked, // Amount locked in the contract (Wei)
        maturesOn: account.maturesOn, // Timestamp when tokens can be unlocked
        lastUpdatedOn: account.lastUpdatedOn, // Last update timestamp
        createdOn: account.createdOn, // Account creation timestamp
      },
    };
    console.log("Transformed data:", JSON.stringify(jsonData, null, 2)); // Log the full data
    return jsonData;
  }

  async function tokenWithdrawnEventHandler(decodedEvent, eType, jsonData) {
    const expectedFields = ["depositToken", "depositOwner", "to", "account"];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for TokenWithdrawn"
      );
      return null; // Handle this case as needed
    }

    // Store the event data for TokenWithdrawn
    const account = decodedEvent.decodedParameters.account;

    if (
      !account ||
      !(
        "amountLocked" in account &&
        "maturesOn" in account &&
        "lastUpdatedOn" in account &&
        "createdOn" in account
      )
    ) {
      console.error(
        "Error: Missing fields in 'account' struct for TokenWithdrawn"
      );
      return null;
    }

    jsonData.events[eType] = {
      depositToken: decodedEvent.decodedParameters.depositToken, // Token address
      depositOwner: decodedEvent.decodedParameters.depositOwner, // Address of the deposit owner
      to: decodedEvent.decodedParameters.to, // Address the tokens were sent to
      account: {
        amountLocked: account.amountLocked, // Amount locked in the contract (Wei)
        maturesOn: account.maturesOn, // Timestamp when tokens can be unlocked
        lastUpdatedOn: account.lastUpdatedOn, // Last update timestamp
        createdOn: account.createdOn, // Account creation timestamp
      },
    };
    console.log("Transformed data:", JSON.stringify(jsonData, null, 2)); // Log the full data
    return jsonData;
  }

  async function rootChangedEventHandler(decodedEvent, eType, jsonData) {
    const expectedFields = ["by", "root"];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for RootChanged"
      );
      return null;
    }

    jsonData.events[eType] = {
      by: decodedEvent.decodedParameters.by, // Address of the user who changed the root
      root: decodedEvent.decodedParameters.root, // New Merkle root (bytes32)
    };
    console.log(
      "Transformed data for RootChanged:",
      JSON.stringify(jsonData, null, 2)
    );
    return jsonData;
  }

  async function erc20RewardClaimedEventHandler(decodedEvent, eType, jsonData) {
    const expectedFields = ["rewardToken", "user", "amount"];
    const hasAllFields = expectedFields.every(
      (field) => field in decodedEvent.decodedParameters
    );

    if (!hasAllFields) {
      console.error(
        "Error: Missing fields in decoded parameters for ERC20RewardClaimed"
      );
      return null;
    }

    jsonData.events[eType] = {
      rewardToken: decodedEvent.decodedParameters.rewardToken, // Address of the reward token contract
      user: decodedEvent.decodedParameters.user, // Address of the user claiming the reward
      amount: decodedEvent.decodedParameters.amount.toString(), // Claimed reward amount in wei (converted to string)
    };
    console.log(
      "Transformed data for ERC20RewardClaimed:",
      JSON.stringify(jsonData, null, 2)
    );
    return jsonData;
  }

  module.exports = {
    sendEventToSQS,
    decodeLog,
    transformSubscriptionEvents,
  };
})();
