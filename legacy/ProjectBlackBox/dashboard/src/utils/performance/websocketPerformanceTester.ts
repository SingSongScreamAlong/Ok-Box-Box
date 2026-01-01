/**
 * WebSocket Performance Tester
 * 
 * Utility for testing WebSocket service performance under various load conditions.
 * Measures connection time, message latency, throughput, and error rates.
 */

import { v4 as uuidv4 } from 'uuid';

interface PerformanceResult {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  throughput: number; // messages per second
  avgLatency?: number; // in ms
}

interface LatencyMeasurement {
  messageId: string;
  sentTime: number;
  receivedTime?: number;
  latency?: number;
}

export interface WebSocketPerformanceOptions {
  url: string;
  connectionCount?: number;
  messagesPerConnection?: number;
  messageInterval?: number; // ms between messages
  messageSize?: number; // bytes
  timeout?: number; // ms
  eventName?: string;
}

export class WebSocketPerformanceTester {
  private options: WebSocketPerformanceOptions;
  private sockets: WebSocket[] = [];
  private results: PerformanceResult[] = [];
  private latencyMeasurements: Map<string, LatencyMeasurement> = new Map();
  private testInProgress = false;
  private abortController = new AbortController();

  constructor(options: WebSocketPerformanceOptions) {
    this.options = {
      connectionCount: 1,
      messagesPerConnection: 100,
      messageInterval: 50,
      messageSize: 1024, // 1KB
      timeout: 30000, // 30 seconds
      eventName: 'performance_test',
      ...options
    };
  }

  /**
   * Run a connection test to measure connection establishment time
   */
  async testConnection(): Promise<PerformanceResult> {
    const result: PerformanceResult = {
      testName: 'connection_test',
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      throughput: 0
    };

    try {
      const socket = new WebSocket(this.options.url);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.options.timeout);

        socket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        socket.onerror = (error) => {
          clearTimeout(timeout);
          result.errors++;
          reject(error);
        };
      });

      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      
      // Clean up
      socket.close();
    } catch (error) {
      console.error('Connection test error:', error);
      result.errors++;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Run a latency test to measure round-trip time for messages
   */
  async testLatency(count: number = 10): Promise<PerformanceResult> {
    const result: PerformanceResult = {
      testName: 'latency_test',
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      throughput: 0
    };

    try {
      const socket = new WebSocket(this.options.url);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.options.timeout);

        socket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        socket.onerror = (error) => {
          clearTimeout(timeout);
          result.errors++;
          reject(error);
        };
      });

      // Set up message handler
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'echo' && data.messageId) {
            const measurement = this.latencyMeasurements.get(data.messageId);
            if (measurement) {
              measurement.receivedTime = Date.now();
              measurement.latency = measurement.receivedTime - measurement.sentTime;
              result.messagesReceived++;
            }
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          result.errors++;
        }
      };

      // Send test messages
      for (let i = 0; i < count; i++) {
        const messageId = uuidv4();
        const measurement: LatencyMeasurement = {
          messageId,
          sentTime: Date.now()
        };
        this.latencyMeasurements.set(messageId, measurement);
        
        const message = {
          type: 'echo',
          messageId,
          timestamp: measurement.sentTime,
          data: this.generateRandomData(this.options.messageSize || 100)
        };
        
        socket.send(JSON.stringify(message));
        result.messagesSent++;
        
        // Wait between messages
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.messageInterval));
        }
      }

      // Wait for responses
      await new Promise<void>(resolve => {
        const checkComplete = () => {
          if (result.messagesReceived >= count || Date.now() - result.startTime > this.options.timeout!) {
            resolve();
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        setTimeout(checkComplete, 100);
      });

      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      
      // Calculate average latency
      let totalLatency = 0;
      let latencyCount = 0;
      
      this.latencyMeasurements.forEach(measurement => {
        if (measurement.latency) {
          totalLatency += measurement.latency;
          latencyCount++;
        }
      });
      
      if (latencyCount > 0) {
        result.avgLatency = totalLatency / latencyCount;
      }
      
      result.throughput = (result.messagesReceived / result.duration) * 1000;
      
      // Clean up
      socket.close();
    } catch (error) {
      console.error('Latency test error:', error);
      result.errors++;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
    }

    this.results.push(result);
    return result;
  }

  /**
   * Run a throughput test to measure maximum message rate
   */
  async testThroughput(): Promise<PerformanceResult> {
    if (this.testInProgress) {
      throw new Error('Test already in progress');
    }

    this.testInProgress = true;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const result: PerformanceResult = {
      testName: 'throughput_test',
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      throughput: 0
    };

    try {
      // Create multiple WebSocket connections
      for (let i = 0; i < (this.options.connectionCount || 1); i++) {
        if (signal.aborted) break;
        
        try {
          const socket = new WebSocket(this.options.url);
          this.sockets.push(socket);

          socket.onopen = () => {
            // Start sending messages once connected
            this.sendMessages(socket, result, signal);
          };

          socket.onmessage = () => {
            result.messagesReceived++;
          };

          socket.onerror = () => {
            result.errors++;
          };

          socket.onclose = () => {
            // Handle socket close
          };
        } catch (error) {
          console.error(`Error creating socket ${i}:`, error);
          result.errors++;
        }
      }

      // Run test for specified duration
      await new Promise<void>(resolve => {
        setTimeout(() => {
          this.abortController.abort();
          resolve();
        }, this.options.timeout);
      });

    } catch (error) {
      console.error('Throughput test error:', error);
      result.errors++;
    } finally {
      // Clean up
      this.sockets.forEach(socket => {
        try {
          socket.close();
        } catch (e) {
          // Ignore close errors
        }
      });
      this.sockets = [];
      
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.throughput = (result.messagesSent / result.duration) * 1000;
      
      this.results.push(result);
      this.testInProgress = false;
    }

    return result;
  }

  /**
   * Helper method to send messages in a loop
   */
  private async sendMessages(socket: WebSocket, result: PerformanceResult, signal: AbortSignal) {
    const messagesPerConnection = this.options.messagesPerConnection || 100;
    const messageInterval = this.options.messageInterval || 50;

    for (let i = 0; i < messagesPerConnection; i++) {
      if (signal.aborted || socket.readyState !== WebSocket.OPEN) break;
      
      try {
        const message = {
          type: this.options.eventName,
          timestamp: Date.now(),
          data: this.generateRandomData(this.options.messageSize || 1024)
        };
        
        socket.send(JSON.stringify(message));
        result.messagesSent++;
        
        // Wait between messages
        await new Promise(resolve => setTimeout(resolve, messageInterval));
      } catch (error) {
        result.errors++;
      }
    }
  }

  /**
   * Generate random data of specified size
   */
  private generateRandomData(size: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Generate a string of approximately the right size
    // Each character is ~2 bytes in JSON
    const targetLength = Math.ceil(size / 2);
    
    for (let i = 0; i < targetLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Stop any running tests
   */
  stopTests(): void {
    if (this.testInProgress) {
      this.abortController.abort();
      
      this.sockets.forEach(socket => {
        try {
          socket.close();
        } catch (e) {
          // Ignore close errors
        }
      });
      
      this.sockets = [];
      this.testInProgress = false;
    }
  }

  /**
   * Get all test results
   */
  getResults(): PerformanceResult[] {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
    this.latencyMeasurements.clear();
  }
}

export default WebSocketPerformanceTester;
