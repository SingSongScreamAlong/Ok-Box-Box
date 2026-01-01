import React from 'react';
import './MultiDriverValidation.css';
import { FiLoader } from 'react-icons/fi';

interface Props {
  message: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Loading state component for multi-driver components
 * Displays a spinner and optional message while content is loading
 */
const MultiDriverLoadingState: React.FC<Props> = ({ message, size = 'medium' }) => {
  const sizeClass = `size-${size}`;
  
  return (
    <div 
      className={`multi-driver-loading ${sizeClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="spinner-container" aria-hidden="true">
        {React.createElement(FiLoader as any, { className: 'spinner-icon' })}
        <div className="spinner" />
      </div>
      <p className="loading-text" id="loading-message">{message}</p>
    </div>
  );
};

export default MultiDriverLoadingState;
