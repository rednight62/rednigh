// Universal API Connector Framework
// For: private sector, government, retail, education, payments, etc.
// Usage: Register new connectors for any service type

const connectors = {};

/**
 * Register a new connector
 * @param {string} name - Unique name
 * @param {object} connector - { type, description, connect, search, get, post, ... }
 */
function registerConnector(name, connector) {
  connectors[name] = connector;
}

/**
 * List all available connectors
 */
function listConnectors() {
  return Object.keys(connectors).map(name => ({ name, ...connectors[name] }));
}

/**
 * Get a connector by name
 */
function getConnector(name) {
  return connectors[name];
}

module.exports = {
  registerConnector,
  listConnectors,
  getConnector,
  connectors
};
