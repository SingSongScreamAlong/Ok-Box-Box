/**
 * Hybrid Cloud Integration Validation Script
 * 
 * This script tests the dashboard's ability to connect to both local relay agent
 * and cloud backend services, validating the hybrid cloud architecture.
 * 
 * This script can run in both browser and Node.js environments.
 */

// Handle environment-specific imports
let WebSocketService: any;
let relayAgentService: any;

// Check if we're in a browser or Node.js environment
const isBrowser = typeof window !== 'undefined';

try {
  if (isBrowser) {
    // Browser environment - import normally
    import('../services/WebSocketService').then(module => {
      WebSocketService = module.default;
    });
    import('../services/RelayAgentService').then(module => {
      relayAgentService = module.relayAgentService;
    });
  } else {
    // Node.js environment - use require with a workaround
    console.log('Running in Node.js environment - using mock WebSocket implementation');
    
    // Create mock implementations for Node.js environment
    WebSocketService = {
      connect: (url: string) => console.log(`Mock connecting to ${url}`),
      disconnect: () => console.log('Mock disconnecting'),
      on: (event: string, callback: Function) => console.log(`Mock registered handler for ${event}`),
      sendMessage: (type: string, data: any) => console.log(`Mock sending message: ${type}`, data)
    };
    
    relayAgentService = {
      setCloudMode: (mode: boolean) => console.log(`Mock setting cloud mode: ${mode}`),
      setServerUrl: (url: string) => console.log(`Mock setting server URL: ${url}`),
      setAuthToken: (token: string) => console.log(`Mock setting auth token: ${token.substring(0, 10)}...`),
      connect: () => console.log('Mock connecting relay agent service'),
      disconnect: () => console.log('Mock disconnecting relay agent service'),
      onVideoFrame: (cb: Function) => console.log('Mock registered video frame handler'),
      onTelemetry: (cb: Function) => console.log('Mock registered telemetry handler'),
      onAiFeedback: (cb: Function) => console.log('Mock registered AI feedback handler'),
      onVoice: (cb: Function) => console.log('Mock registered voice handler'),
      onConnectionStatus: (cb: Function) => console.log('Mock registered connection status handler')
    };
  }
} catch (error) {
  console.error('Error loading modules:', error);
}

// Configuration
const LOCAL_RELAY_URL = 'ws://localhost:8765';
const CLOUD_BACKEND_URL = 'wss://pitbox.digitalocean.app/ws';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Test data handlers
let receivedVideoFrames = 0;
let receivedTelemetryData = 0;
let receivedAiFeedback = 0;
let receivedVoiceData = 0;
let connectionStatus = false;

// Event handlers
function onVideoFrame(frameData: any) {
  receivedVideoFrames++;
  console.log(`Received video frame #${receivedVideoFrames}:`, frameData);
}

function onTelemetry(telemetryData: any) {
  receivedTelemetryData++;
  console.log(`Received telemetry data #${receivedTelemetryData}:`, telemetryData);
}

function onAiFeedback(feedbackData: any) {
  receivedAiFeedback++;
  console.log(`Received AI feedback #${receivedAiFeedback}:`, feedbackData);
}

function onVoice(voiceData: any) {
  receivedVoiceData++;
  console.log(`Received voice data #${receivedVoiceData}:`, voiceData);
}

function onConnectionStatus(isConnected: boolean) {
  connectionStatus = isConnected;
  console.log(`Connection status changed: ${isConnected ? 'Connected' : 'Disconnected'}`);
}

// Register event handlers
function registerEventHandlers() {
  relayAgentService.onVideoFrame(onVideoFrame);
  relayAgentService.onTelemetry(onTelemetry);
  relayAgentService.onAiFeedback(onAiFeedback);
  relayAgentService.onVoice(onVoice);
  relayAgentService.onConnectionStatus(onConnectionStatus);
}

// Reset counters
function resetCounters() {
  receivedVideoFrames = 0;
  receivedTelemetryData = 0;
  receivedAiFeedback = 0;
  receivedVoiceData = 0;
  connectionStatus = false;
}

// Test local relay agent connection
async function testLocalRelayAgent() {
  console.log('=== Testing Local Relay Agent Connection ===');
  resetCounters();
  
  // Connect to local relay agent
  relayAgentService.setCloudMode(false);
  relayAgentService.setServerUrl(LOCAL_RELAY_URL, true);
  relayAgentService.connect();
  
  // Wait for connection and events
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Disconnect
  relayAgentService.disconnect();
  
  // Report results
  console.log('Local Relay Agent Test Results:');
  console.log(`- Connection established: ${connectionStatus}`);
  console.log(`- Video frames received: ${receivedVideoFrames}`);
  console.log(`- Telemetry data received: ${receivedTelemetryData}`);
  console.log(`- AI feedback received: ${receivedAiFeedback}`);
  console.log(`- Voice data received: ${receivedVoiceData}`);
  
  return connectionStatus;
}

// Test cloud backend connection
async function testCloudBackend() {
  console.log('=== Testing Cloud Backend Connection ===');
  resetCounters();
  
  // Connect to cloud backend
  relayAgentService.setCloudMode(true);
  relayAgentService.setServerUrl(CLOUD_BACKEND_URL);
  relayAgentService.setAuthToken(TEST_JWT_TOKEN);
  relayAgentService.connect();
  
  // Wait for connection and events
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Disconnect
  relayAgentService.disconnect();
  
  // Report results
  console.log('Cloud Backend Test Results:');
  console.log(`- Connection established: ${connectionStatus}`);
  console.log(`- Video frames received: ${receivedVideoFrames}`);
  console.log(`- Telemetry data received: ${receivedTelemetryData}`);
  console.log(`- AI feedback received: ${receivedAiFeedback}`);
  console.log(`- Voice data received: ${receivedVoiceData}`);
  
  return connectionStatus;
}

// Run validation tests
async function runValidationTests() {
  console.log('Starting hybrid cloud integration validation tests...');
  
  // Register event handlers
  registerEventHandlers();
  
  // Test local relay agent
  const localSuccess = await testLocalRelayAgent();
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test cloud backend
  const cloudSuccess = await testCloudBackend();
  
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
}

// Execute validation if this script is run directly
if (require.main === module) {
  runValidationTests().catch(error => {
    console.error('Validation test error:', error);
  });
}

export { runValidationTests };
