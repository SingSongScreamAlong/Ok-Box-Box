/**
 * Performance testing utility for the PitBox Dashboard
 * Helps automate performance testing and benchmarking
 */
import { PerformanceMonitor } from './PerformanceMonitor';

export interface PerformanceTestConfig {
  /** Test name for reporting */
  name: string;
  
  /** Test duration in milliseconds */
  duration: number;
  
  /** Function to run before the test starts */
  setup?: () => void | Promise<void>;
  
  /** Function to run during the test (called each frame) */
  testFn: () => void;
  
  /** Function to run after the test completes */
  teardown?: () => void | Promise<void>;
  
  /** Target FPS threshold for pass/fail */
  targetFps?: number;
  
  /** Target render time threshold in ms for pass/fail */
  targetRenderTime?: number;
}

export interface PerformanceTestResult {
  name: string;
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgRenderTime: number;
  maxRenderTime: number;
  duration: number;
  passed: boolean;
  memoryStart?: number;
  memoryEnd?: number;
  memoryDelta?: number;
}

export class PerformanceTester {
  private monitor: PerformanceMonitor;
  
  constructor() {
    this.monitor = new PerformanceMonitor(1000); // Store up to 1000 samples
  }
  
  /**
   * Run a performance test with the given configuration
   */
  async runTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
    // Setup phase
    if (config.setup) {
      await Promise.resolve(config.setup());
    }
    
    // Get initial memory usage if available
    let memoryStart: number | undefined;
    if (window.performance && (performance as any).memory) {
      memoryStart = (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    
    // Start monitoring
    this.monitor.clearMetrics();
    this.monitor.start();
    
    // Run test
    const startTime = performance.now();
    const endTime = startTime + config.duration;
    
    return new Promise<PerformanceTestResult>((resolve) => {
      const runFrame = () => {
        const now = performance.now();
        
        // Run the test function
        config.testFn();
        
        if (now < endTime) {
          // Continue test
          requestAnimationFrame(runFrame);
        } else {
          // Test complete
          this.monitor.stop();
          
          // Get final memory usage if available
          let memoryEnd: number | undefined;
          let memoryDelta: number | undefined;
          
          if (window.performance && (performance as any).memory) {
            memoryEnd = (performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
            if (memoryStart !== undefined) {
              memoryDelta = memoryEnd - memoryStart;
            }
          }
          
          // Calculate metrics
          const metrics = this.monitor.getAllMetrics();
          const avgFps = this.monitor.getAverageFPS();
          const avgRenderTime = this.monitor.getAverageRenderTime();
          
          // Find min/max values
          let minFps = Number.MAX_VALUE;
          let maxFps = 0;
          let maxRenderTime = 0;
          
          metrics.forEach(metric => {
            minFps = Math.min(minFps, metric.fps);
            maxFps = Math.max(maxFps, metric.fps);
            maxRenderTime = Math.max(maxRenderTime, metric.renderTime);
          });
          
          // Determine if test passed based on thresholds
          const targetFps = config.targetFps || 55; // Default target: 55 FPS
          const targetRenderTime = config.targetRenderTime || 16.7; // Default target: 16.7ms (60fps)
          
          const passed = avgFps >= targetFps && avgRenderTime <= targetRenderTime;
          
          // Create result
          const result: PerformanceTestResult = {
            name: config.name,
            avgFps,
            minFps: minFps === Number.MAX_VALUE ? 0 : minFps,
            maxFps,
            avgRenderTime,
            maxRenderTime,
            duration: config.duration,
            passed,
            memoryStart,
            memoryEnd,
            memoryDelta
          };
          
          // Run teardown
          if (config.teardown) {
            Promise.resolve(config.teardown()).then(() => {
              resolve(result);
            });
          } else {
            resolve(result);
          }
        }
      };
      
      // Start the test loop
      requestAnimationFrame(runFrame);
    });
  }
  
  /**
   * Run a series of performance tests
   */
  async runTests(configs: PerformanceTestConfig[]): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];
    
    for (const config of configs) {
      const result = await this.runTest(config);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Generate a report from test results
   */
  generateReport(results: PerformanceTestResult[]): string {
    let report = '# Performance Test Report\n\n';
    
    // Add timestamp
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Add summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    
    report += `## Summary\n\n`;
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${totalTests - passedTests}\n\n`;
    
    // Add detailed results
    report += `## Test Results\n\n`;
    
    results.forEach(result => {
      report += `### ${result.name}\n\n`;
      report += `- Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- Average FPS: ${result.avgFps.toFixed(2)}\n`;
      report += `- Min FPS: ${result.minFps.toFixed(2)}\n`;
      report += `- Max FPS: ${result.maxFps.toFixed(2)}\n`;
      report += `- Average Render Time: ${result.avgRenderTime.toFixed(2)}ms\n`;
      report += `- Max Render Time: ${result.maxRenderTime.toFixed(2)}ms\n`;
      
      if (result.memoryDelta !== undefined) {
        report += `- Memory Usage: ${result.memoryStart?.toFixed(2)}MB → ${result.memoryEnd?.toFixed(2)}MB (${result.memoryDelta > 0 ? '+' : ''}${result.memoryDelta.toFixed(2)}MB)\n`;
      }
      
      report += `- Test Duration: ${result.duration}ms\n\n`;
    });
    
    return report;
  }
}
