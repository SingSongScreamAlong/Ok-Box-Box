/**
 * Data compression utility for optimizing telemetry data transmission
 * Provides methods for compressing and decompressing data using zlib
 */

import * as zlib from 'zlib';
import { TelemetryData } from '../models/TelemetryData';

/**
 * Compression levels
 */
export enum CompressionLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 5,
  HIGH = 9
}

/**
 * Compression options
 */
export interface CompressionOptions {
  level: CompressionLevel;
  threshold: number; // Minimum size in bytes to compress
  batchSize: number; // Number of telemetry points to batch before compression
}

/**
 * Default compression options
 */
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  level: CompressionLevel.MEDIUM,
  threshold: 1024, // 1KB
  batchSize: 10
};

/**
 * Data compression utility class
 */
export class DataCompression {
  private options: CompressionOptions;
  
  /**
   * Create a new DataCompression instance
   * @param options Compression options
   */
  constructor(options: Partial<CompressionOptions> = {}) {
    this.options = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options
    };
  }
  
  /**
   * Compress telemetry data
   * @param data Telemetry data to compress
   * @returns Promise that resolves with compressed data as Buffer
   */
  async compressTelemetry(data: TelemetryData | TelemetryData[]): Promise<Buffer> {
    const jsonData = JSON.stringify(data);
    
    // Don't compress small data
    if (jsonData.length < this.options.threshold) {
      const buffer = Buffer.from(jsonData);
      // Add a header byte to indicate uncompressed data (0)
      const result = Buffer.alloc(buffer.length + 1);
      result[0] = 0;
      buffer.copy(result, 1);
      return result;
    }
    
    return new Promise<Buffer>((resolve, reject) => {
      zlib.deflate(jsonData, { level: this.options.level }, (err, compressed) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add a header byte to indicate compressed data (1)
        const result = Buffer.alloc(compressed.length + 1);
        result[0] = 1;
        compressed.copy(result, 1);
        resolve(result);
      });
    });
  }
  
  /**
   * Decompress telemetry data
   * @param data Compressed data as Buffer
   * @returns Promise that resolves with decompressed telemetry data
   */
  async decompressTelemetry<T = TelemetryData | TelemetryData[]>(data: Buffer): Promise<T> {
    // Check header byte to determine if data is compressed
    const isCompressed = data[0] === 1;
    const dataWithoutHeader = data.slice(1);
    
    if (!isCompressed) {
      // Data is not compressed, just parse the JSON
      return JSON.parse(dataWithoutHeader.toString()) as T;
    }
    
    return new Promise<T>((resolve, reject) => {
      zlib.inflate(dataWithoutHeader, (err, decompressed) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const result = JSON.parse(decompressed.toString()) as T;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Calculate compression ratio
   * @param original Original data size
   * @param compressed Compressed data size
   * @returns Compression ratio (original / compressed)
   */
  calculateCompressionRatio(original: number, compressed: number): number {
    if (compressed === 0) return 0;
    return original / compressed;
  }
  
  /**
   * Set compression options
   * @param options New compression options
   */
  setOptions(options: Partial<CompressionOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * Get current compression options
   * @returns Current compression options
   */
  getOptions(): CompressionOptions {
    return { ...this.options };
  }
}
