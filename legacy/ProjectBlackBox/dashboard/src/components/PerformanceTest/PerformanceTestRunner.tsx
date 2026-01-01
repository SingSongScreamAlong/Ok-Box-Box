import React, { useState, useEffect } from 'react';
import { PerformanceTester, PerformanceTestConfig, PerformanceTestResult } from '../../utils/PerformanceTester';
import { multiDriverService } from '../../services/MultiDriverService';
import webSocketService from '../../services/WebSocketService';

interface PerformanceTestRunnerProps {
  onComplete?: (results: PerformanceTestResult[]) => void;
}

const PerformanceTestRunner: React.FC<PerformanceTestRunnerProps> = ({ onComplete }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  // Define performance tests
  const getPerformanceTests = (): PerformanceTestConfig[] => {
    return [
      {
        name: 'WebSocketService Throttling',
        duration: 3000,
        setup: () => {
          // Setup mock high-frequency data stream
          const mockInterval = setInterval(() => {
            // Simulate 100 telemetry events per second (10ms interval)
            webSocketService.mockReceiveEvent('telemetry', {
              sessionId: 'test-session',
              timestamp: Date.now(),
              data: {
                speed: Math.random() * 200,
                rpm: Math.random() * 8000,
                gear: Math.floor(Math.random() * 6) + 1,
                position: { x: Math.random() * 100, y: Math.random() * 100 }
              }
            });
          }, 10);
          
          return () => clearInterval(mockInterval);
        },
        testFn: () => {
          // Nothing to do here, the setup already triggers the events
        },
        targetFps: 55,
        targetRenderTime: 16.7
      },
      {
        name: 'CompetitorAnalysis Virtualization',
        duration: 3000,
        setup: () => {
          // Generate large competitor dataset
          const competitors = Array.from({ length: 100 }, (_, i) => ({
            id: `driver-${i}`,
            name: `Driver ${i}`,
            position: i + 1,
            gap: i === 0 ? '0.000' : `+${(Math.random() * 60).toFixed(3)}`,
            sector1: (Math.random() * 30 + 20).toFixed(3),
            sector2: (Math.random() * 30 + 25).toFixed(3),
            sector3: (Math.random() * 30 + 22).toFixed(3),
            lastLap: (Math.random() * 90 + 60).toFixed(3),
            bestLap: (Math.random() * 85 + 60).toFixed(3),
            tireCompound: ['Soft', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
            pitstops: Math.floor(Math.random() * 3)
          }));
          
          // Set mock competitor data
          multiDriverService.setMockCompetitorData(competitors);
        },
        testFn: () => {
          // Update a random competitor every frame to trigger re-renders
          const randomIndex = Math.floor(Math.random() * 100);
          const competitors = multiDriverService.getMockCompetitorData();
          if (competitors && competitors.length > 0) {
            competitors[randomIndex].gap = `+${(Math.random() * 60).toFixed(3)}`;
            multiDriverService.setMockCompetitorData([...competitors]);
          }
        },
        targetFps: 55,
        targetRenderTime: 16.7
      },
      {
        name: 'TrackMap Canvas Rendering',
        duration: 3000,
        setup: () => {
          // Setup mock car position updates
          const mockInterval = setInterval(() => {
            // Simulate 30 position updates per second
            multiDriverService.updateMockCarPosition({
              x: Math.random() * 800,
              y: Math.random() * 600
            });
          }, 33);
          
          return () => clearInterval(mockInterval);
        },
        testFn: () => {
          // Nothing to do here, the setup already triggers the updates
        },
        targetFps: 55,
        targetRenderTime: 16.7
      }
    ];
  };

  // Run all performance tests
  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    const tester = new PerformanceTester();
    const tests = getPerformanceTests();
    const results: PerformanceTestResult[] = [];
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      
      // Run the test
      const result = await tester.runTest(test);
      results.push(result);
      
      // Update progress
      setProgress(((i + 1) / tests.length) * 100);
    }
    
    setResults(results);
    setIsRunning(false);
    setCurrentTest('');
    
    if (onComplete) {
      onComplete(results);
    }
  };

  // Generate a report from the results
  const generateReport = () => {
    if (results.length === 0) return '';
    
    const tester = new PerformanceTester();
    return tester.generateReport(results);
  };

  return (
    <div className="performance-test-runner">
      <h2>Dashboard Performance Tests</h2>
      
      {isRunning ? (
        <div className="test-progress">
          <h3>Running: {currentTest}</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p>{Math.round(progress)}% complete</p>
        </div>
      ) : (
        <button 
          className="run-tests-button"
          onClick={runTests}
        >
          Run Performance Tests
        </button>
      )}
      
      {results.length > 0 && (
        <div className="test-results">
          <h3>Test Results</h3>
          
          <div className="results-summary">
            <p>
              <strong>Tests Passed:</strong> {results.filter(r => r.passed).length} / {results.length}
            </p>
          </div>
          
          <div className="results-details">
            {results.map((result, index) => (
              <div key={index} className={`result-item ${result.passed ? 'passed' : 'failed'}`}>
                <h4>{result.name}</h4>
                <p>Status: {result.passed ? '✅ PASSED' : '❌ FAILED'}</p>
                <p>Average FPS: {result.avgFps.toFixed(2)}</p>
                <p>Average Render Time: {result.avgRenderTime.toFixed(2)}ms</p>
              </div>
            ))}
          </div>
          
          <div className="report-section">
            <h3>Performance Report</h3>
            <pre className="report-content">
              {generateReport()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTestRunner;
