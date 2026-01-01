/**
 * Hybrid Cloud Integration Validator
 * 
 * This script tests the dashboard's ability to connect to both local relay agent
 * and cloud backend services, validating the hybrid cloud architecture.
 */

const WebSocket = require('ws');

// Configuration
const LOCAL_RELAY_URL = 'ws://localhost:8765';
const CLOUD_BACKEND_URL = 'wss://blackbox.digitalocean.app/ws';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Test data handlers
let receivedVideoFrames = 0;
let receivedTelemetryData = 0;
let receivedAiFeedback = 0;
let receivedVoiceData = 0;
let connectionStatus = false;

/**
 * Test WebSocket connection to a server
 * @param {string} url - WebSocket server URL
 * @param {string} name - Server name for logging
 * @param {string} [token] - Optional JWT token for authentication
 * @returns {Promise<boolean>} - Connection success status
 */
function testWebSocketConnection(url, name, token = null) {
  return new Promise((resolve) => {
    console.log(`=== Testing ${name} Connection ===`);
    console.log(`Connecting to: ${url}`);
    
    // Reset counters
    receivedVideoFrames = 0;
    receivedTelemetryData = 0;
    receivedAiFeedback = 0;
    receivedVoiceData = 0;
    connectionStatus = false;
    
    // Connect to WebSocket server
    const connectionUrl = token ? `${url}?token=${token}` : url;
    const ws = new WebSocket(connectionUrl);
    
    // Set timeout for connection attempt
    const connectionTimeout = setTimeout(() => {
      console.log(`Connection to ${name} timed out after 10 seconds`);
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        resolve(false);
      }
    }, 10000);
    
    // Connection opened
    ws.on('open', () => {
      console.log(`Connected to ${name}`);
      connectionStatus = true;
      clearTimeout(connectionTimeout);
      
      // Send configuration message
      const config = {
        clientType: 'dashboard',
        clientId: 'validation-test',
        cloudMode: name === 'Cloud Backend'
      };
      
      ws.send(JSON.stringify({
        type: 'config',
        data: config
      }));
      
      console.log('Sent configuration message');
      
      // Wait for 5 seconds to receive data
      setTimeout(() => {
        console.log(`Disconnecting from ${name}`);
        ws.close();
        
        // Report results
        console.log(`${name} Test Results:`);
        console.log(`- Connection established: ${connectionStatus}`);
        console.log(`- Video frames received: ${receivedVideoFrames}`);
        console.log(`- Telemetry data received: ${receivedTelemetryData}`);
        console.log(`- AI feedback received: ${receivedAiFeedback}`);
        console.log(`- Voice data received: ${receivedVoiceData}`);
        
        resolve(connectionStatus);
      }, 5000);
    });
    
    // Listen for messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`Received message from ${name}:`, message.type || 'unknown type');
        
        if (message.type === 'video_data' || message.type === 'video_frame') {
          receivedVideoFrames++;
        } else if (message.type === 'telemetry') {
          receivedTelemetryData++;
        } else if (message.type === 'ai_feedback') {
          receivedAiFeedback++;
        } else if (message.type === 'voice') {
          receivedVoiceData++;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`Error connecting to ${name}:`, error.message);
      clearTimeout(connectionTimeout);
      resolve(false);
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log(`Connection to ${name} closed`);
    });
  });
}

/**
 * Run validation tests for both local and cloud connections
 */
async function runValidationTests() {
  console.log('Starting hybrid cloud integration validation tests...');
  
  // Test local relay agent
  const localSuccess = await testWebSocketConnection(LOCAL_RELAY_URL, 'Local Relay Agent');
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test cloud backend
  const cloudSuccess = await testWebSocketConnection(CLOUD_BACKEND_URL, 'Cloud Backend', TEST_JWT_TOKEN);
  
  // Final report
  console.log('\n=== Hybrid Cloud Integration Validation Results ===');
  console.log(`Local Relay Agent: ${localSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Cloud Backend: ${cloudSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Overall: ${localSuccess && cloudSuccess ? 'SUCCESS' : 'PARTIAL SUCCESS'}`);
  
  if (!localSuccess) {
    console.log('Local relay agent connection failed. Check that the relay agent is running on localhost:8765.');
  }
  
  if (!cloudSuccess) {
    console.log('Cloud backend connection failed. Check that the cloud backend is deployed and accessible.');
  }
  
  // Exit with appropriate code
  process.exit(localSuccess || cloudSuccess ? 0 : 1);
}

// Execute validation
runValidationTests().catch(error => {
  console.error('Validation test error:', error);
  process.exit(1);
});
