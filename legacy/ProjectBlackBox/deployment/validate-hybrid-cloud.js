#!/usr/bin/env node
/**
 * BlackBox Hybrid Cloud Validation Script
 * 
 * This script tests the connection between the local driver app and the cloud backend.
 * It validates WebSocket connectivity, API endpoints, and data transmission.
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Configuration
const DEFAULT_BACKEND_URL = 'http://localhost:3000';
const DEFAULT_WEBSOCKET_URL = 'ws://localhost:8765';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Main validation function
async function validateHybridCloud() {
  console.log(`${colors.bright}${colors.blue}=== BlackBox Hybrid Cloud Validation ===\n${colors.reset}`);
  
  // Get configuration from user
  const backendUrl = await promptWithDefault('Enter backend URL', DEFAULT_BACKEND_URL);
  const wsUrl = await promptWithDefault('Enter WebSocket URL', DEFAULT_WEBSOCKET_URL);
  
  console.log(`\n${colors.cyan}Testing connection to cloud backend...${colors.reset}`);
  
  // Step 1: Test HTTP API connection
  try {
    console.log(`${colors.dim}Testing API endpoint: ${backendUrl}/status${colors.reset}`);
    const response = await fetch(`${backendUrl}/status`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✓ API connection successful${colors.reset}`);
      console.log(`${colors.dim}  Server status: ${data.status}`);
      console.log(`  Version: ${data.version}`);
      console.log(`  Environment: ${data.environment}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ API connection failed: ${response.status} ${response.statusText}${colors.reset}`);
      console.log(`${colors.yellow}  Make sure the backend service is running and accessible.${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ API connection error: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}  Check if the backend URL is correct and the service is running.${colors.reset}`);
  }
  
  // Step 2: Test WebSocket connection
  console.log(`\n${colors.cyan}Testing WebSocket connection...${colors.reset}`);
  console.log(`${colors.dim}Connecting to: ${wsUrl}${colors.reset}`);
  
  try {
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`${colors.green}✓ WebSocket connection established${colors.reset}`);
        
        // Send test message
        const testMessage = {
          type: 'validation',
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          data: {
            client: 'validation-script',
            message: 'Testing hybrid cloud connection'
          }
        };
        
        console.log(`${colors.dim}Sending test message...${colors.reset}`);
        ws.send(JSON.stringify(testMessage));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`${colors.green}✓ Received response from server${colors.reset}`);
          console.log(`${colors.dim}  Message type: ${message.type}`);
          console.log(`  Server time: ${message.timestamp}${colors.reset}`);
          
          // Close connection after receiving response
          ws.close();
          resolve();
        } catch (error) {
          console.log(`${colors.yellow}⚠ Received non-JSON response: ${data}${colors.reset}`);
          ws.close();
          resolve();
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`${colors.red}✗ WebSocket error: ${error.message}${colors.reset}`);
        reject(error);
      });
      
      ws.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  } catch (error) {
    console.log(`${colors.red}✗ WebSocket connection failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}  Make sure the WebSocket server is running and accessible.${colors.reset}`);
  }
  
  // Step 3: Test data transmission
  console.log(`\n${colors.cyan}Testing data transmission...${colors.reset}`);
  
  try {
    console.log(`${colors.dim}Sending test telemetry data...${colors.reset}`);
    
    const telemetryData = {
      sessionId: uuidv4(),
      timestamp: new Date().toISOString(),
      data: {
        speed: 120.5,
        rpm: 7500,
        gear: 4,
        throttle: 0.75,
        brake: 0.0,
        steering: -0.1,
        lap: 3,
        position: 5
      }
    };
    
    const response = await fetch(`${backendUrl}/api/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(telemetryData)
    });
    
    if (response.ok) {
      console.log(`${colors.green}✓ Data transmission successful${colors.reset}`);
      const data = await response.json();
      console.log(`${colors.dim}  Response: ${JSON.stringify(data)}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Data transmission failed: ${response.status} ${response.statusText}${colors.reset}`);
      console.log(`${colors.yellow}  Make sure the API endpoint is correctly configured.${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Data transmission error: ${error.message}${colors.reset}`);
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}=== Validation Summary ===\n${colors.reset}`);
  console.log(`Backend URL: ${backendUrl}`);
  console.log(`WebSocket URL: ${wsUrl}`);
  console.log(`\nIf all tests passed, your hybrid cloud setup is working correctly!`);
  console.log(`If any tests failed, please check the error messages and troubleshoot accordingly.`);
  console.log(`\nRefer to the COMPLETE_DEPLOYMENT_GUIDE.md for troubleshooting steps.`);
  
  rl.close();
}

// Helper function to prompt with default value
function promptWithDefault(question, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultValue}]: `, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

// Run the validation
validateHybridCloud().catch(error => {
  console.error(`${colors.red}Validation script error: ${error.message}${colors.reset}`);
  rl.close();
});
