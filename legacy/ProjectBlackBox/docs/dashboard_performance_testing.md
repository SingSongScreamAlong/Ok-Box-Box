# Dashboard Performance Testing Guide

This document provides instructions for running and interpreting the dashboard performance tests to ensure optimal performance and prevent regressions.

## Overview

The PitBox dashboard includes automated performance testing utilities to measure and validate rendering performance, memory usage, and data processing efficiency. These tests help identify performance regressions and validate optimization efforts.

## Running Performance Tests

### Via the Dashboard UI

1. Start the dashboard application locally:
   ```bash
   cd dashboard
   npm start
   ```

2. Navigate to the Performance Test page:
   - Access the dashboard in your browser (typically at http://localhost:3000)
   - Click on the "Performance Tests" link in the navigation menu

3. On the Performance Test page:
   - Select the test scenario from the dropdown menu
   - Configure test parameters (duration, data volume, etc.)
   - Click "Run Test" to begin the performance test
   - View real-time results in the performance monitor display

### Via Automated Scripts

For CI/CD integration or batch testing, use the command-line test runner:

```bash
cd dashboard
npm run test:performance
```

This will run all performance test scenarios with default parameters and output results to the console.

## Test Scenarios

The following test scenarios are available:

1. **Telemetry Processing**
   - Tests the dashboard's ability to process high-frequency telemetry data
   - Measures frame rate, CPU usage, and memory consumption
   - Validates WebSocketService throttling and WebWorker optimizations

2. **Multi-Driver Rendering**
   - Tests rendering performance with multiple driver data streams
   - Validates component memoization and rendering optimizations
   - Measures re-render frequency and component update times

3. **Track Map Performance**
   - Tests the TrackMap component with multiple competitors
   - Validates canvas rendering optimizations and position updates
   - Measures frame rate during high-frequency position updates

4. **Memory Management**
   - Tests object pooling and memory management optimizations
   - Measures memory usage patterns over extended test periods
   - Validates garbage collection behavior and memory leaks

## Interpreting Results

The performance test results include the following metrics:

### Frame Rate (FPS)

- **Target**: Maintain 60 FPS during normal operation, >30 FPS during high load
- **Warning threshold**: <40 FPS during normal operation, <20 FPS during high load
- **Critical threshold**: <30 FPS during normal operation, <15 FPS during high load

### CPU Usage

- **Target**: <30% average CPU usage
- **Warning threshold**: 30-50% average CPU usage
- **Critical threshold**: >50% average CPU usage

### Memory Usage

- **Target**: Stable memory usage with periodic garbage collection
- **Warning**: Steadily increasing memory usage without plateaus
- **Critical**: Exponential memory growth or frequent large GC pauses

### Render Times

- **Target**: Component render times <5ms
- **Warning threshold**: 5-15ms render times
- **Critical threshold**: >15ms render times

## Performance Regression Prevention

To prevent performance regressions:

1. Run performance tests before and after significant changes to dashboard components
2. Include performance tests in CI/CD pipelines to catch regressions early
3. Compare performance metrics against baseline values from previous releases
4. Review performance test results during code reviews for performance-sensitive changes

## Troubleshooting Common Performance Issues

### High CPU Usage

- Check for excessive re-renders using React DevTools Profiler
- Look for unoptimized event handlers or missing useCallback/useMemo
- Verify WebWorker usage for CPU-intensive operations

### Memory Leaks

- Check for unmounted component subscriptions not being cleaned up
- Verify object pooling is being used for frequently created/destroyed objects
- Look for closure-related memory retention patterns

### Slow Rendering

- Check component memoization with React.memo
- Verify that expensive calculations use useMemo
- Look for unnecessary prop changes causing re-renders

## Adding New Performance Tests

To add a new performance test scenario:

1. Create a new test configuration in `PerformanceTestRunner.tsx`
2. Implement any necessary mock data generators
3. Add performance metrics specific to the new test
4. Document the new test scenario in this guide
