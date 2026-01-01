import React from 'react';
import { 
  Grid, Paper, Typography, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Switch, Box
} from '@mui/material';

function SettingsPage() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Connection Settings
          </Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Backend URL"
              defaultValue="http://137.184.151.3:3000"
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Connection Type</InputLabel>
              <Select
                defaultValue="websocket"
                label="Connection Type"
              >
                <MenuItem value="websocket">WebSocket</MenuItem>
                <MenuItem value="polling">Polling</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel 
              control={<Switch defaultChecked />} 
              label="Auto Reconnect" 
              sx={{ mt: 2 }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
            >
              Save Connection Settings
            </Button>
          </Box>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            API Keys
          </Typography>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="OpenAI API Key"
              type="password"
              defaultValue="sk-••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
              margin="normal"
            />
            <TextField
              fullWidth
              label="ElevenLabs API Key"
              type="password"
              defaultValue="sk-••••••••••••••••••••••••••••••••••••"
              margin="normal"
            />
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
            >
              Save API Keys
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default SettingsPage;
