import React, { useState } from 'react';
import styled from 'styled-components';
import './MultiDriverValidation.css';

interface ValidationResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: {
    [key: string]: any;
  };
}

interface Props {
  results: ValidationResult[];
  component: string;
}

const ResultsContainer = styled.div`
  background-color: #252540;
  border-radius: 6px;
  padding: 15px;
  margin-top: 10px;
  max-height: 400px;
  overflow-y: auto;
`;

const ResultItem = styled.div<{ status: string }>`
  margin-bottom: 12px;
  padding: 10px;
  border-radius: 4px;
  background-color: ${props => 
    props.status === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
    props.status === 'warning' ? 'rgba(255, 152, 0, 0.1)' : 
    'rgba(244, 67, 54, 0.1)'
  };
  border-left: 4px solid ${props => 
    props.status === 'success' ? '#4CAF50' : 
    props.status === 'warning' ? '#FF9800' : 
    '#F44336'
  };
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ResultTitle = styled.div`
  font-weight: 600;
  color: #e0e0e0;
`;

const ResultTimestamp = styled.div`
  font-size: 12px;
  color: #a3a3cc;
`;

const ResultMessage = styled.div`
  color: #d0d0d0;
  margin-bottom: 8px;
`;

const DetailsToggle = styled.button`
  background: none;
  border: none;
  color: #00d8ff;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  text-decoration: underline;
  margin-top: 5px;
  
  &:hover {
    color: #66e7ff;
  }
`;

const DetailsContainer = styled.div`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 10px;
  margin-top: 8px;
  font-family: monospace;
  font-size: 12px;
  color: #d0d0d0;
  max-height: 200px;
  overflow-y: auto;
`;

const NoResults = styled.div`
  color: #a3a3cc;
  text-align: center;
  padding: 20px;
`;

const MultiDriverValidationResults: React.FC<Props> = ({ results, component }) => {
  const [expandedDetails, setExpandedDetails] = useState<string[]>([]);
  
  const toggleDetails = (timestamp: string) => {
    setExpandedDetails(prev => 
      prev.includes(timestamp) 
        ? prev.filter(t => t !== timestamp)
        : [...prev, timestamp]
    );
  };
  
  const filteredResults = component 
    ? results.filter(result => result.component === component)
    : results;
  
  if (filteredResults.length === 0) {
    return (
      <ResultsContainer>
        <NoResults>No validation results available for this component.</NoResults>
      </ResultsContainer>
    );
  }
  
  return (
    <ResultsContainer>
      {filteredResults.map((result, index) => (
        <ResultItem key={`${result.component}-${result.timestamp}-${index}`} status={result.status}>
          <ResultHeader>
            <ResultTitle>{result.component.replace(/_/g, ' ')}</ResultTitle>
            <ResultTimestamp>{new Date(result.timestamp).toLocaleTimeString()}</ResultTimestamp>
          </ResultHeader>
          <ResultMessage>{result.message}</ResultMessage>
          
          {result.details && (
            <>
              <DetailsToggle onClick={() => toggleDetails(result.timestamp)}>
                {expandedDetails.includes(result.timestamp) ? 'Hide Details' : 'Show Details'}
              </DetailsToggle>
              
              {expandedDetails.includes(result.timestamp) && (
                <DetailsContainer>
                  <pre>{JSON.stringify(result.details, null, 2)}</pre>
                </DetailsContainer>
              )}
            </>
          )}
        </ResultItem>
      ))}
    </ResultsContainer>
  );
};

export default MultiDriverValidationResults;
