import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo
} from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

// Create WebSocket context
const WebSocketContext = createContext(null);

// WebSocket configuration
const WS_CONFIG = {
  // Maximum number of reconnection attempts (0 for infinite)
  MAX_RECONNECT_ATTEMPTS: 10,
  // Base delay between reconnection attempts in milliseconds (with exponential backoff)
  RECONNECT_BASE_DELAY: 1000,
  // Maximum delay between reconnection attempts
  MAX_RECONNECT_DELAY: 30000,
  // Heartbeat interval in milliseconds
  HEARTBEAT_INTERVAL: 15000,
  // Timeout for WebSocket connection in milliseconds
  CONNECTION_TIMEOUT: 10000,
  // Time to wait for pong response before considering connection dead
  PONG_TIMEOUT: 10000,
  // Maximum number of queued messages
  MAX_QUEUE_SIZE: 100,
  // Debug mode
  DEBUG: process.env.NODE_ENV !== 'production',
  // Auto-reconnect on close
  AUTO_RECONNECT: true,
  // WebSocket URL (will be built with auth token)
  get WS_URL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }
};

// WebSocket status constants
const WS_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR'
};

// Message types for internal use
const MESSAGE_TYPES = {
  PING: 'PING',
  PONG: 'PONG',
  ERROR: 'ERROR',
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED'
};

// Close codes
const CLOSE_CODES = {
  NORMAL_CLOSURE: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS_RECEIVED: 1005,
  ABNORMAL_CLOSURE: 1006,
  INVALID_FRAME_PAYLOAD_DATA: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  MISSING_EXTENSION: 1010,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  BAD_GATEWAY: 1014,
  // Custom codes
  AUTHENTICATION_FAILED: 4001,
  INVALID_TOKEN: 4002,
  SESSION_EXPIRED: 4003,
  RATE_LIMIT_EXCEEDED: 4004,
  UNAUTHORIZED: 4005,
  INVALID_REQUEST: 4006,
  RESOURCE_NOT_FOUND: 4007,
  CONNECTION_TIMEOUT: 4008,
  SERVER_ERROR: 4500
};

/**
 * WebSocketProvider component that manages WebSocket connections and provides WebSocket context
 * to child components.
 */
export const WebSocketProvider = ({ children }) => {
  // State
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(WS_STATUS.DISCONNECTED);
  const [lastError, setLastError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Refs for values that don't trigger re-renders
  const { isAuthenticated, token, logout } = useAuth();
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const messageQueue = useRef([]);
  const heartbeatInterval = useRef(null);
  const pongTimeout = useRef(null);
  const connectionTimeout = useRef(null);
  const isMounted = useRef(true);
  const clientId = useRef(`client-${uuidv4()}`);
  const pendingPings = useRef(new Map());
  const messageHandlers = useRef(new Map());
  const reconnectBackoff = useRef(WS_CONFIG.RECONNECT_BASE_DELAY);
  const lastActivity = useRef(Date.now());
  const isExplicitDisconnect = useRef(false);

  /**
   * Debug logging function with log levels
   * @param {string} level - Log level (log, info, warn, error, debug)
   * @param {...any} args - Arguments to log
   */
  const debugLog = useCallback((level = 'log', ...args) => {
    if (!WS_CONFIG.DEBUG) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${clientId.current}]`;
    
    const logFn = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }[level] || console.log;
    
    logFn(prefix, ...args);
    
    // Add to logs state for UI display
    if (level === 'error' || level === 'warn') {
      addLog(args.join(' '), level);
    }
  }, []);
  
  /**
   * Add a log entry to the logs state
   * @param {string} message - Log message
   * @param {string} type - Log type (info, warn, error, success)
   * @param {any} [data] - Additional data to include with the log
   */
  const addLog = useCallback((message, type = 'info', data = null) => {
    if (!isMounted.current) return;
    
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    // Keep only the last 100 logs to prevent memory issues
    setLogs(prevLogs => [...prevLogs.slice(-99), logEntry]);
    
    // Show toast for important messages
    if (type === 'error') {
      toast.error(message, { autoClose: 5000 });
    } else if (type === 'warn') {
      toast.warn(message, { autoClose: 3000 });
    } else if (type === 'success') {
      toast.success(message, { autoClose: 2000 });
    }
  }, []);

  /**
   * Update connection status and log the change
   * @param {string} status - New connection status
   * @param {Error} [error] - Optional error associated with the status change
   */
  const updateStatus = useCallback((status, error = null) => {
    if (!isMounted.current) return;
    
    debugLog('info', `Status changed: ${status}`, error ? { error } : '');
    setConnectionStatus(status);
    
    if (error) {
      setLastError(error);
      addLog(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
    }
  }, [debugLog, addLog]);
  
  /**
   * Clean up WebSocket resources
   */
  const cleanupSocket = useCallback(() => {
    debugLog('debug', 'Cleaning up WebSocket resources');
    
    // Clear intervals and timeouts
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    if (pongTimeout.current) {
      clearTimeout(pongTimeout.current);
      pongTimeout.current = null;
    }
    
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    // Clear any pending pings
    for (const [id, { reject }] of pendingPings.current.entries()) {
      reject(new Error('Connection closed'));
      pendingPings.current.delete(id);
    }
    
    // Close the socket if it's still open
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(CLOSE_CODES.NORMAL_CLOSURE, 'Client disconnecting');
        }
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
      } catch (error) {
        debugLog('error', 'Error while cleaning up socket:', error);
      }
    }
  }, [socket, debugLog]);

  /**
   * Disconnect from the WebSocket server
   * @param {boolean} [permanent=false] - If true, prevents auto-reconnect
   */
  const disconnect = useCallback((permanent = false) => {
    if (permanent) {
      isExplicitDisconnect.current = true;
    }
    
    debugLog('info', 'Disconnecting WebSocket', { permanent });
    
    // Clear any pending reconnection attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    // Close the socket if it's open
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(
            permanent ? CLOSE_CODES.NORMAL_CLOSURE : CLOSE_CODES.GOING_AWAY,
            permanent ? 'User disconnected' : 'Temporary disconnect'
          );
        } else {
          // If socket is not open, clean up immediately
          cleanupSocket();
          updateStatus(WS_STATUS.DISCONNECTED);
        }
      } catch (error) {
        debugLog('error', 'Error while disconnecting:', error);
      }
    } else {
      // If there's no socket, just make sure we're in the right state
      updateStatus(WS_STATUS.DISCONNECTED);
    }
  }, [socket, cleanupSocket, debugLog, updateStatus]);
  
  /**
   * Handle reconnection with exponential backoff and jitter
   */
  const handleReconnect = useCallback(() => {
    if (!isMounted.current) return;
    
    // Don't reconnect if already reconnecting or max attempts reached
    if (
      connectionStatus === WS_STATUS.RECONNECTING ||
      (WS_CONFIG.MAX_RECONNECT_ATTEMPTS > 0 && 
       reconnectAttempts.current >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS)
    ) {
      debugLog('warn', 'Max reconnection attempts reached');
      updateStatus(WS_STATUS.ERROR, new Error('Max reconnection attempts reached'));
      return;
    }
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      reconnectBackoff.current * Math.pow(1.5, reconnectAttempts.current),
      WS_CONFIG.MAX_RECONNECT_DELAY
    );
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    const delay = Math.floor(baseDelay + jitter);
    
    reconnectAttempts.current++;
    updateStatus(WS_STATUS.RECONNECTING);
    
    debugLog('info', `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
    
    // Clear any existing timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Set new timeout
    reconnectTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        connect();
      }
    }, delay);
  }, [connectionStatus, connect, debugLog, updateStatus]);
  
  /**
   * Reconnect to the WebSocket server
   */
  const reconnect = useCallback(() => {
    debugLog('info', 'Reconnecting WebSocket...');
    disconnect(false); // Temporary disconnect
    connect();
  }, [connect, disconnect, debugLog]);
  
  /**
   * Send a message through the WebSocket
   * @param {Object} message - The message to send
   * @param {boolean} [queueIfDisconnected=true] - Whether to queue the message if disconnected
   * @returns {Promise<boolean>} Whether the message was sent or queued
   */
  const sendMessage = useCallback(async (message, queueIfDisconnected = true) => {
    if (!message || typeof message !== 'object') {
      throw new Error('Message must be an object');
    }
    
    // If not connected and should queue, add to queue
    if (connectionStatus !== WS_STATUS.CONNECTED) {
      if (queueIfDisconnected) {
        if (messageQueue.current.length < WS_CONFIG.MAX_QUEUE_SIZE) {
          messageQueue.current.push({
            id: uuidv4(),
            message,
            timestamp: Date.now(),
            retryCount: 0
          });
          debugLog('debug', 'Message queued', { message, queueSize: messageQueue.current.length });
          return true;
        } else {
          debugLog('warn', 'Message queue full, dropping message', message);
          return false;
        }
      }
      debugLog('warn', 'Not connected and queueIfDisconnected is false, dropping message', message);
      return false;
    }
    
    try {
      // Add message ID and timestamp
      const messageWithId = {
        ...message,
        id: uuidv4(),
        timestamp: new Date().toISOString()
      };
      
      socket.send(JSON.stringify(messageWithId));
      debugLog('debug', 'Message sent', messageWithId);
      return true;
    } catch (error) {
      debugLog('error', 'Error sending message:', error);
      if (queueIfDisconnected) {
        messageQueue.current.push({
          id: uuidv4(),
          message,
          timestamp: Date.now(),
          retryCount: 0
        });
        debugLog('debug', 'Message queued after send error', { message, queueSize: messageQueue.current.length });
        return true;
      }
      return false;
    }
  }, [connectionStatus, socket, debugLog]);
  
  /**
   * Register a message handler
   * @param {string} messageType - The message type to handle
   * @param {Function} handler - The handler function
   * @returns {Function} Unsubscribe function
   */
  const on = useCallback((messageType, handler) => {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    if (!messageHandlers.current.has(messageType)) {
      messageHandlers.current.set(messageType, new Set());
    }
    
    const handlers = messageHandlers.current.get(messageType);
    handlers.add(handler);
    
    // Return cleanup function
    return () => {
      if (messageHandlers.current.has(messageType)) {
        const handlers = messageHandlers.current.get(messageType);
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          messageHandlers.current.delete(messageType);
        }
      }
    };
  }, []);
  
  /**
   * Unregister a message handler
   * @param {string} messageType - The message type
   * @param {Function} handler - The handler function to remove
   */
  const off = useCallback((messageType, handler) => {
    if (messageHandlers.current.has(messageType)) {
      const handlers = messageHandlers.current.get(messageType);
      handlers.delete(handler);
      
      if (handlers.size === 0) {
        messageHandlers.current.delete(messageType);
      }
    }
  }, []);
  
  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(() => {
    if (!isMounted.current) {
      debugLog('warn', 'Attempted to connect after component unmount');
      return;
    }
    
    if (!isAuthenticated || !token) {
      debugLog('warn', 'Not authenticated, cannot connect WebSocket');
      return;
    }
    
    // Clean up any existing connection
    cleanupSocket();
    
    // Set up new connection
    updateStatus(WS_STATUS.CONNECTING);
    isExplicitDisconnect.current = false;
    
    try {
      // Create WebSocket connection with auth token
      const wsUrl = new URL(WS_CONFIG.WS_URL);
      wsUrl.searchParams.set('token', token);
      
      const newSocket = new WebSocket(wsUrl.toString());
      setSocket(newSocket);
      
      // Set up event listeners
      newSocket.onopen = () => {
        if (!isMounted.current) return;
        
        debugLog('info', 'WebSocket connected');
        updateStatus(WS_STATUS.CONNECTED);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        lastActivity.current = Date.now();
        
        // Start heartbeat
        startHeartbeat();
        
        // Process any queued messages
        processMessageQueue();
      };
      
      newSocket.onmessage = (event) => {
        if (!isMounted.current) return;
        
        lastActivity.current = Date.now();
        
        try {
          const message = JSON.parse(event.data);
          debugLog('debug', 'Message received', message);
          
          // Handle internal message types
          switch (message.type) {
            case MESSAGE_TYPES.PING:
              // Respond to ping with pong
              sendMessage({ type: MESSAGE_TYPES.PONG, id: message.id });
              break;
              
            case MESSAGE_TYPES.PONG:
              // Handle pong response
              if (pendingPings.current.has(message.id)) {
                const { resolve } = pendingPings.current.get(message.id);
                pendingPings.current.delete(message.id);
                resolve(true);
              }
              break;
              
            case MESSAGE_TYPES.CONNECTION_ESTABLISHED:
              debugLog('info', 'Connection established with server');
              break;
              
            default:
              // Forward to registered handlers
              if (message.type && messageHandlers.current.has(message.type)) {
                const handlers = messageHandlers.current.get(message.type);
                handlers.forEach(handler => {
                  try {
                    handler(message);
                  } catch (error) {
                    debugLog('error', 'Error in message handler:', error);
                  }
                });
              }
              break;
          }
        } catch (error) {
          debugLog('error', 'Error processing message:', error, event.data);
        }
      };
      
      newSocket.onerror = (error) => {
        if (!isMounted.current) return;
        
        debugLog('error', 'WebSocket error:', error);
        updateStatus(WS_STATUS.ERROR, new Error('WebSocket error'));
      };
      
      newSocket.onclose = (event) => {
        if (!isMounted.current) return;
        
        debugLog('info', 'WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // Clean up resources
        cleanupSocket();
        
        // Update status and attempt to reconnect if needed
        if (isExplicitDisconnect.current) {
          updateStatus(WS_STATUS.DISCONNECTED);
        } else {
          updateStatus(WS_STATUS.DISCONNECTED, new Error(`Connection closed: ${event.reason || 'Unknown reason'}`));
          handleReconnect();
        }
      };
      
      // Set connection timeout
      connectionTimeout.current = setTimeout(() => {
        if (connectionStatus === WS_STATUS.CONNECTING) {
          debugLog('warn', 'WebSocket connection timeout');
          newSocket.close(CLOSE_CODES.CONNECTION_TIMEOUT, 'Connection timeout');
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);
      
    } catch (error) {
      debugLog('error', 'Error creating WebSocket:', error);
      updateStatus(WS_STATUS.ERROR, error);
      handleReconnect();
    }
  }, [
    isAuthenticated,
    token,
    cleanupSocket,
    updateStatus,
    startHeartbeat,
    processMessageQueue,
    sendMessage,
    handleReconnect,
    debugLog,
    connectionStatus
  ]);
  
  /**
   * Process queued messages
   */
  const processMessageQueue = useCallback(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Process messages in batches to avoid blocking
    const batchSize = 10;
    const batch = messageQueue.current.splice(0, batchSize);
    
    for (const { message, id, retryCount } of batch) {
      try {
        await sendMessage(message, false);
        debugLog('debug', 'Queued message sent', { id, retryCount });
      } catch (error) {
        debugLog('warn', 'Failed to send queued message, will retry', { id, retryCount, error });
        
        // Requeue with updated retry count
        messageQueue.current.push({
          ...message,
          id,
          retryCount: (retryCount || 0) + 1,
          lastAttempt: Date.now()
        });
      }
    }
    
    // If there are more messages, process them after a short delay
    if (messageQueue.current.length > 0) {
      setTimeout(processMessageQueue, 100);
    }
  }, [socket, sendMessage, debugLog]);
  
  /**
   * Send a ping and wait for pong
   */
  const sendPing = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.resolve(false);
    }
    
    return new Promise((resolve) => {
      const pingId = uuidv4();
      
      // Set timeout for pong response
      const timeout = setTimeout(() => {
        pendingPings.current.delete(pingId);
        resolve(false);
      }, WS_CONFIG.PONG_TIMEOUT);
      
      // Store the ping to match with pong
      pendingPings.current.set(pingId, {
        timestamp: Date.now(),
        resolve: (success) => {
          clearTimeout(timeout);
          resolve(success);
        }
      });
      
      // Send ping
      try {
        socket.send(JSON.stringify({
          type: MESSAGE_TYPES.PING,
          id: pingId,
          timestamp: Date.now()
        }));
      } catch (error) {
        clearTimeout(timeout);
        pendingPings.current.delete(pingId);
        resolve(false);
      }
    });
  }, [socket]);
  
  /**
   * Start the heartbeat mechanism
   */
  const startHeartbeat = useCallback(() => {
    // Clear any existing interval
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(async () => {
      if (!isMounted.current || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      try {
        const success = await sendPing();
        if (!success) {
          debugLog('warn', 'Heartbeat failed, reconnecting...');
          handleReconnect();
        } else {
          debugLog('debug', 'Heartbeat successful');
        }
      } catch (error) {
        debugLog('error', 'Error in heartbeat:', error);
      }
    }, WS_CONFIG.HEARTBEAT_INTERVAL);
  }, [socket, sendPing, handleReconnect, debugLog]);

  // Context value
  const contextValue = useMemo(() => ({
    socket,
    isConnected: connectionStatus === WS_STATUS.CONNECTED,
    connectionStatus,
    lastError,
    logs,
    clientId: clientId.current,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    on,
    off,
    clearLogs: () => setLogs([])
  }), [
    socket,
    connectionStatus,
    lastError,
    logs,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    on,
    off
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access the WebSocket context
 * @returns {Object} WebSocket context
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
