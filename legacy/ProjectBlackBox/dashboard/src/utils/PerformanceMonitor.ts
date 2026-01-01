/**
 * Performance monitoring utility for the PitBox Dashboard
 * Helps measure rendering performance and detect performance issues
 */

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage?: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimestamps: number[] = [];
  private isRunning = false;
  private rafId: number | null = null;
  private maxSamples: number;
  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void;

  /**
   * Create a new performance monitor
   * 
   * @param maxSamples Maximum number of samples to keep in history
   * @param onMetricsUpdate Optional callback when metrics are updated
   */
  constructor(maxSamples = 100, onMetricsUpdate?: (metrics: PerformanceMetrics) => void) {
    this.maxSamples = maxSamples;
    this.onMetricsUpdate = onMetricsUpdate;
  }

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameTimestamps = [];
    this.frameCount = 0;
    
    const monitorFrame = (timestamp: number) => {
      if (!this.isRunning) return;
      
      // Calculate time since last frame
      const renderTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      
      // Keep track of recent frames for FPS calculation
      this.frameTimestamps.push(timestamp);
      
      // Only keep the last second of timestamps
      const oneSecondAgo = timestamp - 1000;
      while (this.frameTimestamps[0] < oneSecondAgo) {
        this.frameTimestamps.shift();
      }
      
      // Calculate current FPS based on frames in the last second
      const fps = this.frameTimestamps.length;
      
      // Get memory usage if available
      let memoryUsage: number | undefined = undefined;
      if (window.performance && (performance as any).memory) {
        memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
      }
      
      // Create metrics object
      const metrics: PerformanceMetrics = {
        fps,
        renderTime,
        memoryUsage,
        timestamp
      };
      
      // Add to metrics history
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxSamples) {
        this.metrics.shift();
      }
      
      // Call update callback if provided
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(metrics);
      }
      
      // Schedule next frame
      this.rafId = requestAnimationFrame(monitorFrame);
    };
    
    this.rafId = requestAnimationFrame(monitorFrame);
  }

  /**
   * Stop monitoring performance
   */
  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Get the current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) return null;
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get the average FPS over the collected samples
   */
  getAverageFPS(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, metric) => acc + metric.fps, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get the average render time over the collected samples
   */
  getAverageRenderTime(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, metric) => acc + metric.renderTime, 0);
    return sum / this.metrics.length;
  }

  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}
