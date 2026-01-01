import React, { useState, useEffect } from 'react';
import webSocketService, { ConnectionType } from '../../services/WebSocketService';
import MultiDriverValidationWrapper from '../multi-driver/MultiDriverValidationWrapper';
import MultiDriverValidationResults from '../multi-driver/MultiDriverValidationResults';
import './ComponentValidator.css';

// List of components that can be validated
const VALIDATABLE_COMPONENTS = [
  // Standard components
  'telemetry',
  'track_map',
  'ai_coaching',
  'video_panel',
  'competitor_analysis',
  'competitor_positions',
  'header',
  // Multi-driver components
  'driver_selector',
  'team_messages',
  'handoff_manager',
  'driver_comparison'
];

// Server configurations
const VALIDATION_SERVERS = {
  standard: 'ws://localhost:8766',
  multiDriver: 'ws://localhost:8767'
};

interface ValidationResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

const ComponentValidator: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(VALIDATION_SERVERS.standard);
  const [serverType, setServerType] = useState<'standard' | 'multiDriver'>('standard');
  const [showDetailedResults, setShowDetailedResults] = useState<boolean>(false);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const handleConnect = () => {
    try {
      webSocketService.connect(serverUrl, ConnectionType.NATIVE_WEBSOCKET);
      
      const connectSubscription = webSocketService.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to validation server');
      });
      
      const disconnectSubscription = webSocketService.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from validation server');
      });
      
      const validationSubscription = webSocketService.on('validation_summary', (data) => {
        const result: ValidationResult = {
          component: data.component,
          status: data.status,
          message: data.message,
          details: data.details,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setValidationResults(prev => [result, ...prev]);
        setIsValidating(false);
      });
      
      return () => {
        connectSubscription.unsubscribe();
        disconnectSubscription.unsubscribe();
        validationSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to connect to validation server:', error);
    }
  };

  const handleDisconnect = () => {
    webSocketService.disconnect();
    setIsConnected(false);
  };

  const handleValidate = () => {
    if (!selectedComponent) {
      alert('Please select a component to validate');
      return;
    }
    
    setIsValidating(true);
    // Request validation for the selected component via WebSocketService
    // This uses a typed helper on the service which emits a 'request_validation' event
    webSocketService.requestValidation(selectedComponent);
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'warning':
        return 'status-warning';
      case 'error':
        return 'status-error';
      default:
        return '';
    }
  };

  // Helper function to check if a component is a multi-driver component
  const isMultiDriverComponent = (component: string): boolean => {
    return ['driver_selector', 'team_messages', 'handoff_manager', 'driver_comparison'].includes(component);
  };

  return (
    <div className="component-validator">
      <h2 id="validator-heading">Dashboard Component Validator</h2>
      
      <div className="connection-controls" role="region" aria-labelledby="connection-heading">
        <h3 id="connection-heading" className="section-heading">Connection Settings</h3>
        <div className="form-group">
          <label htmlFor="server-type">Server Type:</label>
          <select
            id="server-type"
            value={serverType}
            onChange={(e) => {
              const type = e.target.value as 'standard' | 'multiDriver';
              setServerType(type);
              setServerUrl(VALIDATION_SERVERS[type]);
            }}
            disabled={isConnected}
          >
            <option value="standard">Standard Components</option>
            <option value="multiDriver">Multi-Driver Components</option>
          </select>
          
          <label htmlFor="server-url">Server URL:</label>
          <input
            id="server-url"
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={isConnected}
          />
        </div>
        
        {!isConnected ? (
          <button onClick={handleConnect} className="connect-btn">
            Connect to Validation Server
          </button>
        ) : (
          <button onClick={handleDisconnect} className="disconnect-btn">
            Disconnect
          </button>
        )}
      </div>
      
      {isConnected && (
        <div className="validation-controls" role="region" aria-labelledby="validation-heading">
          <h3 id="validation-heading" className="section-heading">Component Validation</h3>
          <div className="form-group">
            <label htmlFor="component-select">Select Component:</label>
            <select
              id="component-select"
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              disabled={isValidating}
              aria-describedby="component-select-help"
            >
              <option value="">-- Select a component --</option>
              {VALIDATABLE_COMPONENTS
                .filter(component => {
                  // Filter components based on server type
                  return serverType === 'multiDriver' ? isMultiDriverComponent(component) : !isMultiDriverComponent(component);
                })
                .map((component) => (
                  <option key={component} value={component}>
                    {component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
            </select>
          </div>
          
          <button
            onClick={handleValidate}
            disabled={!selectedComponent || isValidating}
            className="validate-btn"
          >
            {isValidating ? 'Validating...' : 'Validate Component'}
          </button>
        </div>
      )}
      
      <div className="validation-results" role="region" aria-labelledby="results-heading">
        <h3 id="results-heading">Validation Results</h3>
        <div id="component-select-help" className="sr-only">Select a component to validate from the list</div>
        {isMultiDriverComponent(selectedComponent) && validationResults.length > 0 && (
          <button 
            className="toggle-details-btn"
            onClick={() => setShowDetailedResults(!showDetailedResults)}
            aria-pressed={showDetailedResults}
            aria-controls="validation-results-container"
          >
            {showDetailedResults ? 'Show Simple View' : 'Show Detailed View'}
          </button>
        )}
        
        {validationResults.length === 0 ? (
          <p>No validation results yet. Connect to server and validate a component.</p>
        ) : showDetailedResults && isMultiDriverComponent(selectedComponent) ? (
          <MultiDriverValidationResults 
            results={validationResults} 
            component={selectedComponent} 
          />
        ) : (
          <div 
            id="validation-results-container"
            className="results-list"
            role="log"
            aria-live="polite"
            aria-atomic="false"
          >
            {validationResults.map((result, index) => {
              // Create unique IDs for each result
              const resultId = `result-${index}-${result.component}`;
              const messageId = `message-${index}-${result.component}`;
              const detailsId = `details-${index}-${result.component}`;
              
              // Create the result content
              const resultContent = (
                <div 
                  className={`result-item ${getStatusClass(result.status)}`}
                  role="article"
                  aria-labelledby={resultId}
                  aria-describedby={`${messageId} ${result.details ? detailsId : ''}`}
                >
                  <div className="result-header">
                    <span id={resultId} className="component-name">
                      {result.component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="result-time" aria-label={`Validated at ${result.timestamp}`}>{result.timestamp}</span>
                  </div>
                  <div id={messageId} className="result-message">{result.message}</div>
                  {result.details && (
                    <pre 
                      id={detailsId}
                      className="result-details"
                      tabIndex={0}
                    >
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
              
              // Wrap multi-driver component results with MultiDriverValidationWrapper
              return isMultiDriverComponent(result.component) ? (
                <MultiDriverValidationWrapper 
                  key={`${result.component}-${index}`}
                  component={result.component}
                  isValidating={false}
                >
                  {resultContent}
                </MultiDriverValidationWrapper>
              ) : (
                <div key={`${result.component}-${index}`}>
                  {resultContent}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentValidator;
