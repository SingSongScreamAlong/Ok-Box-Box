import React, { useEffect, useState, useRef } from 'react';
import { relayAgentService } from '../services/RelayAgentService';
import { Box, Button, Typography, Paper, Grid, CircularProgress, Alert } from '@mui/material';

interface RelayAgentMonitorProps {
  serverUrl?: string;
  autoConnect?: boolean;
}

/**
 * Component for monitoring and displaying data from the relay agent
 */
const RelayAgentMonitor: React.FC<RelayAgentMonitorProps> = ({ 
  serverUrl, 
  autoConnect = true 
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastVideoFrame, setLastVideoFrame] = useState<any>(null);
  const [lastTelemetry, setLastTelemetry] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [telemetryCount, setTelemetryCount] = useState<number>(0);
  
  const videoRef = useRef<HTMLImageElement>(null);
  const connectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to relay agent on component mount
  useEffect(() => {
    // Set custom server URL if provided
    if (serverUrl) {
      relayAgentService.setServerUrl(serverUrl);
    }
    
    // Register event listeners
    const unsubscribeConnection = relayAgentService.onConnectionStatus((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setError('Disconnected from relay agent');
      } else {
        setError(null);
      }
    });
    
    const unsubscribeVideo = relayAgentService.onVideoFrame((frameData) => {
      setLastVideoFrame(frameData);
      setFrameCount((prev) => prev + 1);
      
      // Display the video frame if it contains image data
      if (frameData && frameData.image && videoRef.current) {
        try {
          // Assuming the image is base64 encoded
          videoRef.current.src = `data:image/jpeg;base64,${frameData.image}`;
        } catch (err) {
          console.error('Error displaying video frame:', err);
        }
      }
    });
    
    const unsubscribeTelemetry = relayAgentService.onTelemetry((telemetryData) => {
      setLastTelemetry(telemetryData);
      setTelemetryCount((prev) => prev + 1);
    });
    
    // Auto-connect if enabled
    if (autoConnect) {
      handleConnect();
    }
    
    // Clean up on unmount
    return () => {
      if (typeof unsubscribeConnection === 'function') unsubscribeConnection();
      if (typeof unsubscribeVideo === 'function') unsubscribeVideo();
      if (typeof unsubscribeTelemetry === 'function') unsubscribeTelemetry();
      
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
    };
  }, [serverUrl, autoConnect]);

  // Handle connect button click
  const handleConnect = () => {
    try {
      setError(null);
      relayAgentService.connect();
      
      // Set a timeout to check if connection was successful
      connectionTimerRef.current = setTimeout(() => {
        if (!isConnected) {
          setError('Failed to connect to relay agent. Check server URL and try again.');
        }
      }, 5000);
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    relayAgentService.disconnect();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Relay Agent Monitor
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          Server: {relayAgentService.getServerUrl()}
        </Typography>
        <Typography variant="subtitle2">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleConnect}
          disabled={isConnected}
          sx={{ mr: 2 }}
        >
          Connect
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={handleDisconnect}
          disabled={!isConnected}
        >
          Disconnect
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        {/* Video Display */}
        <Grid sx={{ gridColumn: 'span 12', '@media (min-width:900px)': { gridColumn: 'span 6' } }}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              height: '300px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Video Feed
            </Typography>
            
            {isConnected ? (
              <>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: '220px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {frameCount > 0 ? (
                    <img 
                      ref={videoRef} 
                      alt="Video Feed" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain' 
                      }} 
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Waiting for video frames...
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption">
                  Frames received: {frameCount}
                </Typography>
              </>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Connect to view video feed
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Telemetry Display */}
        <Grid sx={{ gridColumn: 'span 12', '@media (min-width:900px)': { gridColumn: 'span 6' } }}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              height: '300px', 
              overflowY: 'auto',
              backgroundColor: '#f5f5f5'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Telemetry Data
            </Typography>
            
            {isConnected ? (
              <>
                {telemetryCount > 0 ? (
                  <pre style={{ fontSize: '0.8rem' }}>
                    {JSON.stringify(lastTelemetry, null, 2)}
                  </pre>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Waiting for telemetry data...
                  </Typography>
                )}
                <Typography variant="caption">
                  Updates received: {telemetryCount}
                </Typography>
              </>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Connect to view telemetry data
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RelayAgentMonitor;
