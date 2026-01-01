import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorContainer = styled.div`
  padding: 16px;
  margin: 8px 0;
  border-radius: 4px;
  background-color: #2a2a45;
  border-left: 4px solid #f44336;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ErrorHeading = styled.h4`
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 16px;
  color: #f44336;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ErrorMessage = styled.p`
  margin: 10px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #ffffff;
`;

const RetryButton = styled.button`
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s ease, transform 0.1s ease;
  
  &:hover {
    background-color: #d32f2f;
  }
  
  &:focus {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

/**
 * Error boundary component specifically designed for multi-driver components
 * Catches JavaScript errors in child components, logs them, and displays a fallback UI
 */
class MultiDriverErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('MultiDriverErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, render the default error UI
      const errorId = `error-${Math.random().toString(36).substring(2, 9)}`;
      const errorMessageId = `error-message-${Math.random().toString(36).substring(2, 9)}`;
      
      return (
        <ErrorContainer 
          role="alert" 
          aria-live="assertive"
          aria-labelledby={errorId}
          aria-describedby={errorMessageId}
        >
          <ErrorHeading id={errorId}>
            {React.createElement(FiAlertTriangle as any, { 'aria-hidden': true })}
            Multi-Driver Component Error
          </ErrorHeading>
          <ErrorMessage id={errorMessageId}>
            {this.state.error?.message || 'An unexpected error occurred in a multi-driver component.'}
          </ErrorMessage>
          <RetryButton 
            onClick={this.handleRetry}
            aria-label="Retry loading the component"
          >
            {React.createElement(FiRefreshCw as any, { 'aria-hidden': true })}
            Retry
          </RetryButton>
        </ErrorContainer>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default MultiDriverErrorBoundary;
