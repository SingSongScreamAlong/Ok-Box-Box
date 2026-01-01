import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import ComparisonEngine from '../../services/ComparisonEngine';
import DriverManager from '../../services/DriverManager';
import { DriverProfile } from '../../services/WebSocketService';
import './DriverComparison.css';

interface DriverComparisonProps {
  comparisonId?: string;
  driverAId?: string;
  driverBId?: string;
  onClose?: () => void;
}

interface ComparisonMetric {
  name: string;
  driverA: {
    value: string | number;
    delta: number;
  };
  driverB: {
    value: string | number;
    delta: number;
  };
}

const DriverComparison: React.FC<DriverComparisonProps> = ({
  comparisonId,
  driverAId,
  driverBId,
  onClose
}) => {
  const { drivers, activeDriverId } = useSelector((state: RootState) => state.drivers);
  const [selectedDriverA, setSelectedDriverA] = useState<string | undefined>(driverAId || activeDriverId || undefined);
  const [selectedDriverB, setSelectedDriverB] = useState<string | undefined>(driverBId);
  const [metrics, setMetrics] = useState<ComparisonMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeComparisonId, setActiveComparisonId] = useState<string | undefined>(comparisonId);
  
  const comparisonEngine = ComparisonEngine.getInstance();
  const driverManager = DriverManager.getInstance();

  useEffect(() => {
    // If we have a comparison ID, fetch that comparison
    if (activeComparisonId) {
      const comparison = comparisonEngine.getComparison(activeComparisonId);
      if (comparison) {
        setMetrics(comparison.metrics);
        setSelectedDriverA(comparison.driverAId);
        setSelectedDriverB(comparison.driverBId);
      }
    } 
    // If we have driver IDs but no comparison ID, start a new comparison
    else if (selectedDriverA && selectedDriverB) {
      requestComparison();
    }
  }, [activeComparisonId, selectedDriverA, selectedDriverB]);

  const requestComparison = () => {
    if (!selectedDriverA || !selectedDriverB) {
      setError('Please select two drivers to compare');
      return;
    }

    if (selectedDriverA === selectedDriverB) {
      setError('Please select different drivers to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try to get local comparison data
      const localMetrics = comparisonEngine.compareLocalTelemetry(selectedDriverA, selectedDriverB);
      
      if (localMetrics.length > 0) {
        setMetrics(localMetrics);
        setLoading(false);
      }
      
      // Also request server-side comparison for more detailed metrics
      const newComparisonId = comparisonEngine.requestComparison(selectedDriverA, selectedDriverB);
      
      if (newComparisonId) {
        setActiveComparisonId(newComparisonId);
      }
    } catch (err) {
      setError('Failed to request comparison: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  const handleDriverAChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDriverA(e.target.value);
    setActiveComparisonId(undefined);
  };

  const handleDriverBChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDriverB(e.target.value);
    setActiveComparisonId(undefined);
  };

  const handleCompare = () => {
    requestComparison();
  };

  const renderDriverSelect = (
    value: string | undefined,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    excludeId?: string
  ) => {
    const availableDrivers = drivers.filter(driver => 
      driver.id !== excludeId && driver.status !== 'offline'
    );

    return (
      <select 
        className="driver-select"
        value={value || ''}
        onChange={onChange}
      >
        <option value="">Select Driver</option>
        {availableDrivers.map(driver => (
          <option key={driver.id} value={driver.id}>
            {driver.name} ({driver.team})
          </option>
        ))}
      </select>
    );
  };

  const getDriverName = (driverId: string | undefined): string => {
    if (!driverId) return 'Unknown';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown';
  };

  const renderMetricsTable = () => {
    if (metrics.length === 0) {
      return <div className="no-metrics">No comparison data available</div>;
    }

    const driverAName = getDriverName(selectedDriverA);
    const driverBName = getDriverName(selectedDriverB);

    return (
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>{driverAName}</th>
            <th>Delta</th>
            <th>{driverBName}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, index) => (
            <tr key={index}>
              <td>{metric.name}</td>
              <td>{metric.driverA.value}</td>
              <td className={`delta ${metric.driverA.delta > 0 ? 'positive' : metric.driverA.delta < 0 ? 'negative' : ''}`}>
                {metric.driverA.delta > 0 ? '+' : ''}{typeof metric.driverA.delta === 'number' ? metric.driverA.delta.toFixed(2) : metric.driverA.delta}
              </td>
              <td>{metric.driverB.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="driver-comparison">
      <div className="comparison-header">
        <h3>Driver Comparison</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      <div className="comparison-controls">
        <div className="driver-selectors">
          <div className="driver-select-container">
            <label>Driver A</label>
            {renderDriverSelect(selectedDriverA, handleDriverAChange, selectedDriverB)}
          </div>
          <div className="versus">VS</div>
          <div className="driver-select-container">
            <label>Driver B</label>
            {renderDriverSelect(selectedDriverB, handleDriverBChange, selectedDriverA)}
          </div>
        </div>
        <button 
          className="compare-button"
          onClick={handleCompare}
          disabled={!selectedDriverA || !selectedDriverB || selectedDriverA === selectedDriverB || loading}
        >
          {loading ? 'Loading...' : 'Compare'}
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="comparison-results">
        {loading ? (
          <div className="loading">Loading comparison data...</div>
        ) : (
          renderMetricsTable()
        )}
      </div>
    </div>
  );
};

export default DriverComparison;
