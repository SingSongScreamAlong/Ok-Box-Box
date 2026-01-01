import React, { useState } from 'react';
import PerformanceTestRunner from './PerformanceTestRunner';
import { PerformanceTestResult } from '../../utils/PerformanceTester';

const PerformanceTestPage: React.FC = () => {
  const [lastReport, setLastReport] = useState<string>('');
  const [showReport, setShowReport] = useState<boolean>(false);

  const handleTestComplete = (results: PerformanceTestResult[]) => {
    // Generate a report from the results
    const report = generateReport(results);
    setLastReport(report);
    setShowReport(true);
  };

  const generateReport = (results: PerformanceTestResult[]): string => {
    let report = '# Dashboard Performance Test Report\n\n';
    
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
  };

  const saveReport = () => {
    if (!lastReport) return;
    
    // Create a blob from the report
    const blob = new Blob([lastReport], { type: 'text/markdown' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().slice(0, 10)}.md`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="performance-test-page">
      <h1>Dashboard Performance Testing</h1>
      
      <div className="test-description">
        <p>
          This page allows you to run automated performance tests to validate the dashboard's
          performance optimizations. Each test will measure FPS, render time, and memory usage
          under different load conditions.
        </p>
      </div>
      
      <div className="test-runner-container">
        <PerformanceTestRunner onComplete={handleTestComplete} />
      </div>
      
      {showReport && (
        <div className="report-actions">
          <button 
            className="save-report-button"
            onClick={saveReport}
          >
            Save Report as Markdown
          </button>
        </div>
      )}
      
      <div className="performance-tips">
        <h3>Performance Testing Tips</h3>
        <ul>
          <li>Close other browser tabs and applications before running tests</li>
          <li>Run tests multiple times to get consistent results</li>
          <li>Compare results before and after code changes to detect regressions</li>
          <li>Tests should maintain at least 55 FPS for optimal user experience</li>
          <li>Press Alt+P to show the real-time performance monitor during normal usage</li>
        </ul>
      </div>
    </div>
  );
};

export default PerformanceTestPage;
