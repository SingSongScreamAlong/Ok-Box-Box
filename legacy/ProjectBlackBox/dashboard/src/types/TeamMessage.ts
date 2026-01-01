/**
 * Unified TeamMessage interface for consistent usage across the application
 */
export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  // Optional recipient: 'all' for broadcast or a specific driverId
  recipientId?: string;
  content: string;
  priority: 'normal' | 'high' | 'critical';
  read: boolean;
  
  // Support both timestamp formats for backward compatibility
  // timestamp is the standard format (milliseconds since epoch)
  timestamp?: number;
  
  // sentAt is used in some legacy components (ISO date string)
  sentAt?: string;
}

/**
 * Helper functions for working with TeamMessage objects
 */
export const TeamMessageUtils = {
  /**
   * Get the timestamp from a TeamMessage, handling both formats
   * @param message The TeamMessage object
   * @returns The timestamp as a Date object
   */
  getTimestamp(message: TeamMessage): Date {
    if (message.timestamp) {
      return new Date(message.timestamp);
    } else if (message.sentAt) {
      return new Date(message.sentAt);
    }
    return new Date(); // Fallback to current time
  },
  
  /**
   * Format the timestamp for display
   * @param message The TeamMessage object
   * @param format The format to use (default: 'time')
   * @returns Formatted timestamp string
   */
  formatTimestamp(message: TeamMessage, format: 'time' | 'date' | 'datetime' = 'time'): string {
    const date = this.getTimestamp(message);
    
    switch (format) {
      case 'time':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'date':
        return date.toLocaleDateString();
      case 'datetime':
        return date.toLocaleString();
      default:
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  },
  
  /**
   * Convert between timestamp formats if needed
   * @param message The TeamMessage object
   * @returns A TeamMessage with both timestamp formats populated
   */
  normalizeTimestamp(message: TeamMessage): TeamMessage {
    const result = { ...message };
    
    if (message.timestamp && !message.sentAt) {
      result.sentAt = new Date(message.timestamp).toISOString();
    } else if (message.sentAt && !message.timestamp) {
      result.timestamp = new Date(message.sentAt).getTime();
    }
    
    return result;
  }
};
