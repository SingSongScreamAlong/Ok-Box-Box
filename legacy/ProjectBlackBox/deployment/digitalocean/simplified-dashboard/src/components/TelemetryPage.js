import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

function TelemetryPage({ telemetryData }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Detailed Telemetry
          </Typography>
          <Typography variant="body1">
            This page would display detailed telemetry charts and graphs.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <pre>{JSON.stringify(telemetryData, null, 2)}</pre>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default TelemetryPage;
