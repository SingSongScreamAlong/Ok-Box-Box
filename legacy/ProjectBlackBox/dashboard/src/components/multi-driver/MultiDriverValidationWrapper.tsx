import React, { useState } from 'react';
import MultiDriverErrorBoundary from './MultiDriverErrorBoundary';
import MultiDriverLoadingState from './MultiDriverLoadingState';
import './MultiDriverValidation.css';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  component: string;
  children: React.ReactNode;
  isValidating: boolean;
}

/**
 * Wrapper component for multi-driver components during validation
 * Provides error boundary and loading state handling
 */
const MultiDriverValidationWrapper: React.FC<Props> = ({ 
  component, 
  children, 
  isValidating 
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  const handleError = (error: Error): void => {
    console.error(`Error in ${component} validation:`, error);
    setHasError(true);
  };

  const handleRetry = (): void => {
    setHasError(false);
  };

  if (isValidating && !hasError) {
    return <MultiDriverLoadingState message={`Validating ${component.replace(/_/g, ' ')}...`} />;
  }

  return (
    <div 
      className="multi-driver-validation-wrapper"
      role="region"
      aria-label={`${component.replace(/_/g, ' ')} validation container`}
    >
      <div className="multi-driver-validation-header">
        <h3 id={`${component}-heading`} className="validation-heading">Multi-Driver Component</h3>
        <span className="badge" aria-label={`Component type: ${component.replace(/_/g, ' ')}`}>
          {component.replace(/_/g, ' ')}
        </span>
      </div>
      <MultiDriverErrorBoundary
        onError={handleError}
        fallback={
          <div 
            className="multi-driver-error" 
            role="alert"
            aria-live="assertive"
          >
            <h4>
              {React.createElement(FiAlertTriangle as any, { 'aria-hidden': true, className: 'error-icon' })}
              Error in {component.replace(/_/g, ' ')}
            </h4>
            <p>An error occurred while validating this component.</p>
            <button 
              onClick={handleRetry} 
              className="retry-button"
              aria-label="Retry component validation"
            >
              {React.createElement(FiRefreshCw as any, { 'aria-hidden': true, className: 'retry-icon' })}
              Retry
            </button>
          </div>
        }
      >
        {children}
      </MultiDriverErrorBoundary>
    </div>
  );
};

export default MultiDriverValidationWrapper;
