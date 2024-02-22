/** @format */
require("dotenv").config();
const { captureException } = require("@sentry/node");
const { web3 } = require("../config/web3Instance");

const { HIVE_CONTRACT_ADDRESS, ASSET_LINKED_TOPIC, ASSET_UNLINKED_TOPIC } =
  process.env;
const {
  sendEventToSQS,
  decodeLog,
  transformSubscriptionEvents,
} = require("./utils/utils");

const processEvent = async (event) => {
  try {
    if (event) {
      await sendEventToSQS(event);
    }
  } catch (err) {
    console.error("Fatal error: Error sending message to SQS:", err);
    captureException(err);
  }
};

async function subscribeToAssetLinkEvents() {
  var subscription = web3.eth
    .subscribe(
      "logs",
      {
        address: HIVE_CONTRACT_ADDRESS,
        topics: [ASSET_LINKED_TOPIC],
      },
      function (error) {
        if (error) {
          console.log(error);
        }
      }
    )
    .on("data", async function (log) {
      const decodedLog = await decodeLog(log);
      if (decodedLog && !decodedLog.error) {
        const eventData = await transformSubscriptionEvents(
          decodedLog,
          log,
          decodedLog.eventName
        );
        console.log(
          "Transformed data:",
          eventData
        );

        await processEvent(eventData);

      }
    })
    .on("error", console.error);
}

async function subscribeToAssetUnLinkEvents() {
  var subscription = web3.eth
    .subscribe(
      "logs",
      {
        address: HIVE_CONTRACT_ADDRESS,
        topics: [ASSET_UNLINKED_TOPIC],
      },
      function (error) {
        if (error) {
          console.log(error);
        }
      }
    )
    .on("data", async function (log) {
      const decodedLog = await decodeLog(log);
      if (decodedLog && !decodedLog.error) {
        const eventData = await transformSubscriptionEvents(
          decodedLog,
          log,
          decodedLog.eventName
        );
        console.log(
          "Transformed data:",
          eventData
        );

        await processEvent(eventData);
      }
    })
    .on("error", console.error);
}



const startProcessing = async () => {
  try {
    await subscribeToAssetLinkEvents();
    await subscribeToAssetUnLinkEvents();
  } catch (error) {
    console.error("Fatal error in startProcessing:", error);
    captureException(error);
  }
};

module.exports = {
  startProcessing,
};
