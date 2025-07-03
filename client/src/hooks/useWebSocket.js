import { useContext, useCallback } from 'react';
import { WebSocketContext } from '../contexts/WebSocketContext';

/**
 * Custom hook to access the WebSocket context with additional helper methods
 * @returns {import('../contexts/WebSocketContext').WebSocketContextType}
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  const {
    socket,
    isConnected,
    connectionStatus,
    lastError,
    logs,
    clientId,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    on,
    off,
    clearLogs
  } = context;
  
  /**
   * Send a typed message through the WebSocket
   * @template T
   * @param {string} type - Message type
   * @param {T} [payload] - Message payload
   * @param {boolean} [queueIfDisconnected=true] - Whether to queue if disconnected
   * @returns {Promise<boolean>} Whether the message was sent or queued
   */
  const send = useCallback(
    async (type, payload, queueIfDisconnected = true) => {
      return sendMessage({ type, payload }, queueIfDisconnected);
    },
    [sendMessage]
  );
  
  /**
   * Subscribe to a specific message type
   * @template T
   * @param {string} messageType - The message type to subscribe to
   * @param {(message: import('../contexts/WebSocketContext').WebSocketMessage<T>) => void} handler - The handler function
   * @returns {() => void} Unsubscribe function
   */
  const subscribe = useCallback(
    (messageType, handler) => {
      return on(messageType, handler);
    },
    [on]
  );
  
  /**
   * Unsubscribe from a specific message type
   * @param {string} messageType - The message type to unsubscribe from
   * @param {(message: import('../contexts/WebSocketContext').WebSocketMessage) => void} handler - The handler function to remove
   */
  const unsubscribe = useCallback(
    (messageType, handler) => {
      off(messageType, handler);
    },
    [off]
  );
  
  /**
   * Subscribe to connection status changes
   * @param {(status: import('../contexts/WebSocketContext').WebSocketStatus) => void} handler - Status change handler
   * @returns {() => void} Unsubscribe function
   */
  const onStatusChange = useCallback(
    (handler) => {
      // Call immediately with current status
      handler(connectionStatus);
      
      // Return unsubscribe function
      return on('connection_status_change', ({ status }) => {
        handler(status);
      });
    },
    [connectionStatus, on]
  );
  
  /**
   * Send a request and wait for a response
   * @template TRequest, TResponse
   * @param {string} type - Request message type
   * @param {TRequest} [payload] - Request payload
   * @param {number} [timeout=10000] - Response timeout in milliseconds
   * @returns {Promise<TResponse>} Response payload
   * @throws {Error} If the request times out or an error occurs
   */
  const request = useCallback(
    (type, payload, timeout = 10000) => {
      return new Promise((resolve, reject) => {
        if (!isConnected) {
          reject(new Error('Not connected to WebSocket server'));
          return;
        }
        
        const requestId = Math.random().toString(36).substring(2, 15);
        const responseType = `${type}_RESPONSE`;
        let timeoutId;
        
        // Set up response handler
        const handleResponse = (message) => {
          if (message.requestId === requestId) {
            cleanup();
            
            if (message.error) {
              reject(new Error(message.error));
            } else {
              resolve(message.payload);
            }
          }
        };
        
        // Set up timeout
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
        
        // Clean up function
        const cleanup = () => {
          clearTimeout(timeoutId);
          off(responseType, handleResponse);
        };
        
        // Subscribe to response
        on(responseType, handleResponse);
        
        // Send request
        sendMessage({
          type,
          requestId,
          payload,
          timestamp: new Date().toISOString()
        }).catch((error) => {
          cleanup();
          reject(error);
        });
      });
    },
    [isConnected, on, off, sendMessage]
  );
  
  return {
    // Core WebSocket properties
    socket,
    isConnected,
    connectionStatus,
    lastError,
    logs,
    clientId,
    
    // Connection management
    connect,
    disconnect,
    reconnect,
    
    // Message handling
    sendMessage,
    send,
    on,
    off,
    subscribe,
    unsubscribe,
    onStatusChange,
    request,
    
    // Logging
    clearLogs
  };
};

export default useWebSocket;
