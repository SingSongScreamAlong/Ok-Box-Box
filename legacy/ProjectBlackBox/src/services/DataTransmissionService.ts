import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { TelemetryData } from '../models/TelemetryData';
import { AppConfig } from '../config/AppConfig';
import { DataCompression, CompressionLevel, CompressionOptions } from '../utils/DataCompression';

/**
 * Service responsible for transmitting telemetry data to the PitBox Core server
 */
export class DataTransmissionService extends EventEmitter {
  private socket: any = null;
  private serverUrl: string = '';
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 2000; // ms
  private reconnectTimer: NodeJS.Timeout | null = null;
  private compressionEnabled: boolean = true;
  private compressionOptions: CompressionOptions = {
    level: CompressionLevel.MEDIUM,
    threshold: 1024, // bytes
    batchSize: 10
  };
  private dataCompression: DataCompression = new DataCompression(this.compressionOptions);
  private batchingEnabled: boolean = false;
  private batchSize: number = 10;
  private batchInterval: number = 1000; // ms
  private batchTimer: NodeJS.Timeout | null = null;
  private batchedData: TelemetryData[] = [];
  private fallbackMode: boolean = false;
  private offlineBuffer: TelemetryData[] = [];
  private maxOfflineBufferSize: number = 1000;
  private authToken: string | null = null;

  /**
   * Initialize the data transmission service
   * @param serverUrl URL of the PitBox Core server
   */
  public initialize(serverUrl: string): void {
    console.log(`Initializing DataTransmissionService with server: ${serverUrl}`);
    this.serverUrl = serverUrl;

    // Load configuration
    this.compressionEnabled = AppConfig.getCompressionEnabled() || true;

    // Initialize compression options
    this.compressionOptions = {
      level: AppConfig.getCompressionLevel() || CompressionLevel.MEDIUM,
      threshold: AppConfig.getCompressionThreshold() || 1024,
      batchSize: AppConfig.getBatchSize() || 10
    };

    // Initialize data compression utility
    this.dataCompression = new DataCompression(this.compressionOptions);
    this.batchingEnabled = AppConfig.getBatchingEnabled() || false;
    this.batchSize = AppConfig.getBatchSize() || 10;
    this.batchInterval = AppConfig.getBatchInterval() || 1000;
    this.maxOfflineBufferSize = AppConfig.getMaxOfflineBufferSize() || 1000;
    this.authToken = AppConfig.getAuthToken() || null;

    // Connect to server
    this.connect();
  }

  /**
   * Connect to the PitBox Core server
   */
  private connect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    try {
      console.log(`Connecting to server: ${this.serverUrl}`);

      // Create socket.io connection
      this.socket = io(this.serverUrl, {
        reconnection: false, // We'll handle reconnection ourselves
        auth: this.authToken ? { token: this.authToken } : undefined,
        transports: ['websocket']
      });

      // Set up event listeners
      this.socket.on('connect', () => {
        console.log('Connected to PitBox Core server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.fallbackMode = false;
        this.emit('connected');

        // Send any buffered data
        this.sendOfflineBuffer();
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`Disconnected from server: ${reason}`);
        this.connected = false;
        this.emit('disconnected', reason);

        // Only attempt to reconnect if disconnect was NOT initiated by client
        // 'io client disconnect' = client called disconnect()
        // 'io server disconnect' = server kicked us
        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error);
        this.connected = false;
        this.emit('error', error);

        // Attempt to reconnect
        this.scheduleReconnect();
      });

      // Custom events from server
      this.socket.on('server_config', (config: any) => {
        console.log('Received server configuration:', config);
        this.emit('server_config', config);

        // Update configuration based on server settings
        if (config.compressionEnabled !== undefined) {
          this.compressionEnabled = config.compressionEnabled;
        }

        if (config.batchingEnabled !== undefined) {
          this.batchingEnabled = config.batchingEnabled;

          if (this.batchingEnabled && !this.batchTimer) {
            this.startBatching();
          } else if (!this.batchingEnabled && this.batchTimer) {
            this.stopBatching();
          }
        }

        if (config.fallbackMode !== undefined) {
          this.fallbackMode = config.fallbackMode;
        }
      });

      this.socket.on('ping', () => {
        this.socket?.emit('pong', { timestamp: Date.now() });
      });

    } catch (err) {
      console.error('Error connecting to server:', err);
      this.emit('error', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts), 60000);

      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('Max reconnect attempts reached, entering fallback mode');
      this.fallbackMode = true;
      this.emit('fallback_mode');
    }
  }

  /**
   * Disconnect from the PitBox Core server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connected = false;
  }

  /**
   * Send telemetry data to the server
   * @param data Telemetry data to send
   */
  public sendTelemetry(data: TelemetryData): void {
    if (this.batchingEnabled) {
      this.batchedData.push(data);

      if (this.batchedData.length >= this.batchSize) {
        this.sendBatch();
      }

      return;
    }

    this.sendData('telemetry', data);
  }

  /**
   * Start batching telemetry data
   */
  private startBatching(): void {
    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setInterval(() => {
      if (this.batchedData.length > 0) {
        this.sendBatch();
      }
    }, this.batchInterval);
  }

  /**
   * Stop batching telemetry data
   */
  private stopBatching(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Send any remaining batched data
    if (this.batchedData.length > 0) {
      this.sendBatch();
    }
  }

  /**
   * Send a batch of telemetry data
   */
  private sendBatch(): void {
    if (this.batchedData.length === 0) {
      return;
    }

    const batch = [...this.batchedData];
    this.batchedData = [];

    this.sendData('telemetry_batch', batch);
  }

  /**
   * Send data to the server
   * @param eventType Type of event to send
   * @param data Data to send
   */
  private async sendData(eventType: string, data: any): Promise<void> {
    if (!this.socket || !this.connected) {
      console.log('Not connected, cannot send data');
      return;
    }

    try {
      if (this.compressionEnabled) {
        // Use the DataCompression utility for optimized compression
        const compressedData = await this.dataCompression.compressTelemetry(data);

        // Send data with compression header (header byte indicates if compressed)
        this.socket.emit(eventType, {
          optimized: true,
          data: compressedData.toString('base64')
        });

        // Log compression stats in debug mode
        if (process.env.DEBUG) {
          const originalSize = JSON.stringify(data).length;
          const compressedSize = compressedData.length;
          const ratio = this.dataCompression.calculateCompressionRatio(originalSize, compressedSize);
          console.debug(`Compression stats - Original: ${originalSize}B, Compressed: ${compressedSize}B, Ratio: ${ratio.toFixed(2)}x`);
        }
      } else {
        // Send uncompressed data
        this.socket.emit(eventType, { optimized: false, data });
      }
    } catch (error) {
      console.error('Error sending data:', error);

      // Fallback to uncompressed data in case of compression error
      try {
        this.socket.emit(eventType, { optimized: false, data });
      } catch (fallbackError) {
        console.error('Error sending uncompressed data:', fallbackError);
      }
    }
  }

  /**
   * Buffer data for later transmission
   * @param data Data to buffer
   */
  private bufferData(data: TelemetryData): void {
    // Only buffer if it's a single telemetry data point
    if (!Array.isArray(data)) {
      this.offlineBuffer.push(data);

      // Limit buffer size
      if (this.offlineBuffer.length > this.maxOfflineBufferSize) {
        this.offlineBuffer.shift();
      }
    }
  }

  /**
   * Send buffered data when connection is restored
   */
  private sendOfflineBuffer(): void {
    if (this.offlineBuffer.length === 0) {
      return;
    }

    console.log(`Sending ${this.offlineBuffer.length} buffered data points`);

    // Send in batches to avoid overwhelming the connection
    const batchSize = 50;
    const batches = Math.ceil(this.offlineBuffer.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, this.offlineBuffer.length);
      const batch = this.offlineBuffer.slice(start, end);

      this.sendData('telemetry_batch', batch);
    }

    // Clear the buffer
    this.offlineBuffer = [];
  }

  /**
   * Update the server URL
   * @param serverUrl New server URL
   */
  public updateServerUrl(serverUrl: string): void {
    if (this.serverUrl !== serverUrl) {
      this.serverUrl = serverUrl;

      // Reconnect with new URL
      this.disconnect();
      this.connect();
    }
  }

  /**
   * Check if the service is connected to the server
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if the service is in fallback mode
   */
  public isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Get the current server URL
   */
  public getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Public method to reconnect to the server
   */
  public reconnect(): void {
    this.disconnect();
    this.connect();
  }

  /**
   * Test connection to server
   * @param url Server URL to test
   * @returns Promise resolving to success status
   */
  public testConnection(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Create a temporary socket to test connection
        const tempSocket = io(url, {
          reconnection: false,
          timeout: 5000,
          forceNew: true
        });

        // Set up event handlers
        tempSocket.on('connect', () => {
          tempSocket.disconnect();
          resolve(true);
        });

        tempSocket.on('connect_error', () => {
          tempSocket.disconnect();
          resolve(false);
        });

        tempSocket.on('connect_timeout', () => {
          tempSocket.disconnect();
          resolve(false);
        });

        // Set timeout for connection attempt
        setTimeout(() => {
          if (tempSocket) {
            tempSocket.disconnect();
            resolve(false);
          }
        }, 5000);
      } catch (error) {
        console.error('Error testing connection:', error);
        resolve(false);
      }
    });
  }

  /**
   * Update service settings
   * @param settings New settings
   */
  public updateSettings(settings: any): void {
    if (!settings) return;

    // Update server URL if provided
    if (settings.serverUrl) {
      this.updateServerUrl(settings.serverUrl);
    }

    // Update compression settings if provided
    if (settings.compressionEnabled !== undefined) {
      this.compressionEnabled = settings.compressionEnabled;
    }

    // Update compression options if provided
    const compressionOptionsUpdated =
      settings.compressionLevel !== undefined ||
      settings.compressionThreshold !== undefined;

    if (settings.compressionLevel !== undefined) {
      this.compressionOptions.level = settings.compressionLevel;
    }

    if (settings.compressionThreshold !== undefined) {
      this.compressionOptions.threshold = settings.compressionThreshold;
    }

    // Update compression utility if options changed
    if (compressionOptionsUpdated) {
      this.dataCompression.setOptions(this.compressionOptions);
    }

    // Update batching settings if provided
    if (settings.batchingEnabled !== undefined) {
      this.batchingEnabled = settings.batchingEnabled;

      if (this.batchingEnabled && !this.batchTimer) {
        this.startBatching();
      } else if (!this.batchingEnabled && this.batchTimer) {
        this.stopBatching();
      }
    }

    if (settings.batchSize !== undefined) {
      this.batchSize = settings.batchSize;
    }

    if (settings.batchInterval !== undefined) {
      this.batchInterval = settings.batchInterval;

      // Restart batching with new interval if active
      if (this.batchingEnabled && this.batchTimer) {
        this.stopBatching();
        this.startBatching();
      }
    }

    // Update offline buffer size if provided
    if (settings.maxOfflineBufferSize !== undefined) {
      this.maxOfflineBufferSize = settings.maxOfflineBufferSize;
    }

    // Update auth token if provided
    if (settings.authToken !== undefined) {
      this.authToken = settings.authToken;

      // Reconnect with new auth token if connected
      if (this.connected) {
        this.disconnect();
        this.connect();
      }
    }
  }
}
