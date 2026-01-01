import React from 'react';
import { 
  Grid, Paper, Typography, Box, Card, CardContent, 
  Chip, List, ListItem, ListItemText, Divider 
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SportsScoreIcon from '@mui/icons-material/SportsScore';

function Dashboard({ telemetryData, connected, messages }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Race Dashboard
          </Typography>
          <Chip 
            label={connected ? "Connected" : "Disconnected"} 
            color={connected ? "success" : "error"} 
          />
        </Paper>
      </Grid>
      
      {/* Telemetry Cards */}
      <Grid item xs={12} md={6}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TimerIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">Lap Time</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                  {telemetryData.lapTime}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SpeedIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">Speed</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                  {telemetryData.speed} km/h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SportsScoreIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">Position</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                  P{telemetryData.position}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <LocalGasStationIcon sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">Fuel</Typography>
                </Box>
                <Typography variant="h4" component="div" sx={{ mt: 2 }}>
                  {telemetryData.fuel}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Coaching Messages */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" component="h2" gutterBottom>
            AI Coach
          </Typography>
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {messages.length === 0 ? (
              <ListItem>
                <ListItemText primary="No messages yet" secondary="Coaching will appear here when available" />
              </ListItem>
            ) : (
              messages.map((msg, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={msg.type === 'coach' ? 'Coach' : 'System'} 
                      secondary={msg.text}
                      primaryTypographyProps={{
                        color: msg.type === 'coach' ? 'primary' : 'text.secondary',
                        fontWeight: 'bold'
                      }}
                    />
                  </ListItem>
                  {index < messages.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      </Grid>
      
      {/* Tire Wear */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Tire Wear
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">Front Left</Typography>
                <Box 
                  sx={{ 
                    height: 20, 
                    bgcolor: 'grey.800', 
                    borderRadius: 1, 
                    mt: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${telemetryData.tireWear.frontLeft}%`,
                      bgcolor: telemetryData.tireWear.frontLeft > 50 ? 'success.main' : 
                              telemetryData.tireWear.frontLeft > 20 ? 'warning.main' : 'error.main',
                    }}
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {telemetryData.tireWear.frontLeft}%
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">Front Right</Typography>
                <Box 
                  sx={{ 
                    height: 20, 
                    bgcolor: 'grey.800', 
                    borderRadius: 1, 
                    mt: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${telemetryData.tireWear.frontRight}%`,
                      bgcolor: telemetryData.tireWear.frontRight > 50 ? 'success.main' : 
                              telemetryData.tireWear.frontRight > 20 ? 'warning.main' : 'error.main',
                    }}
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {telemetryData.tireWear.frontRight}%
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">Rear Left</Typography>
                <Box 
                  sx={{ 
                    height: 20, 
                    bgcolor: 'grey.800', 
                    borderRadius: 1, 
                    mt: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${telemetryData.tireWear.rearLeft}%`,
                      bgcolor: telemetryData.tireWear.rearLeft > 50 ? 'success.main' : 
                              telemetryData.tireWear.rearLeft > 20 ? 'warning.main' : 'error.main',
                    }}
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {telemetryData.tireWear.rearLeft}%
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">Rear Right</Typography>
                <Box 
                  sx={{ 
                    height: 20, 
                    bgcolor: 'grey.800', 
                    borderRadius: 1, 
                    mt: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      height: '100%', 
                      width: `${telemetryData.tireWear.rearRight}%`,
                      bgcolor: telemetryData.tireWear.rearRight > 50 ? 'success.main' : 
                              telemetryData.tireWear.rearRight > 20 ? 'warning.main' : 'error.main',
                    }}
                  />
                </Box>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {telemetryData.tireWear.rearRight}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Dashboard;
