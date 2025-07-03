// WebSocket client for real-time backend events
let ws = null;
let listeners = [];
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

export function connectWS({ onEvent, onError }) {
  // Close existing connection if any
  if (ws) {
    ws.close();
  }

  // Get the WebSocket URL from environment or use default
  const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const wsHost = import.meta.env.VITE_WS_URL || `${window.location.hostname}:5000`;
  const token = getAuthToken();
  const wsUrl = token 
    ? `${wsProtocol}${wsHost}/ws?token=${encodeURIComponent(token)}`
    : `${wsProtocol}${wsHost}/ws`;
  
  // Create new WebSocket connection
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WebSocket] Connected to server');
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    
    // Send a ping message to verify connection
    ws.send(JSON.stringify({ type: 'PING' }));
  };

  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data);
      
      // Handle authentication response
      if (event.type === 'auth' && event.status === 'error') {
        console.error('[WebSocket] Authentication failed:', event.message);
        onError && onError(event);
        return;
      }
      
      // Pass the event to all listeners
      listeners.forEach(fn => fn(event));
      onEvent && onEvent(event);
      
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  };

  ws.onclose = (event) => {
    console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason || 'No reason provided'}`);
    
    // Attempt to reconnect if this wasn't a normal closure
    if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting in ${reconnectDelay/1000} seconds (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
      
      setTimeout(() => {
        connectWS({ onEvent, onError });
      }, reconnectDelay);
    } else if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      onError && onError({ type: 'error', message: 'Connection lost. Please refresh the page.' });
    }
  };

  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error);
    onError && onError({ type: 'error', message: 'WebSocket connection error' });
  };
}

export function addWSEventListener(fn) {
  if (typeof fn === 'function' && !listeners.includes(fn)) {
    listeners.push(fn);
  }
  return () => removeWSEventListener(fn);
}

export function removeWSEventListener(fn) {
  listeners = listeners.filter(f => f !== fn);
}

export function closeWS() {
  if (ws) {
    ws.close(1000, 'User logged out');
    ws = null;
    listeners = [];
  }
}

export function sendWSMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  console.warn('[WebSocket] Cannot send message - connection not open');
  return false;
}
