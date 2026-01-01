import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { DriverComparison as DriverComparisonType } from '../../redux/slices/driversSlice';
import multiDriverService from '../../services/MultiDriverService';

/**
 * DriverComparison component for comparing telemetry data between two drivers
 */
const DriverComparison: React.FC = () => {
  const [driver1Id, setDriver1Id] = useState<string>('');
  const [driver2Id, setDriver2Id] = useState<string>('');
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const driversState = useSelector((state: RootState) => state.drivers);
  const drivers = driversState.drivers as any[];
  // Prefer new slice field name 'activeComparisons', fallback to legacy 'driverComparisons'
  const comparisons: any[] = (driversState as any).activeComparisons ?? (driversState as any).driverComparisons ?? [];
  
  // Get the current comparison data if available
  const currentComparison = comparisonId 
    ? comparisons.find((c: any) => (
        // New shape
        (c.driverAId === driver1Id && c.driverBId === driver2Id) ||
        (c.driverAId === driver2Id && c.driverBId === driver1Id) ||
        // Legacy shape
        (c.driverId1 === driver1Id && c.driverId2 === driver2Id) ||
        (c.driverId1 === driver2Id && c.driverId2 === driver1Id)
      ))
    : null;

  // Request comparison data when both drivers are selected
  const handleCompare = () => {
    if (driver1Id && driver2Id && driver1Id !== driver2Id) {
      setIsLoading(true);
      const id = multiDriverService.requestDriverComparison(driver1Id, driver2Id);
      setComparisonId(id);
    }
  };

  // Extract tire wear averages from a comparison object supporting both schemas
  const getTireWearAveragesFromComparison = (comp: any): { a: number; b: number } => {
    if (!comp) return { a: 0, b: 0 };
    // Legacy structured metrics
    if (comp.metrics?.tireWear) {
      const a = averageTireWear(comp.metrics.tireWear.driver1);
      const b = averageTireWear(comp.metrics.tireWear.driver2);
      return { a, b };
    }
    // New array metrics
    const metricsArr: any[] = Array.isArray(comp.metrics) ? comp.metrics : [];
    const getMetric = (name: string) => metricsArr.find(m => m?.name === name);
    const avgMetric = getMetric('tireWearAvg');
    if (avgMetric && avgMetric.driverA && avgMetric.driverB) {
      const aVal = Number(avgMetric.driverA.value) || 0;
      const bVal = Number(avgMetric.driverB.value) || 0;
      return { a: aVal, b: bVal };
    }
    // Compute from individual corners if present
    const cornerNames = ['tireWearFL', 'tireWearFR', 'tireWearRL', 'tireWearRR'];
    const aVals: number[] = [];
    const bVals: number[] = [];
    for (const n of cornerNames) {
      const m = getMetric(n);
      if (m && m.driverA && m.driverB) {
        const av = Number(m.driverA.value);
        const bv = Number(m.driverB.value);
        if (Number.isFinite(av)) aVals.push(av);
        if (Number.isFinite(bv)) bVals.push(bv);
      }
    }
    const a = aVals.length ? aVals.reduce((x, y) => x + y, 0) / aVals.length : 0;
    const b = bVals.length ? bVals.reduce((x, y) => x + y, 0) / bVals.length : 0;
    return { a, b };
  };

  // Reset loading state when comparison data is received
  useEffect(() => {
    if (currentComparison && isLoading) {
      setIsLoading(false);
    }
  }, [currentComparison, isLoading]);

  // Format time values (mm:ss.SSS)
  const formatTime = (timeInSeconds: number): string => {
    if (!timeInSeconds) return '00:00.000';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // Calculate percentage difference for comparison bars
  const calculatePercentage = (value1: number, value2: number): { driver1: number, driver2: number } => {
    if (!value1 && !value2) return { driver1: 50, driver2: 50 };
    
    const total = Math.abs(value1) + Math.abs(value2);
    const driver1Percent = (Math.abs(value1) / total) * 100;
    const driver2Percent = (Math.abs(value2) / total) * 100;
    
    return { driver1: driver1Percent, driver2: driver2Percent };
  };

  // Compute average tire wear from either legacy {fl, fr, rl, rr} or new tires {frontLeft, ...}.wear
  const averageTireWear = (tireData: any): number => {
    if (!tireData) return 0;
    // Legacy shape: { fl, fr, rl, rr }
    const hasLegacy = ['fl', 'fr', 'rl', 'rr'].every(k => typeof tireData?.[k] === 'number');
    if (hasLegacy) {
      const { fl, fr, rl, rr } = tireData as { fl: number; fr: number; rl: number; rr: number };
      const vals = [fl, fr, rl, rr].filter(v => typeof v === 'number');
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    // New shape: { frontLeft: { wear }, frontRight: { wear }, rearLeft: { wear }, rearRight: { wear } }
    const tl = tireData?.frontLeft?.wear;
    const tr = tireData?.frontRight?.wear;
    const rl = tireData?.rearLeft?.wear;
    const rr = tireData?.rearRight?.wear;
    const vals = [tl, tr, rl, rr].filter(v => typeof v === 'number');
    return vals.length ? (vals as number[]).reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  // Get driver name by ID
  const getDriverName = (id: string): string => {
    const driver = drivers.find(d => d.id === id);
    return driver ? driver.name : 'Unknown Driver';
  };

  return (
    <div className="driver-comparison">
      <div className="comparison-selector">
        <select 
          className="comparison-driver-select"
          value={driver1Id}
          onChange={(e) => setDriver1Id(e.target.value)}
        >
          <option value="">Select Driver 1</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        
        <select 
          className="comparison-driver-select"
          value={driver2Id}
          onChange={(e) => setDriver2Id(e.target.value)}
        >
          <option value="">Select Driver 2</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        
        <button 
          className="compare-button"
          onClick={handleCompare}
          disabled={!driver1Id || !driver2Id || driver1Id === driver2Id || isLoading}
        >
          {isLoading ? 'Loading...' : 'Compare'}
        </button>
      </div>
      
      {currentComparison ? (
        <div className="comparison-results">
          {/* Lap Time Comparison */}
          <div className="comparison-metric">
            <div className="metric-header">Lap Time</div>
            <div className="metric-values">
              <div className="driver-value">
                {formatTime(currentComparison.metrics.lapTime.driver1)}
              </div>
              <div className="driver-value">
                {formatTime(currentComparison.metrics.lapTime.driver2)}
              </div>
            </div>
            <div className="comparison-bar">
              {currentComparison.metrics.lapTime.driver1 && currentComparison.metrics.lapTime.driver2 && (
                <>
                  <div 
                    className="driver1-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.lapTime.driver1, 
                        currentComparison.metrics.lapTime.driver2
                      ).driver1}%` 
                    }}
                  />
                  <div 
                    className="driver2-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.lapTime.driver1, 
                        currentComparison.metrics.lapTime.driver2
                      ).driver2}%` 
                    }}
                  />
                </>
              )}
            </div>
          </div>
          
          {/* Sector Times Comparison */}
          <div className="comparison-metric">
            <div className="metric-header">Sector 1</div>
            <div className="metric-values">
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector1.driver1)}
              </div>
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector1.driver2)}
              </div>
            </div>
            <div className="comparison-bar">
              {currentComparison.metrics.sectors.sector1.driver1 && currentComparison.metrics.sectors.sector1.driver2 && (
                <>
                  <div 
                    className="driver1-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector1.driver1, 
                        currentComparison.metrics.sectors.sector1.driver2
                      ).driver1}%` 
                    }}
                  />
                  <div 
                    className="driver2-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector1.driver1, 
                        currentComparison.metrics.sectors.sector1.driver2
                      ).driver2}%` 
                    }}
                  />
                </>
              )}
            </div>
          </div>
          
          <div className="comparison-metric">
            <div className="metric-header">Sector 2</div>
            <div className="metric-values">
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector2.driver1)}
              </div>
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector2.driver2)}
              </div>
            </div>
            <div className="comparison-bar">
              {currentComparison.metrics.sectors.sector2.driver1 && currentComparison.metrics.sectors.sector2.driver2 && (
                <>
                  <div 
                    className="driver1-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector2.driver1, 
                        currentComparison.metrics.sectors.sector2.driver2
                      ).driver1}%` 
                    }}
                  />
                  <div 
                    className="driver2-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector2.driver1, 
                        currentComparison.metrics.sectors.sector2.driver2
                      ).driver2}%` 
                    }}
                  />
                </>
              )}
            </div>
          </div>
          
          <div className="comparison-metric">
            <div className="metric-header">Sector 3</div>
            <div className="metric-values">
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector3.driver1)}
              </div>
              <div className="driver-value">
                {formatTime(currentComparison.metrics.sectors.sector3.driver2)}
              </div>
            </div>
            <div className="comparison-bar">
              {currentComparison.metrics.sectors.sector3.driver1 && currentComparison.metrics.sectors.sector3.driver2 && (
                <>
                  <div 
                    className="driver1-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector3.driver1, 
                        currentComparison.metrics.sectors.sector3.driver2
                      ).driver1}%` 
                    }}
                  />
                  <div 
                    className="driver2-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.sectors.sector3.driver1, 
                        currentComparison.metrics.sectors.sector3.driver2
                      ).driver2}%` 
                    }}
                  />
                </>
              )}
            </div>
          </div>
          
          {/* Fuel Usage Comparison */}
          <div className="comparison-metric">
            <div className="metric-header">Fuel Usage (L/lap)</div>
            <div className="metric-values">
              <div className="driver-value">
                {currentComparison.metrics.fuelUsage.driver1.toFixed(2)}
              </div>
              <div className="driver-value">
                {currentComparison.metrics.fuelUsage.driver2.toFixed(2)}
              </div>
            </div>
            <div className="comparison-bar">
              {currentComparison.metrics.fuelUsage.driver1 && currentComparison.metrics.fuelUsage.driver2 && (
                <>
                  <div 
                    className="driver1-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.fuelUsage.driver1, 
                        currentComparison.metrics.fuelUsage.driver2
                      ).driver1}%` 
                    }}
                  />
                  <div 
                    className="driver2-bar" 
                    style={{ 
                      width: `${calculatePercentage(
                        currentComparison.metrics.fuelUsage.driver1, 
                        currentComparison.metrics.fuelUsage.driver2
                      ).driver2}%` 
                    }}
                  />
                </>
              )}
            </div>
          </div>
          
          {/* Tire Wear Comparison */}
          <div className="comparison-metric">
            <div className="metric-header">Average Tire Wear (%)</div>
            {(() => {
              const { a, b } = getTireWearAveragesFromComparison(currentComparison);
              const show = Number.isFinite(a) && Number.isFinite(b);
              return (
                <>
                  <div className="metric-values">
                    <div className="driver-value">{a.toFixed(1)}%</div>
                    <div className="driver-value">{b.toFixed(1)}%</div>
                  </div>
                  <div className="comparison-bar">
                    {show && (
                      <>
                        <div
                          className="driver1-bar"
                          style={{ width: `${calculatePercentage(a, b).driver1}%` }}
                        />
                        <div
                          className="driver2-bar"
                          style={{ width: `${calculatePercentage(a, b).driver2}%` }}
                        />
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="comparison-legend">
            <div className="legend-item">
              <div className="legend-color driver1-color"></div>
              <div className="legend-label">{getDriverName(driver1Id)}</div>
            </div>
            <div className="legend-item">
              <div className="legend-color driver2-color"></div>
              <div className="legend-label">{getDriverName(driver2Id)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-comparison-message">
          {driver1Id && driver2Id 
            ? 'Click Compare to view driver comparison data'
            : 'Select two drivers to compare their telemetry data'}
        </div>
      )}
    </div>
  );
};

export default DriverComparison;
