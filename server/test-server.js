const http = require('http');

console.log('Starting test request to http://localhost:5000/api/health');

const options = {
  hostname: '127.0.0.1', // Using IP instead of localhost
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000, // 5 seconds
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Test-Server/1.0'
  }
};

console.log('Request options:', JSON.stringify(options, null, 2));

const req = http.request(options, (res) => {
  console.log(`\n=== RESPONSE RECEIVED ===`);
  console.log(`Status Code: ${res.statusCode} ${res.statusMessage}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let responseData = '';
  
  res.setEncoding('utf8');
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      if (responseData) {
        const parsed = JSON.parse(responseData);
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log('(Empty response body)');
      }
    } catch (e) {
      console.log(responseData || '(No response body)');
    }
    console.log('\n=== END OF RESPONSE ===');
  });
});

req.on('error', (e) => {
  console.error('\n=== REQUEST ERROR ===');
  console.error('Error details:', {
    code: e.code,
    message: e.message,
    stack: e.stack
  });
  console.error('=== END OF ERROR ===\n');
});

req.on('timeout', () => {
  console.error('\n=== REQUEST TIMED OUT ===');
  req.destroy();
  console.error('Request timed out after 5 seconds');
  console.error('=== END OF TIMEOUT ===\n');
});

console.log('Sending request...');
req.end();
