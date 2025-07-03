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
  }, [addLog]);
  
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
   * Process queued messages with retry logic
   * @returns {Promise<number>} Number of messages processed
   */
  const processMessageQueue = useCallback(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return 0;
    }
    
    const failedMessages = [];
    let processedCount = 0;
    
    // Process up to 10 messages at a time to prevent blocking
    const batchSize = 10;
    const batch = messageQueue.current.splice(0, batchSize);
    
    for (const { message, id, retryCount = 0 } of batch) {
      try {
        // Skip if max retries exceeded
        if (retryCount >= 3) {
          debugLog('warn', `Max retries exceeded for message ${id}`);
          addLog(`Failed to send message after 3 attempts`, 'error', { messageId: id });
          continue;
        }
        
        // Add message ID for tracking
        const messageWithId = {
          ...message,
          id: id || uuidv4(),
          timestamp: new Date().toISOString()
        };
        
        await new Promise((resolve, reject) => {
          try {
            socket.send(JSON.stringify(messageWithId), (error) => {
              if (error) {
                debugLog('error', 'Error sending message:', error);
                reject(error);
              } else {
                debugLog('debug', 'Message sent successfully:', messageWithId);
                resolve();
              }
            });
          } catch (error) {
            debugLog('error', 'Exception while sending message:', error);
            reject(error);
          }
        });
        
        processedCount++;
      } catch (error) {
        debugLog('warn', `Failed to send message (attempt ${retryCount + 1}/3):`, error);
        failedMessages.push({ message, id, retryCount: retryCount + 1 });
      }
    }
    
    // Requeue failed messages
    if (failedMessages.length > 0) {
      messageQueue.current.unshift(...failedMessages);
      
      // Schedule next retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, failedMessages[0].retryCount), 10000);
      setTimeout(processMessageQueue, delay);
    }
    
    return processedCount;
  }, [socket, debugLog, addLog]);

  // Handle reconnection logic
  const handleReconnect = useCallback(() => {
    if (!isMounted.current) return;
    
    // Don't reconnect if already reconnecting or max attempts reached
    if (
      connectionStatus === WS_STATUS.RECONNECTING ||
      (WS_CONFIG.MAX_RECONNECT_ATTEMPTS > 0 && reconnectAttempts.current >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS)
    ) {
      debugLog('warn', 'Skipping reconnection - already reconnecting or max attempts reached');
      return;
    }

    // Clean up resources
    cleanupSocket();
    
    // Set up new connection
    setConnectionStatus(WS_STATUS.CONNECTING);
    
    try {
      // Build WebSocket URL with auth token
      const wsUrl = new URL(WS_CONFIG.WS_URL);
      wsUrl.searchParams.set('token', token);
      
      debugLog('info', `Connecting to WebSocket: ${wsUrl.toString()}`);
      
      // Create new WebSocket connection
      const newSocket = new WebSocket(wsUrl.toString());
      
      // Set up event handlers
      newSocket.onopen = () => {
        if (!isMounted.current) {
          newSocket.close();
          return;
        }
        
        debugLog('info', 'WebSocket connection opened');
        // The actual connection status will be set when we receive CONNECTION_ESTABLISHED
        
        // Start heartbeat after a short delay to avoid immediate ping-pong
        setTimeout(() => setupHeartbeat(), 1000);
      };
      
      newSocket.onmessage = (event) => {
        if (!isMounted.current) return;
        
        try {
          const message = JSON.parse(event.data);
          debugLog('debug', 'Received message:', message);
          
          // Update last activity timestamp
          lastActivity.current = Date.now();
          
          // Handle different message types
          switch (message.type) {
            case MESSAGE_TYPES.PONG:
              // Handle pong response to our ping
              if (message.id && pendingPings.current.has(message.id)) {
                const pending = pendingPings.current.get(message.id);
                if (pending) {
                  clearTimeout(pending.timeout);
                  pending.resolve(true);
                  pendingPings.current.delete(message.id);
                }
              }
              break;
              
            case MESSAGE_TYPES.CONNECTION_ESTABLISHED:
              debugLog('info', 'WebSocket connection established:', message);
              setConnectionStatus(WS_STATUS.CONNECTED);
              reconnectAttempts.current = 0; // Reset reconnect attempts
              reconnectBackoff.current = WS_CONFIG.RECONNECT_BASE_DELAY; // Reset backoff
              processMessageQueue(); // Process any queued messages
              break;
              
            case MESSAGE_TYPES.ERROR:
              debugLog('error', 'Server error:', message.error);
              addLog(`Server error: ${message.error}`, 'error');
              
              // Handle authentication errors
              if (message.error === 'UNAUTHORIZED' || message.error === 'INVALID_TOKEN') {
                debugLog('warn', 'Authentication failed, logging out...');
                logout();
              }
              break;
              
            default:
              // Forward to registered message handlers
              if (message.type && messageHandlers.current.has(message.type)) {
                const handlers = messageHandlers.current.get(message.type);
                handlers.forEach(handler => {
                  try {
                    handler(message);
                  } catch (err) {
                    debugLog('error', 'Error in message handler:', err);
                  }
                });
              } else {
                debugLog('debug', 'Unhandled message type:', message.type);
              }
          }
        } catch (error) {
          debugLog('error', 'Error processing message:', error);
          addLog(`Error processing message: ${error.message}`, 'error');
        }
      };
      
      newSocket.onerror = (error) => {
        debugLog('error', 'WebSocket error:', error);
        addLog('WebSocket connection error', 'error', { error: error.message });
        setConnectionStatus(WS_STATUS.ERROR);
        setLastError(error);
      };
      
      newSocket.onclose = (event) => {
        if (!isMounted.current) return;
        
        debugLog('warn', 'WebSocket closed:', event.code, event.reason);
        addLog(`Connection closed: ${event.reason || 'No reason provided'}`, 'warn', {
          code: event.code,
          wasClean: event.wasClean
        });
        
        // Clean up resources
        cleanupSocket();
        
        // Only attempt to reconnect if the close was unexpected and auto-reconnect is enabled
        if (
          WS_CONFIG.AUTO_RECONNECT &&
          isMounted.current && 
          event.code !== 1000 && // Not a normal closure
          !isExplicitDisconnect.current
        ) {
          handleReconnect();
        }
      };
      
      setSocket(newSocket);
      return newSocket;
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      addLog(`Failed to create WebSocket: ${error.message}`, 'error');
      updateStatus(WS_STATUS.ERROR, error.message);
      handleReconnect();
      return null;
    }
  }, [isAuthenticated, token, updateStatus, handleReconnect, processMessageQueue, addLog, debugLog, cleanup]);

  // Set up heartbeat for WebSocket connection
  const setupHeartbeat = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      debugLog('warn', 'Cannot setup heartbeat: WebSocket not connected');
      return;
    }
    
    // Clear any existing interval
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    debugLog('debug', 'Setting up heartbeat...');
    
    // Send initial ping
    const sendInitialPing = async () => {
      try {
        const isAlive = await sendPing();
        if (!isAlive) {
          debugLog('warn', 'Initial ping failed, reconnecting...');
          reconnect();
          return;
        }
        
        // Set up regular heartbeat
        heartbeatInterval.current = setInterval(async () => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            debugLog('warn', 'WebSocket not open, stopping heartbeat');
            clearInterval(heartbeatInterval.current);
            heartbeatInterval.current = null;
            return;
          }
          
          try {
            const isAlive = await sendPing();
            if (!isAlive) {
              debugLog('warn', 'Heartbeat failed, reconnecting...');
              reconnect();
            }
          } catch (error) {
            debugLog('error', 'Heartbeat error:', error);
            reconnect();
          }
        }, WS_CONFIG.HEARTBEAT_INTERVAL);
      } catch (error) {
        debugLog('error', 'Initial ping error:', error);
        reconnect();
      }
    };
    
    sendInitialPing();
    
    // Cleanup function
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [socket, sendPing, reconnect, debugLog]);

  // Effect to handle WebSocket connection lifecycle
  useEffect(() => {
    if (isAuthenticated) {
      debugLog('Authentication detected, connecting WebSocket...');
      connect();
    } else {
      debugLog('Not authenticated, skipping WebSocket connection');
      updateStatus(WS_STATUS.DISCONNECTED);
    }
    
    // Cleanup on unmount
    return () => {
      debugLog('Cleaning up WebSocket provider');
      isMounted.current = false;
      cleanup();
    };
  }, [isAuthenticated, connect, cleanup, debugLog, updateStatus]);
  
  // Effect to handle token changes
  useEffect(() => {
    if (isAuthenticated && token) {
      debugLog('Authentication token updated, reconnecting WebSocket...');
      connect();
    }
  }, [token, isAuthenticated, connect]);

  // Effect to handle connection when authenticated or token changes
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      // Clean up if not authenticated
      disconnect(true);
    }
    
    return () => {
      if (isMounted.current) {
        disconnect(true);
      }
      isMounted.current = false;
    };
  }, [isAuthenticated, token, connect, disconnect]);

  // Effect to handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      debugLog('info', 'Network status: online');
      setIsOnline(true);
      if (isAuthenticated && connectionStatus === WS_STATUS.DISCONNECTED) {
        debugLog('info', 'Reconnecting after coming online...');
        connect();
      }
    };
    
    const handleOffline = () => {
      debugLog('warn', 'Network status: offline');
      setIsOnline(false);
      // Don't disconnect immediately, let the heartbeat detect the issue
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, connectionStatus, connect, debugLog]);

  // Function to send messages through WebSocket
  const sendMessage = useCallback((message) => {
    if (!isMounted.current) {
      debugLog('Component unmounted, not sending message:', message);
      return false;
    }
    
    if (!message || typeof message !== 'object') {
      const error = new Error('Message must be an object');
      console.error('Invalid message:', error);
      addLog(`Error sending message: ${error.message}`, 'error');
      return false;
    }
    
    // Add metadata to the message
    const messageWithMetadata = {
      ...message,
      timestamp: new Date().toISOString(),
      clientId: clientId.current
    };
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(messageWithMetadata));
        debugLog('Message sent:', messageWithMetadata);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        addLog(`Error sending message: ${error.message}`, 'error');
        
        // Queue the message for later retry
        messageQueue.current.push(messageWithMetadata);
        return false;
      }
    } else {
      // Queue the message if the socket isn't ready
      debugLog('Socket not ready, queuing message:', messageWithMetadata);
      messageQueue.current.push(messageWithMetadata);
      
      // Try to reconnect if we're not already connected
      if (connectionStatus !== WS_STATUS.CONNECTED && connectionStatus !== WS_STATUS.CONNECTING) {
        debugLog('Attempting to reconnect...');
        handleReconnect();
      }
      
      return false;
    }
  }, [socket, connectionStatus, handleReconnect, addLog, debugLog]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Provide WebSocket context value
  const contextValue = useMemo(() => ({
    socket,
    connectionStatus,
    lastError,
    logs,
    isOnline,
    clientId: clientId.current,
    sendMessage,
    disconnect,
    reconnect,
    on,
    off,
    clearLogs: () => setLogs([]),
    getQueueSize: () => messageQueue.current.length,
    getPendingPings: () => pendingPings.current.size,
  }), [
    socket,
    connectionStatus,
    lastError,
    logs,
    isOnline,
    sendMessage,
    disconnect,
    reconnect,
    on,
    off
  ]);
  }), [socket, connectionStatus, lastError, sendMessage, logs, handleReconnect, debugLog, clearLogs]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to access the WebSocket context
 * @returns {Object} WebSocket context with:
 *   - socket: The WebSocket instance
 *   - isConnected: Boolean indicating if the socket is connected
 *   - connectionStatus: Current connection status (CONNECTING, CONNECTED, DISCONNECTED, RECONNECTING, ERROR)
 *   - lastError: Last error that occurred
 *   - sendMessage: Function to send messages through the WebSocket
 *   - logs: Array of connection logs
 *   - clientId: Unique ID for this client
 *   - reconnect: Function to manually trigger a reconnection
 *   - clearLogs: Function to clear the logs
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Export the context itself for direct usage if needed
export { WebSocketContext };

// Default export the WebSocketProvider component
export default WebSocketProvider;
