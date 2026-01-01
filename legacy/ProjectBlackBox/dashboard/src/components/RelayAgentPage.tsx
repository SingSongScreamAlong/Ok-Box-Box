import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Grid,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import RelayAgentMonitor from './RelayAgentMonitor';
import MultiDriverValidationWrapper from './multi-driver/MultiDriverValidationWrapper';
import MultiDriverErrorBoundary from './multi-driver/MultiDriverErrorBoundary';

/**
 * Page component for relay agent monitoring and configuration
 */
const RelayAgentPage: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>('ws://137.184.151.3:8765');
  const [autoConnect, setAutoConnect] = useState<boolean>(true);
  const [showMonitor, setShowMonitor] = useState<boolean>(true);

  const handleServerUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setServerUrl(event.target.value);
  };

  const handleAutoConnectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoConnect(event.target.checked);
  };

  const handleApplySettings = () => {
    // Force re-render of the monitor component by toggling showMonitor
    setShowMonitor(false);
    setTimeout(() => setShowMonitor(true), 100);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Relay Agent Integration
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connection Settings
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid sx={{ gridColumn: 'span 12', '@media (min-width:900px)': { gridColumn: 'span 6' } }}>
            <TextField
              label="Relay Agent WebSocket URL"
              variant="outlined"
              fullWidth
              value={serverUrl}
              onChange={handleServerUrlChange}
              helperText="Example: ws://137.184.151.3:8765"
            />
          </Grid>
          <Grid sx={{ gridColumn: 'span 12', '@media (min-width:900px)': { gridColumn: 'span 3' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoConnect}
                  onChange={handleAutoConnectChange}
                  color="primary"
                />
              }
              label="Auto Connect"
            />
          </Grid>
          <Grid sx={{ gridColumn: 'span 12', '@media (min-width:900px)': { gridColumn: 'span 3' } }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleApplySettings}
              fullWidth
            >
              Apply Settings
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Live Monitoring
        </Typography>
        
        {showMonitor && (
          <MultiDriverErrorBoundary>
            <MultiDriverValidationWrapper
              component="RelayAgentMonitor"
              isValidating={false}
            >
              <RelayAgentMonitor 
                serverUrl={serverUrl}
                autoConnect={autoConnect}
              />
            </MultiDriverValidationWrapper>
          </MultiDriverErrorBoundary>
        )}
      </Box>
      
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Configuration Guide
        </Typography>
        
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Setting Up the Driver Side
          </Typography>
          
          <Typography variant="body1" paragraph>
            To send data from the driver PC to this dashboard:
          </Typography>
          
          <ol>
            <li>
              <Typography variant="body1" paragraph>
                <strong>Configure the relay agent</strong> on the driver PC by editing 
                <code>~/PitBoxRelay/config/config.json</code> and setting:
                <pre>{`"backend_url": "ws://137.184.151.3:8765"`}</pre>
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                <strong>Start the relay agent</strong> on the driver PC.
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                <strong>Start the driver app</strong> which will connect to the local relay agent.
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                <strong>Verify the connection</strong> using the Live Monitoring panel above.
              </Typography>
            </li>
          </ol>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Troubleshooting
          </Typography>
          
          <ul>
            <li>
              <Typography variant="body1" paragraph>
                Ensure port 8765 is open on the Digital Ocean server firewall.
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Check that the relay agent is running and properly configured on the driver PC.
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Verify network connectivity between the driver PC and the Digital Ocean server.
              </Typography>
            </li>
          </ul>
        </Paper>
      </Box>
    </Container>
  );
};

export default RelayAgentPage;
