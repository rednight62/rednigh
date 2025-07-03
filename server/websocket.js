import { WebSocketServer as WSServer } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import debugModule from 'debug';

const debug = debugModule('websocket:server');

// Constants
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB max message size
const PING_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 45000; // 45 seconds (must be greater than PING_INTERVAL)

// Custom error classes
class WebSocketError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
  }
}

class WebSocketServer {
  constructor(server) {
    this.wss = new WSServer({ 
      server, 
      path: '/ws',
      maxPayload: MAX_MESSAGE_SIZE,
      clientTracking: true
    });
    
    this.clients = new Map(); // Map to store connected clients
    this.connectionTimeouts = new Map(); // Track connection timeouts
    this.pingIntervals = new Map(); // Track ping intervals
    
    this.setupEventHandlers();
    debug('WebSocket server initialized');
    
    // Setup cleanup on server close
    this.cleanup = this.cleanup.bind(this);
    process.on('SIGTERM', this.cleanup);
    process.on('SIGINT', this.cleanup);
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const connectionId = uuidv4();
      const clientIp = req.socket.remoteAddress;
      debug(`New WebSocket connection [${connectionId}] from ${clientIp}`);
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          debug(`Connection timeout for [${connectionId}]`);
          ws.close(4008, 'Connection timeout');
        }
      }, CONNECTION_TIMEOUT);
      this.connectionTimeouts.set(ws, connectionTimeout);
      
      // Extract token from URL query parameters
      let token;
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        token = url.searchParams.get('token');
        
        if (!token) {
          throw new WebSocketError('No authentication token provided', 'AUTH_REQUIRED');
        }
      } catch (error) {
        debug(`Invalid connection URL: ${error.message}`);
        ws.close(4002, 'Invalid connection URL');
        return;
      }
      
      // Verify JWT token
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        debug(`User ${userId} authenticated [${connectionId}]`);
      } catch (error) {
        debug(`Authentication failed for [${connectionId}]: ${error.message}`);
        ws.close(4003, 'Invalid authentication token');
        return;
      }
      
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      this.connectionTimeouts.delete(ws);
      
      // Store the WebSocket connection with user ID
      this.clients.set(ws, { userId, connectionId, ip: clientIp });
      
      // Setup ping/pong for connection health
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, PING_INTERVAL);
      this.pingIntervals.set(ws, pingInterval);
      
      // Send welcome message
      const welcomeMessage = {
        type: 'CONNECTION_ESTABLISHED',
        message: 'WebSocket connection established',
        connectionId,
        timestamp: new Date().toISOString()
      };
      
      this.sendMessage(ws, welcomeMessage);
      
      // Set up message handler with size validation
      ws.on('message', (message) => {
        try {
          if (message.length > MAX_MESSAGE_SIZE) {
            throw new WebSocketError('Message too large', 'MESSAGE_TOO_LARGE');
          }
          this.handleMessage(ws, message);
        } catch (error) {
          debug(`Error handling message: ${error.message}`);
          this.sendError(ws, {
            code: error.code || 'MESSAGE_PROCESSING_ERROR',
            message: error.message
          });
        }
      });
      
      // Set up close handler
      ws.on('close', (code, reason) => {
        debug(`Connection closed [${connectionId}]: ${code} - ${reason || 'No reason'}`);
        this.cleanupClient(ws);
      });
      
      // Set up error handler
      ws.on('error', (error) => {
        debug(`WebSocket error [${connectionId}]:`, error.message);
        this.cleanupClient(ws);
      });
      
      // Handle pong responses
      ws.on('pong', () => {
        debug(`Received pong from [${connectionId}]`);
        // Reset any connection timeout logic if needed
      });
    });
    
    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }
  
  async handleMessage(ws, message) {
    const client = this.clients.get(ws);
    if (!client) {
      debug('Received message from unregistered client');
      return;
    }
    
    let data;
    try {
      data = JSON.parse(message);
      debug(`Received message from ${client.userId} [${client.connectionId}]:`, data);
      
      // Validate message structure
      if (!data || typeof data !== 'object') {
        throw new WebSocketError('Invalid message format', 'INVALID_MESSAGE');
      }
      
      // Handle different message types
      switch (data.type) {
        case 'PING':
          await this.handlePing(ws, data);
          break;
          
        // Add more message handlers as needed
        
        default:
          debug(`Unknown message type: ${data.type}`);
          this.sendError(ws, {
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: `Unknown message type: ${data.type}`
          });
      }
    } catch (error) {
      debug(`Error processing message from ${client.userId} [${client.connectionId}]:`, error.message);
      this.sendError(ws, {
        code: error.code || 'MESSAGE_PROCESSING_ERROR',
        message: error.message
      });
    }
  }
  
  async handlePing(ws, data) {
    const response = {
      type: 'PONG',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    };
    
    if (data.id) {
      response.id = data.id; // Echo back the message ID for request/response tracking
    }
    
    await this.sendMessage(ws, response);
  }
  
  // Send a message to a specific client
  async sendMessage(ws, message) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketError('WebSocket is not connected', 'NOT_CONNECTED');
    }
    
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    return new Promise((resolve, reject) => {
      ws.send(messageStr, (error) => {
        if (error) {
          debug('Error sending message:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  // Send an error message to a client
  sendError(ws, { code, message, details } = {}) {
    const errorResponse = {
      type: 'ERROR',
      error: {
        code: code || 'UNKNOWN_ERROR',
        message: message || 'An unknown error occurred',
        timestamp: new Date().toISOString()
      }
    };
    
    if (details) {
      errorResponse.error.details = details;
    }
    
    this.sendMessage(ws, errorResponse).catch(error => {
      debug('Failed to send error message:', error);
    });
  }
  
  // Broadcast a message to all connected clients
  broadcast(message, options = {}) {
    const { exclude = [], includeOnly = null } = options;
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    let clients = Array.from(this.wss.clients);
    
    // Filter clients if needed
    if (includeOnly) {
      clients = clients.filter(client => includeOnly.includes(this.clients.get(client)?.userId));
    }
    
    // Send to all eligible clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && !exclude.includes(this.clients.get(client)?.userId)) {
        client.send(messageStr);
      }
    });
  }
  
  // Cleanup client resources
  cleanupClient(ws) {
    // Clear ping interval
    if (this.pingIntervals.has(ws)) {
      clearInterval(this.pingIntervals.get(ws));
      this.pingIntervals.delete(ws);
    }
    
    // Clear connection timeout
    if (this.connectionTimeouts.has(ws)) {
      clearTimeout(this.connectionTimeouts.get(ws));
      this.connectionTimeouts.delete(ws);
    }
    
    // Remove from clients map
    this.clients.delete(ws);
  }
  
  // Cleanup all resources
  cleanup() {
    debug('Cleaning up WebSocket server...');
    
    // Close all client connections
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });
    
    // Clear all intervals and timeouts
    this.pingIntervals.forEach(interval => clearInterval(interval));
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    
    // Clear all maps
    this.pingIntervals.clear();
    this.connectionTimeouts.clear();
    this.clients.clear();
    
    // Close the WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        debug('WebSocket server closed');
        resolve();
      });
    });
  }
  
  // Send a message to a specific user
  sendToUser(userId, message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && this.clients.get(client) === userId) {
        client.send(message);
      }
    });
  }
}

export default WebSocketServer;
