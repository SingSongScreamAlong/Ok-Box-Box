/**
 * Interface for the Application Configuration Service
 * Defines the API boundary for application configuration functionality
 */

export interface IAppConfig {
  /**
   * Get a configuration value by key
   * @param key The configuration key
   * @param defaultValue The default value to return if the key is not found
   * @returns The configuration value or the default value if not found
   */
  get<T>(key: string, defaultValue?: T): T;
  
  /**
   * Set a configuration value
   * @param key The configuration key
   * @param value The configuration value
   * @returns True if the value was set, false otherwise
   */
  set<T>(key: string, value: T): boolean;
  
  /**
   * Check if a configuration key exists
   * @param key The configuration key
   * @returns True if the key exists, false otherwise
   */
  has(key: string): boolean;
  
  /**
   * Remove a configuration key
   * @param key The configuration key
   * @returns True if the key was removed, false otherwise
   */
  remove(key: string): boolean;
  
  /**
   * Clear all configuration values
   * @returns True if all values were cleared, false otherwise
   */
  clear(): boolean;
  
  /**
   * Get all configuration keys
   * @returns Array of all configuration keys
   */
  keys(): string[];
  
  /**
   * Get all configuration values
   * @returns Record of all configuration values
   */
  getAll(): Record<string, any>;
  
  /**
   * Load configuration from file
   * @returns Promise that resolves when configuration is loaded
   */
  load(): Promise<boolean>;
  
  /**
   * Save configuration to file
   * @returns Promise that resolves when configuration is saved
   */
  save(): Promise<boolean>;
}
