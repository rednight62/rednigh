# WebSocket Context

A robust WebSocket implementation for React applications with features like automatic reconnection, message queuing, and heartbeat monitoring.

## Features

- 🔄 Automatic reconnection with exponential backoff
- 📨 Message queuing when offline
- ❤️ Heartbeat/ping-pong for connection health
- 🔒 JWT authentication support
- 📝 Debug logging
- 📱 Network status awareness
- 🏗️ TypeScript support
- 🎣 Easy-to-use React hooks

## Installation

1. Install required dependencies:

```bash
npm install uuid react-toastify
# or
yarn add uuid react-toastify
```

2. Copy the following files to your project:
   - `WebSocketContext.jsx` - The main WebSocket context
   - `WebSocketContext.d.ts` - TypeScript type definitions
   - `useWebSocket.js` - Custom hook for easier usage

## Usage

### 1. Wrap your app with WebSocketProvider

```jsx
import React from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <WebSocketProvider>
      <YourApp />
      <ToastContainer position="bottom-right" />
    </WebSocketProvider>
  );
}

export default App;
```

### 2. Use the useWebSocket hook in your components

```jsx
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const { 
    isConnected, 
    send, 
    subscribe, 
    unsubscribe 
  } = useWebSocket();

  // Subscribe to chat messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    // Subscribe to 'CHAT_MESSAGE' events
    const unsubscribeFromMessages = subscribe('CHAT_MESSAGE', handleNewMessage);
    
    // Clean up subscription on unmount
    return () => {
      unsubscribeFromMessages();
    };
  }, [subscribe, unsubscribe]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Send a chat message
    send('SEND_MESSAGE', { text: input });
    setInput('');
  };

  return (
    <div>
      <h2>Chat Room {isConnected ? '🟢' : '🔴'}</h2>
      
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatRoom;
```

## API Reference

### WebSocketProvider Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| children | ReactNode | Yes | Your application components |

### useWebSocket()

Returns an object with the following properties and methods:

#### Connection State
- `socket: WebSocket | null` - The underlying WebSocket instance
- `isConnected: boolean` - Whether the WebSocket is connected
- `connectionStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR'` - Current connection status
- `lastError: Error | null` - The last error that occurred
- `clientId: string` - Unique ID for this client

#### Connection Management
- `connect(): void` - Connect to the WebSocket server
- `disconnect(permanent?: boolean): void` - Disconnect from the server
- `reconnect(): void` - Manually trigger a reconnection

#### Message Handling
- `sendMessage(message: object, queueIfDisconnected?: boolean): Promise<boolean>` - Send a raw message
- `send(type: string, payload?: any, queueIfDisconnected?: boolean): Promise<boolean>` - Send a typed message
- `on(type: string, handler: (message: any) => void): () => void` - Subscribe to a message type
- `off(type: string, handler: (message: any) => void): void` - Unsubscribe from a message type
- `subscribe(type: string, handler: (message: any) => void): () => void` - Alias for `on`
- `unsubscribe(type: string, handler: (message: any) => void): void` - Alias for `off`
- `request(type: string, payload?: any, timeout?: number): Promise<any>` - Send a request and wait for a response
- `onStatusChange(handler: (status: string) => void): () => void` - Subscribe to connection status changes

#### Logging
- `logs: Array<{id: string, timestamp: string, type: string, message: string, data: any}>` - Debug logs
- `clearLogs(): void` - Clear the debug logs

## Configuration

You can modify the WebSocket behavior by updating the `WS_CONFIG` object in `WebSocketContext.jsx`:

```javascript
const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,          // Maximum number of reconnection attempts (0 for infinite)
  RECONNECT_BASE_DELAY: 1000,          // Base delay between reconnection attempts (ms)
  MAX_RECONNECT_DELAY: 30000,          // Maximum delay between reconnection attempts (ms)
  HEARTBEAT_INTERVAL: 15000,           // How often to send heartbeat pings (ms)
  CONNECTION_TIMEOUT: 10000,           // Connection timeout (ms)
  PONG_TIMEOUT: 10000,                 // Time to wait for pong response (ms)
  MAX_QUEUE_SIZE: 100,                 // Maximum number of messages to queue when offline
  DEBUG: process.env.NODE_ENV !== 'production', // Enable debug logging
  AUTO_RECONNECT: true,                // Whether to automatically reconnect
  
  // WebSocket URL (can be overridden)
  get WS_URL() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }
};
```

## Error Handling

The WebSocket context provides several ways to handle errors:

1. **Global Error Handling**: Subscribe to the 'error' event:

```jsx
useEffect(() => {
  const handleError = (error) => {
    console.error('WebSocket error:', error);
    // Show error to user, etc.
  };
  
  const unsubscribe = subscribe('error', handleError);
  return () => unsubscribe();
}, [subscribe]);
```

2. **Per-Request Error Handling**: Use try/catch with the `request` method:

```jsx
const fetchData = async () => {
  try {
    const data = await request('FETCH_DATA');
    setData(data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
};
```

## Best Practices

1. **Connection State**: Always check `isConnected` before sending messages
2. **Clean Up**: Unsubscribe from events when components unmount
3. **Error Handling**: Implement proper error handling for network issues
4. **Message Types**: Use consistent message types across your application
5. **Pagination**: For large datasets, implement pagination in your messages

## Server-Side Implementation

Your WebSocket server should:

1. Authenticate the JWT token from the connection URL
2. Handle ping/pong messages
3. Send appropriate close codes
4. Handle reconnections gracefully

Example server implementation (Node.js with `ws`):

```javascript
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  // Extract token from URL query params
  const token = new URL(req.url, 'http://dummy.com').searchParams.get('token');
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.userId;
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle ping messages
        if (data.type === 'PING') {
          ws.send(JSON.stringify({
            type: 'PONG',
            id: data.id,
            timestamp: new Date().toISOString()
          }));
          return;
        }
        
        // Handle other message types...
        
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`Client disconnected: ${ws.userId} (${code} - ${reason})`);
    });
    
  } catch (error) {
    console.error('Authentication failed:', error);
    ws.close(4001, 'Authentication failed');
  }
});
```

## Testing

To test WebSocket components:

1. Mock the WebSocket connection in your tests
2. Test connection states and error handling
3. Verify message sending/receiving
4. Test reconnection logic

Example test with Jest:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { WebSocketProvider } from './WebSocketContext';

// Mock WebSocket
class MockWebSocket {
  constructor() {
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.readyState = WebSocket.CONNECTING;
  }
  
  send = jest.fn();
  close = jest.fn();
  
  // Test helpers
  triggerOpen() {
    this.readyState = WebSocket.OPEN;
    this.onopen && this.onopen();
  }
  
  triggerMessage(data) {
    this.onmessage && this.onmessage({ data: JSON.stringify(data) });
  }
  
  triggerClose() {
    this.readyState = WebSocket.CLOSED;
    this.onclose && this.onclose();
  }
}

global.WebSocket = MockWebSocket;

describe('WebSocketContext', () => {
  let mockWebSocket;
  
  beforeEach(() => {
    mockWebSocket = new MockWebSocket();
    global.WebSocket = jest.fn(() => mockWebSocket);
  });
  
  it('connects to WebSocket server', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );
    
    // Trigger connection
    mockWebSocket.triggerOpen();
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Verify the WebSocket URL is correct
   - Check CORS and proxy settings on the server
   - Ensure the server is running and accessible

2. **Authentication Fails**
   - Verify the JWT token is valid and not expired
   - Check token extraction on the server
   - Ensure proper CORS headers are set

3. **Messages Not Received**
   - Check message types match between client and server
   - Verify the message handler is properly subscribed
   - Check for network issues or firewalls

4. **Memory Leaks**
   - Ensure all event listeners are properly cleaned up
   - Unsubscribe from messages when components unmount
   - Clear intervals and timeouts

## License

MIT
