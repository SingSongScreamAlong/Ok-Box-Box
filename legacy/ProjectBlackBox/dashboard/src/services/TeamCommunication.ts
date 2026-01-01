import WebSocketService, { TeamMessageEvent } from './WebSocketService';
import DriverManager from './DriverManager';
import { TeamMessage, TeamMessageUtils } from '../types/TeamMessage';


/**
 * Message listener type for subscribing to message events
 */
type MessageListener = (message: TeamMessage) => void;

/**
 * TeamCommunication Service
 * 
 * Responsible for handling team messages and coordination between drivers
 */
class TeamCommunication {
  private static instance: TeamCommunication;
  private websocketService: typeof WebSocketService;
  private driverManager: DriverManager;
  
  // Store messages by ID
  private messages: Map<string, TeamMessage> = new Map();
  
  // Message listeners
  private messageListeners: MessageListener[] = [];

  private constructor() {
    this.websocketService = WebSocketService;
    this.driverManager = DriverManager.getInstance();
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of TeamCommunication
   */
  public static getInstance(): TeamCommunication {
    if (!TeamCommunication.instance) {
      TeamCommunication.instance = new TeamCommunication();
    }
    return TeamCommunication.instance;
  }

  /**
   * Set up WebSocket event listeners for team communication events
   */
  private setupEventListeners(): void {
    // Listen for team messages
    this.websocketService.on('team_message', (event) => {
      this.handleTeamMessage(event);
    });
  }

  /**
   * Handle incoming team message
   * @param event Team message event
   */
  private handleTeamMessage(event: any): void {
    const { message } = event;
    
    // Create a new message object
    const teamMessage: TeamMessage = {
      ...message,
      read: false
    };
    
    // Store the message
    this.messages.set(teamMessage.id, teamMessage);
    
    // Notify listeners
    this.notifyListeners(teamMessage);
  }

  /**
   * Notify all message listeners of a new message
   * @param message The team message
   */
  private notifyListeners(message: TeamMessage): void {
    this.messageListeners.forEach(listener => {
      listener(message);
    });
  }

  /**
   * Send a team message
   * @param content The message content
   * @param priority The message priority
   * @returns The message ID
   */
  public sendMessage(content: string, priority: 'normal' | 'high' | 'critical' = 'normal'): string | null {
    const activeDriver = this.driverManager.getActiveDriver();
    
    if (!activeDriver) {
      console.error('Cannot send message: No active driver');
      return null;
    }
    
    // Send the message via WebSocket
    const wsPriority: 'normal' | 'critical' = priority === 'critical' ? 'critical' : 'normal';
    this.websocketService.sendTeamMessage(
      content,
      wsPriority,
      activeDriver.id,
      activeDriver.name
    );
    
    // Note: The message will be added to the messages map when it comes back from the server
    // This ensures consistency with the server's message ID
    
    return 'pending'; // Placeholder ID until the message is confirmed by the server
  }

  /**
   * Subscribe to message events
   * @param listener The message listener function
   * @returns A function to unsubscribe
   */
  public subscribe(listener: MessageListener): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get all messages
   * @returns Array of all messages
   */
  public getAllMessages(): TeamMessage[] {
    return Array.from(this.messages.values()).sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return bTime - aTime;
    });
  }

  /**
   * Get unread messages
   * @returns Array of unread messages
   */
  public getUnreadMessages(): TeamMessage[] {
    return this.getAllMessages().filter(message => !message.read);
  }

  /**
   * Get high priority messages
   * @returns Array of high priority messages
   */
  public getHighPriorityMessages(): TeamMessage[] {
    return this.getAllMessages().filter(message => 
      message.priority === 'high' || message.priority === 'critical'
    );
  }

  /**
   * Mark a message as read
   * @param messageId The ID of the message to mark as read
   */
  public markAsRead(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.read = true;
      this.messages.set(messageId, message);
    }
  }

  /**
   * Mark all messages as read
   */
  public markAllAsRead(): void {
    this.messages.forEach((message, id) => {
      message.read = true;
      this.messages.set(id, message);
    });
  }

  /**
   * Clear messages
   * @param messageId Optional ID of the message to clear, if not provided all messages will be cleared
   */
  public clearMessages(messageId?: string): void {
    if (messageId) {
      this.messages.delete(messageId);
    } else {
      this.messages.clear();
    }
  }
}

export default TeamCommunication;
