import React from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material';

function StrategyPage({ telemetryData, messages }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Race Strategy
          </Typography>
          <Typography variant="body1" paragraph>
            This page would display race strategy recommendations and analysis.
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Fuel Strategy
            </Typography>
            <Typography variant="body1">
              Current fuel level: {telemetryData.fuel}%
            </Typography>
            <Typography variant="body1">
              Estimated laps remaining: {Math.floor(telemetryData.fuel / 2.5)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tire Strategy
            </Typography>
            <Typography variant="body1">
              Average tire wear: {Math.round((
                telemetryData.tireWear.frontLeft + 
                telemetryData.tireWear.frontRight + 
                telemetryData.tireWear.rearLeft + 
                telemetryData.tireWear.rearRight
              ) / 4)}%
            </Typography>
            <Typography variant="body1">
              Recommended pit stop: {
                Math.round((
                  telemetryData.tireWear.frontLeft + 
                  telemetryData.tireWear.frontRight + 
                  telemetryData.tireWear.rearLeft + 
                  telemetryData.tireWear.rearRight
                ) / 4) < 30 ? 'Yes' : 'Not yet'
              }
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default StrategyPage;
