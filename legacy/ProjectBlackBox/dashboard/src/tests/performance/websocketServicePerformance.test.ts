/**
 * WebSocketService Performance Tests
 * 
 * This file contains performance tests for WebSocketService and MultiDriverService integration.
 * Tests measure connection time, message latency, throughput, and error rates under various load conditions.
 */

import WebSocketPerformanceTester from '../../utils/performance/websocketPerformanceTester';
import webSocketService from '../../services/WebSocketService';
import multiDriverService from '../../services/MultiDriverService';
import { store } from '../../redux/store';

// Disable normal test timeouts for performance tests
jest.setTimeout(60000); // 60 seconds

describe('WebSocketService Performance Tests', () => {
  // Test server URL - use environment variable or default to localhost
  const testServerUrl = process.env.WS_TEST_SERVER || 'ws://localhost:8080';
  
  // Performance tester instance
  let performanceTester: WebSocketPerformanceTester;
  
  beforeAll(() => {
    // Initialize services
    multiDriverService.initialize();
    webSocketService.connect();
    
    // Create performance tester
    performanceTester = new WebSocketPerformanceTester({
      url: testServerUrl
    });
    
    // Log test configuration
    console.log('Performance test configuration:');
    console.log(`- Server URL: ${testServerUrl}`);
    console.log(`- Test timeout: 60 seconds`);
  });
  
  afterAll(() => {
    // Clean up
    webSocketService.disconnect();
    performanceTester.stopTests();
  });
  
  beforeEach(() => {
    // Reset performance tester results
    performanceTester.clearResults();
  });
  
  /**
   * Connection Performance Tests
   */
  describe('Connection Performance', () => {
    test('should establish connection within acceptable time', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping connection performance test in CI environment');
        return;
      }
      
      const result = await performanceTester.testConnection();
      
      console.log('Connection test results:');
      console.log(`- Connection time: ${result.duration}ms`);
      console.log(`- Errors: ${result.errors}`);
      
      // Assert acceptable connection time (adjust threshold as needed)
      expect(result.duration).toBeLessThan(1000); // Connection should be under 1 second
      expect(result.errors).toBe(0);
    });
    
    test('should handle multiple concurrent connections', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping concurrent connections test in CI environment');
        return;
      }
      
      // Create performance tester with multiple connections
      const concurrentTester = new WebSocketPerformanceTester({
        url: testServerUrl,
        connectionCount: 10,
        messagesPerConnection: 10,
        messageInterval: 100,
        timeout: 10000
      });
      
      const result = await concurrentTester.testThroughput();
      
      console.log('Concurrent connections test results:');
      console.log(`- Total duration: ${result.duration}ms`);
      console.log(`- Messages sent: ${result.messagesSent}`);
      console.log(`- Messages received: ${result.messagesReceived}`);
      console.log(`- Throughput: ${result.throughput.toFixed(2)} messages/second`);
      console.log(`- Errors: ${result.errors}`);
      
      // Assert acceptable performance (adjust thresholds as needed)
      expect(result.messagesSent).toBeGreaterThan(0);
      expect(result.errors).toBeLessThan(result.messagesSent * 0.05); // Less than 5% error rate
      
      // Clean up
      concurrentTester.stopTests();
    });
  });
  
  /**
   * Message Latency Tests
   */
  describe('Message Latency', () => {
    test('should have acceptable round-trip latency for team messages', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping latency test in CI environment');
        return;
      }
      
      // Configure latency test
      const latencyTester = new WebSocketPerformanceTester({
        url: testServerUrl,
        messageSize: 256, // Small message size
        messageInterval: 200, // 200ms between messages
        timeout: 10000
      });
      
      const result = await latencyTester.testLatency(20); // 20 test messages
      
      console.log('Team message latency test results:');
      console.log(`- Average latency: ${result.avgLatency?.toFixed(2)}ms`);
      console.log(`- Messages sent: ${result.messagesSent}`);
      console.log(`- Messages received: ${result.messagesReceived}`);
      console.log(`- Errors: ${result.errors}`);
      
      // Assert acceptable latency (adjust threshold as needed)
      expect(result.avgLatency).toBeLessThan(200); // Average latency under 200ms
      expect(result.messagesReceived).toBeGreaterThanOrEqual(result.messagesSent * 0.9); // At least 90% success rate
      
      // Clean up
      latencyTester.stopTests();
    });
  });
  
  /**
   * Throughput Tests
   */
  describe('Message Throughput', () => {
    test('should handle high message throughput', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping throughput test in CI environment');
        return;
      }
      
      // Configure throughput test
      const throughputTester = new WebSocketPerformanceTester({
        url: testServerUrl,
        connectionCount: 5,
        messagesPerConnection: 100,
        messageInterval: 20, // 20ms between messages (50 messages/second per connection)
        messageSize: 512, // Medium message size
        timeout: 15000 // 15 seconds
      });
      
      const result = await throughputTester.testThroughput();
      
      console.log('Throughput test results:');
      console.log(`- Total duration: ${result.duration}ms`);
      console.log(`- Messages sent: ${result.messagesSent}`);
      console.log(`- Messages received: ${result.messagesReceived}`);
      console.log(`- Throughput: ${result.throughput.toFixed(2)} messages/second`);
      console.log(`- Errors: ${result.errors}`);
      
      // Assert acceptable throughput (adjust thresholds as needed)
      expect(result.throughput).toBeGreaterThan(50); // At least 50 messages per second
      expect(result.errors).toBeLessThan(result.messagesSent * 0.1); // Less than 10% error rate
      
      // Clean up
      throughputTester.stopTests();
    });
  });
  
  /**
   * MultiDriverService Integration Performance
   */
  describe('MultiDriverService Integration Performance', () => {
    test('should handle team message broadcasting efficiently', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping MultiDriverService integration test in CI environment');
        return;
      }
      
      // Mock Redux dispatch for performance measurement
      const originalDispatch = store.dispatch;
      const dispatchTimes: number[] = [];
      
      store.dispatch = jest.fn((action) => {
        dispatchTimes.push(Date.now());
        return originalDispatch(action);
      });
      
      // Start time
      const startTime = Date.now();
      
      // Send multiple team messages in rapid succession
      const messageCount = 50;
      const promises = [];
      
      for (let i = 0; i < messageCount; i++) {
        promises.push(
          multiDriverService.sendTeamMessage(
            `Performance test message ${i}`,
            `driver${i % 5}`,
            `Driver ${i % 5}`,
            i % 2 === 0 ? 'normal' : 'high'
          )
        );
        
        // Small delay between messages to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Wait for all messages to be sent
      await Promise.all(promises);
      
      // End time
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Calculate metrics
      const dispatchCount = dispatchTimes.length;
      const throughput = (messageCount / duration) * 1000; // messages per second
      
      // Calculate average processing time (if any dispatches occurred)
      let avgProcessingTime = 0;
      if (dispatchCount > 0) {
        const totalProcessingTime = dispatchTimes.reduce((sum, time) => sum + (time - startTime), 0);
        avgProcessingTime = totalProcessingTime / dispatchCount;
      }
      
      console.log('MultiDriverService team message performance:');
      console.log(`- Total duration: ${duration}ms`);
      console.log(`- Messages sent: ${messageCount}`);
      console.log(`- Redux dispatches: ${dispatchCount}`);
      console.log(`- Throughput: ${throughput.toFixed(2)} messages/second`);
      console.log(`- Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
      
      // Assert acceptable performance (adjust thresholds as needed)
      expect(throughput).toBeGreaterThan(10); // At least 10 messages per second
      
      // Restore original dispatch
      store.dispatch = originalDispatch;
    });
    
    test('should handle driver handoff operations efficiently', async () => {
      // Skip if running in CI environment
      if (process.env.CI) {
        console.log('Skipping handoff performance test in CI environment');
        return;
      }
      
      // Mock WebSocketService methods for performance measurement
      const originalRequestHandoff = webSocketService.requestHandoff;
      const handoffTimes: number[] = [];
      
      (webSocketService.requestHandoff as jest.Mock) = jest.fn((fromId, toId, reason) => {
        handoffTimes.push(Date.now());
        return `handoff-${fromId}-${toId}`;
      });
      
      // Start time
      const startTime = Date.now();
      
      // Perform multiple handoff operations
      const handoffCount = 20;
      
      for (let i = 0; i < handoffCount; i++) {
        multiDriverService.initiateHandoff(
          `driver${i % 3}`,
          `driver${(i + 1) % 3}`,
          `Performance test handoff ${i}`
        );
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // End time
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Calculate metrics
      const handoffCompletedCount = handoffTimes.length;
      const throughput = (handoffCount / duration) * 1000; // handoffs per second
      
      console.log('Driver handoff performance:');
      console.log(`- Total duration: ${duration}ms`);
      console.log(`- Handoffs initiated: ${handoffCount}`);
      console.log(`- Handoffs completed: ${handoffCompletedCount}`);
      console.log(`- Throughput: ${throughput.toFixed(2)} handoffs/second`);
      
      // Assert acceptable performance (adjust thresholds as needed)
      expect(handoffCompletedCount).toBe(handoffCount);
      
      // Restore original method
      webSocketService.requestHandoff = originalRequestHandoff;
    });
  });
});
