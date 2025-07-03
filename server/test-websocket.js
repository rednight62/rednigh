const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:5000/ws');

// Create a test WebSocket client
const ws = new WebSocket('ws://localhost:5000/ws?token=test-token');

// Set up event handlers
ws.on('open', () => {
  console.log('✅ WebSocket connection established');
  
  // Send a test message
  ws.send(JSON.stringify({ type: 'PING' }));
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log(`❌ WebSocket connection closed: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Close the connection after 5 seconds
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('Closing WebSocket connection...');
    ws.close();
  }
}, 5000);
