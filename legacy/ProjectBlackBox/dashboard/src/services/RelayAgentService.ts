import WebSocketService, { ConnectionType } from './WebSocketService';

/**
 * Service for handling communication with the PitBox Relay Agent and Cloud Backend
 * This service connects to the relay agent's WebSocket server or cloud backend
 * and processes video frames and telemetry data
 */

// Configuration interface for the relay agent
interface RelayAgentConfig {
  type: string;
  client: string;
  version: string;
  capabilities: {
    video: boolean;
    telemetry: boolean;
    ai: boolean;
    voice: boolean;
  };
  cloudMode?: boolean;
}
export class RelayAgentService {
  private static instance: RelayAgentService;
  private isConnected: boolean = false;
  private serverUrl: string = 'wss://pitbox.digitalocean.app/ws'; // Default to DigitalOcean cloud backend
  private localServerUrl: string = 'ws://localhost:8765'; // Local relay agent fallback
  private useCloudMode: boolean = true; // Default to cloud mode
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private videoFrameCallbacks: Array<(frameData: any) => void> = [];
  private telemetryCallbacks: Array<(telemetryData: any) => void> = [];
  private aiFeedbackCallbacks: Array<(feedbackData: any) => void> = [];
  private voiceCallbacks: Array<(voiceData: any) => void> = [];
  private connectionStatusCallbacks: Array<(isConnected: boolean) => void> = [];
  private token?: string; // JWT token for authentication

  /**
   * Get the singleton instance of the RelayAgentService
   */
  public static getInstance(): RelayAgentService {
    if (!RelayAgentService.instance) {
      RelayAgentService.instance = new RelayAgentService();
    }
    return RelayAgentService.instance;
  }

  /**
   * Initialize the service and set up event listeners
   */
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to the relay agent WebSocket server or cloud backend
   * @param url Optional URL override
   * @param useCloud Whether to use cloud mode (default: true)
   * @param token Optional JWT token for authentication
   */
  public connect(url?: string, useCloud: boolean = true, token?: string): void {
    this.useCloudMode = useCloud;
    
    if (url) {
      // If URL is explicitly provided, use it
      this.serverUrl = url;
    } else {
      // Otherwise use the appropriate default URL based on mode
      this.serverUrl = this.useCloudMode ? 'wss://pitbox.digitalocean.app/ws' : this.localServerUrl;
    }
    
    // Store token if provided
    if (token) {
      this.token = token;
    }
    
    console.log(`Connecting to ${this.useCloudMode ? 'cloud backend' : 'relay agent'} at ${this.serverUrl}`);
    
    // Append token to URL if available
    const connectionUrl = this.token ? `${this.serverUrl}?token=${this.token}` : this.serverUrl;
    
    // Use native WebSocket connection (not Socket.io)
    WebSocketService.connect(connectionUrl, ConnectionType.NATIVE_WEBSOCKET);
    
    // Set up auto-reconnect
    this.setupAutoReconnect();
  }

  /**
   * Disconnect from the relay agent WebSocket server or cloud backend
   */
  public disconnect(): void {
    console.log(`Disconnecting from ${this.useCloudMode ? 'cloud backend' : 'relay agent'}`);
    WebSocketService.disconnect();
    this.isConnected = false;
    this.notifyConnectionStatus();
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    // Connection status events
    WebSocketService.on('connect', () => {
      console.log(`Connected to ${this.useCloudMode ? 'cloud backend' : 'relay agent'}`);
      this.isConnected = true;
      this.notifyConnectionStatus();
      
      // Send initial configuration message
      this.sendConfig();
    });

    WebSocketService.on('disconnect', () => {
      console.log(`Disconnected from ${this.useCloudMode ? 'cloud backend' : 'relay agent'}`);
      this.isConnected = false;
      this.notifyConnectionStatus();
      
      // Attempt to reconnect
      this.setupAutoReconnect();
    });

    // Data events
    WebSocketService.on('video_data', (data: any) => {
      this.processVideoFrame(data);
    });

    WebSocketService.on('video_frame', (data: any) => {
      // Cloud backend uses 'video_frame' event name
      this.processVideoFrame(data);
    });

    WebSocketService.on('telemetry', (data: any) => {
      this.processTelemetryData(data);
    });
    
    // AI feedback events (cloud mode only)
    WebSocketService.on('ai_feedback', (data: any) => {
      this.processAiFeedback(data);
    });
    
    // Voice events (cloud mode only)
    WebSocketService.on('voice', (data: any) => {
      this.processVoiceData(data);
    });
  }

  /**
   * Set up automatic reconnection if connection is lost
   */
  private setupAutoReconnect(): void {
    if (!this.isConnected && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log(`Attempting to reconnect to ${this.useCloudMode ? 'cloud backend' : 'relay agent'} at ${this.serverUrl}`);
        this.connect(this.serverUrl, this.useCloudMode, this.token);
        this.reconnectTimer = null;
      }, this.reconnectInterval);
    }
  }

  /**
   * Send initial configuration to the relay agent or cloud backend
   */
  private sendConfig(): void {
    const config: RelayAgentConfig = {
      type: 'config',
      client: 'dashboard',
      version: '1.0.0',
      capabilities: {
        video: true,
        telemetry: true,
        ai: true,
        voice: true
      },
      cloudMode: this.useCloudMode
    };
    
    WebSocketService.sendMessage('config', config);
    
    // Subscribe to channels if in cloud mode
    if (this.useCloudMode) {
      // Subscribe to all driver channels (in a real app, we would filter by team)
      this.subscribeToChannel('telemetry:*');
      this.subscribeToChannel('video:*');
      this.subscribeToChannel('ai:*');
    }
  }
  
  /**
   * Subscribe to a specific channel (cloud mode only)
   * @param channel Channel name to subscribe to
   */
  public subscribeToChannel(channel: string): void {
    if (this.isConnected && this.useCloudMode) {
      WebSocketService.sendMessage('message', {
        type: 'subscribe',
        channel
      });
    }
  }
  
  /**
   * Unsubscribe from a specific channel (cloud mode only)
   * @param channel Channel name to unsubscribe from
   */
  public unsubscribeFromChannel(channel: string): void {
    if (this.isConnected && this.useCloudMode) {
      WebSocketService.sendMessage('message', {
        type: 'unsubscribe',
        channel
      });
    }
  }

  /**
   * Process incoming video frame data
   * @param frameData Video frame data from the relay agent or cloud backend
   */
  private processVideoFrame(frameData: any): void {
    // Format might differ between local relay agent and cloud backend
    // Normalize the data format if needed
    const normalizedData = this.useCloudMode ? this.normalizeCloudVideoFrame(frameData) : frameData;
    
    // Notify all registered callbacks
    this.videoFrameCallbacks.forEach(callback => {
      try {
        callback(normalizedData);
      } catch (error) {
        console.error('Error in video frame callback:', error);
      }
    });
  }
  
  /**
   * Normalize cloud video frame format to match local format
   * @param cloudData Cloud backend video frame data
   * @returns Normalized video frame data
   */
  private normalizeCloudVideoFrame(cloudData: any): any {
    // Cloud backend sends different format than local relay agent
    // Convert to consistent format for consumers
    if (cloudData.type === 'video_frame') {
      return {
        timestamp: cloudData.timestamp,
        frameId: cloudData.frameId,
        driverId: cloudData.driverId,
        sessionId: cloudData.sessionId,
        url: cloudData.url,
        // Add base URL if it's a relative path
        imageUrl: cloudData.url.startsWith('/') ? 
          `https://pitbox.digitalocean.app${cloudData.url}` : 
          cloudData.url
      };
    }
    
    return cloudData;
  }

  /**
   * Process incoming telemetry data
   * @param telemetryData Telemetry data from the relay agent or cloud backend
   */
  private processTelemetryData(telemetryData: any): void {
    // Format might differ between local relay agent and cloud backend
    // Normalize the data format if needed
    const normalizedData = this.useCloudMode ? this.normalizeCloudTelemetry(telemetryData) : telemetryData;
    
    // Notify all registered callbacks
    this.telemetryCallbacks.forEach(callback => {
      try {
        callback(normalizedData);
      } catch (error) {
        console.error('Error in telemetry callback:', error);
      }
    });
  }
  
  /**
   * Normalize cloud telemetry format to match local format
   * @param cloudData Cloud backend telemetry data
   * @returns Normalized telemetry data
   */
  private normalizeCloudTelemetry(cloudData: any): any {
    // Cloud backend sends different format than local relay agent
    // Convert to consistent format for consumers
    if (cloudData.type === 'telemetry') {
      return {
        timestamp: cloudData.timestamp,
        driverId: cloudData.driverId,
        sessionId: cloudData.sessionId,
        data: cloudData.data
      };
    }
    
    return cloudData;
  }
  
  /**
   * Process incoming AI feedback data (cloud mode only)
   * @param feedbackData AI feedback data from cloud backend
   */
  private processAiFeedback(feedbackData: any): void {
    // Notify all registered callbacks
    this.aiFeedbackCallbacks.forEach(callback => {
      try {
        callback(feedbackData);
      } catch (error) {
        console.error('Error in AI feedback callback:', error);
      }
    });
  }
  
  /**
   * Process incoming voice data (cloud mode only)
   * @param voiceData Voice data from cloud backend
   */
  private processVoiceData(voiceData: any): void {
    // Notify all registered callbacks
    this.voiceCallbacks.forEach(callback => {
      try {
        callback(voiceData);
      } catch (error) {
        console.error('Error in voice callback:', error);
      }
    });
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyConnectionStatus(): void {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(this.isConnected);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  /**
   * Register a callback for video frame data
   * @param callback Function to call when a video frame is received
   * @returns Function to unregister the callback
   */
  public onVideoFrame(callback: (frameData: any) => void): () => void {
    this.videoFrameCallbacks.push(callback);
    return () => {
      this.videoFrameCallbacks = this.videoFrameCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register a callback for telemetry data
   * @param callback Function to call when telemetry data is received
   * @returns Function to unregister the callback
   */
  public onTelemetry(callback: (telemetryData: any) => void): () => void {
    this.telemetryCallbacks.push(callback);
    return () => {
      this.telemetryCallbacks = this.telemetryCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a callback for AI feedback data (cloud mode only)
   * @param callback Function to call when AI feedback is received
   * @returns Function to unregister the callback
   */
  public onAiFeedback(callback: (feedbackData: any) => void): () => void {
    this.aiFeedbackCallbacks.push(callback);
    return () => {
      this.aiFeedbackCallbacks = this.aiFeedbackCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Register a callback for voice data (cloud mode only)
   * @param callback Function to call when voice data is received
   * @returns Function to unregister the callback
   */
  public onVoice(callback: (voiceData: any) => void): () => void {
    this.voiceCallbacks.push(callback);
    return () => {
      this.voiceCallbacks = this.voiceCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register a callback for connection status changes
   * @param callback Function to call when connection status changes
   * @returns Function to unregister the callback
   */
  public onConnectionStatus(callback: (isConnected: boolean) => void): () => void {
    this.connectionStatusCallbacks.push(callback);
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Check if currently connected to the relay agent or cloud backend
   * @returns True if connected, false otherwise
   */
  public isConnectedToRelayAgent(): boolean {
    return this.isConnected;
  }
  
  /**
   * Check if currently in cloud mode
   * @returns True if in cloud mode, false if in local mode
   */
  public isCloudMode(): boolean {
    return this.useCloudMode;
  }
  
  /**
   * Set cloud mode
   * @param useCloud Whether to use cloud mode
   */
  public setCloudMode(useCloud: boolean): void {
    if (this.useCloudMode !== useCloud) {
      this.useCloudMode = useCloud;
      
      // Reconnect if already connected
      if (this.isConnected) {
        this.disconnect();
        this.connect(undefined, useCloud, this.token);
      }
    }
  }

  /**
   * Get the current server URL
   * @returns The current server URL
   */
  public getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Set the server URL
   * @param url The new server URL
   * @param isLocalUrl Whether this is the local relay agent URL
   */
  public setServerUrl(url: string, isLocalUrl: boolean = false): void {
    if (isLocalUrl) {
      this.localServerUrl = url;
      
      // If currently in local mode, update the active URL
      if (!this.useCloudMode) {
        this.serverUrl = url;
      }
    } else {
      this.serverUrl = url;
    }
  }
  
  /**
   * Set the authentication token
   * @param token JWT token for authentication
   */
  public setAuthToken(token: string): void {
    this.token = token;
  }
}

// Export singleton instance
export const relayAgentService = RelayAgentService.getInstance();
export default relayAgentService;
