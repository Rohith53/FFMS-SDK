import axios from 'axios';
import { createWebSocketConnection } from './utils.js';
import EventEmitter from 'events';

class FFMS extends EventEmitter {
  constructor({ baseUrl, apiKey, projectId, toggleId, reconnect = true }) {
    super();
    if (!baseUrl || !apiKey || !projectId || !toggleId) {
      throw new Error("baseUrl, apiKey, projectId, and toggleId are required.");
    }

    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.toggleId = toggleId;
    this.reconnect = reconnect; // Enable WebSocket auto-reconnection
    this.toggles = {}; // Caches toggle states
    this.ws = null; // WebSocket instance
    this.validated = false; // Flag for API key and project validation
  }

  /**
   * Validate API key, project ID, and toggle ID with the FFMS backend
   */
  async validate() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/validate`,
        { projectId: this.projectId, toggleId: this.toggleId },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 5000,
        }
      );

      if (response.data.valid) {
        this.validated = true;
        return true;
      } else {
        throw new Error("Validation failed: Invalid API key, project ID, or toggle ID.");
      }
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Initialize SDK: Validate and fetch feature flags
   */
  async initialize() {
    if (!this.validated) {
      await this.validate();
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/projects/${this.projectId}/feature-flags`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 5000,
        }
      );

      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((toggle) => {
          if (toggle.name && typeof toggle.state === 'boolean') {
            this.toggles[toggle.name] = toggle.state;
          }
        });

        this.emit('initialized', this.toggles);
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (error) {
      throw new Error(`Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Get the state of a feature flag
   * @param {string} toggleName
   * @returns {boolean}
   * @throws {Error} if toggleName is invalid
   */
  getFlag(toggleName) {
    if (!this.toggles.hasOwnProperty(toggleName)) {
      throw new Error(`Feature toggle "${toggleName}" does not exist.`);
    }
    return this.toggles[toggleName];
  }

  /**
   * Listen for real-time updates to feature flags
   */
  listenForUpdates() {
    if (!this.validated) {
      throw new Error("Cannot start WebSocket updates without validation.");
    }

    const url = `${this.baseUrl.replace('http', 'ws')}/projects/${this.projectId}/updates`;

    const connectWebSocket = () => {
      this.ws = createWebSocketConnection(url, this.apiKey);

      this.ws.onmessage = (event) => {
        try {
          const updatedToggle = JSON.parse(event.data);

          if (updatedToggle.name && typeof updatedToggle.state === 'boolean') {
            this.toggles[updatedToggle.name] = updatedToggle.state;
            this.emit('flagUpdated', updatedToggle.name, updatedToggle.state);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      this.ws.onclose = () => {
        console.warn("WebSocket connection closed.");
        this.emit('disconnected');
        if (this.reconnect) {
          console.log("Reconnecting...");
          setTimeout(connectWebSocket, 5000); // Retry after 5 seconds
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.emit('error', error);
      };
    };

    connectWebSocket();
  }

  /**
   * Disconnect WebSocket manually
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.emit('disconnected');
    }
  }
}

export default FFMS;
