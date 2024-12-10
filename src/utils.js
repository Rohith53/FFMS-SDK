import WebSocket from 'ws';

/**
 * Create a WebSocket connection
 * @param {string} url - The WebSocket URL
 * @param {string} apiKey - The API key for authentication
 * @returns {WebSocket} - WebSocket connection instance
 */
export function createWebSocketConnection(url, apiKey) {
  const ws = new WebSocket(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  ws.onopen = () => {
    console.log("WebSocket connection established.");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return ws;
}

/**
 * Validate API Response
 * Ensures the API response contains valid data for feature flags.
 * @param {Array} flags - Array of feature flag objects
 * @returns {boolean} - Returns true if the data is valid
 */
export function validateApiResponse(flags) {
  if (!Array.isArray(flags)) {
    console.error("Invalid API response: Expected an array.");
    return false;
  }

  for (const flag of flags) {
    if (
      typeof flag.name !== 'string' ||
      typeof flag.state !== 'boolean'
    ) {
      console.error(`Invalid flag object: ${JSON.stringify(flag)}`);
      return false;
    }
  }
  return true;
}

/**
 * Simple Logger
 * Custom logger for consistent logging throughout the SDK
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Message to log
 */
export function logger(level, message) {
  const levels = ['info', 'warn', 'error'];
  if (!levels.includes(level)) {
    throw new Error("Invalid log level. Use 'info', 'warn', or 'error'.");
  }

  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
}

/**
 * Retry Mechanism for API Requests
 * Automatically retries an async function if it fails
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise<any>} - Resolves if the function succeeds
 */
export async function retry(fn, retries = 3, delay = 1000) {
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        throw new Error(`Failed after ${retries} retries: ${error.message}`);
      }
      console.warn(`Retrying... Attempt ${attempt} of ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Utility to Format WebSocket Messages
 * Parses and validates WebSocket messages
 * @param {string} message - The raw message string
 * @returns {Object|null} - Parsed message object or null if invalid
 */
export function parseWebSocketMessage(message) {
  try {
    const parsed = JSON.parse(message);
    if (parsed.name && typeof parsed.state === 'boolean') {
      return parsed;
    }
    console.warn(`Invalid WebSocket message: ${message}`);
    return null;
  } catch (error) {
    console.error(`Failed to parse WebSocket message: ${message}`);
    return null;
  }
}

// export default {
//   createWebSocketConnection,
//   validateApiResponse,
//   logger,
//   retry,
//   parseWebSocketMessage,
// };
