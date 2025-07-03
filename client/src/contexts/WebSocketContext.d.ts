import { WebSocket as WS } from 'ws';

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export interface WebSocketMessage<T = any> {
  id: string;
  type: string;
  timestamp: string;
  payload?: T;
  [key: string]: any;
}

export interface QueuedMessage<T = any> {
  id: string;
  message: WebSocketMessage<T>;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
}

export interface WebSocketContextType {
  // The WebSocket instance (can be null if not connected)
  socket: WebSocket | null;
  
  // Connection status
  isConnected: boolean;
  connectionStatus: WebSocketStatus;
  
  // Last error that occurred
  lastError: Error | null;
  
  // Debug logs
  logs: Array<{
    id: string;
    timestamp: string;
    type: 'info' | 'warn' | 'error' | 'success';
    message: string;
    data: string | null;
  }>;
  
  // Client ID for this connection
  clientId: string;
  
  // Connection management
  connect: () => void;
  disconnect: (permanent?: boolean) => void;
  reconnect: () => void;
  
  // Message handling
  sendMessage: <T = any>(
    message: Omit<WebSocketMessage<T>, 'id' | 'timestamp'>,
    queueIfDisconnected?: boolean
  ) => Promise<boolean>;
  
  // Event subscription
  on: <T = any>(
    messageType: string,
    handler: (message: WebSocketMessage<T>) => void
  ) => () => void;
  
  // Event unsubscription
  off: (
    messageType: string,
    handler: (message: WebSocketMessage) => void
  ) => void;
  
  // Clear logs
  clearLogs: () => void;
}

// Extend Window interface to include WebSocket if needed
declare global {
  interface Window {
    WebSocket: typeof WebSocket;
  }
}

// Export the context with proper typing
declare const WebSocketContext: React.Context<WebSocketContextType | null>;
export default WebSocketContext;
