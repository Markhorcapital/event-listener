/** @format */
const { captureException } = require("@sentry/node");
const Web3 = require("web3");
require("dotenv").config();
const HIVE_CONTRACT_ADDRESS = process.env.HIVE_CONTRACT_ADDRESS;

const WEB3_PROVIDER = process.env.WEB3_PROVIDER;

let web3;
let contract;

const { abi } = require("../abi/HiveRegistryV1.json");

// Function to create a new web3 instance and contract
async function createWeb3Instance(retryCount = 0) {
  const provider = new Web3.providers.WebsocketProvider(WEB3_PROVIDER, {
    reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: 5,
      onTimeout: false,
    },
  });

  provider.on("connect", () => console.log("WebSocket Connected"));
  provider.on("end", () => {
    console.log("WebSocket disconnected! Attempting to reconnect...");
    const delay = calculateBackoffDelay(retryCount);
    setTimeout(() => createWeb3Instance(retryCount + 1), delay);
  });
  provider.on("error", (e) => {
    console.error("WebSocket encountered an error:", e);
    provider.disconnect();
  });

  web3 = new Web3(provider);

  contract = new web3.eth.Contract(abi, HIVE_CONTRACT_ADDRESS);
}


// Function to calculate the backoff delay
function calculateBackoffDelay(retryCount) {
  const baseDelay = 5000; // Base delay in milliseconds
  const maxDelay = 30000; // Maximum delay in milliseconds
  return Math.min(maxDelay, baseDelay * Math.pow(2, retryCount));
}

// Function to get the chain ID
async function getChainId() {
  try {
    return await web3.eth.getChainId();
  } catch (error) {
    console.error("Error getting chain ID:", error);
    captureException(error)
    throw error;
  }
}

async function getLatestBlockNumber() {
  try {
    return await web3.eth.getBlockNumber();
  } catch (error) {
    console.error("Error getting block number:", error);
    captureException(error)
    throw error;
  }
}

// Initial creation of the web3 instance and contract
createWeb3Instance();

module.exports = {
  get web3() {
    return web3;
  },
  get contract() {
    return contract;
  },
  getChainId,
  getLatestBlockNumber,
};
