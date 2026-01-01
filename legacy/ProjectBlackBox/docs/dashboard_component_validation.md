# Dashboard Component Validation

This document provides a comprehensive guide to the PitBox Dashboard Component Validation system, which allows for targeted testing of individual dashboard components with simulated data. The system now includes support for both standard dashboard components and multi-driver components.

## Overview

The Dashboard Component Validation system consists of three main parts:

1. **Standard Validation Server**: A Python-based WebSocket server that generates and sends targeted test data for standard dashboard components (port 8766).
2. **Multi-Driver Validation Server**: A separate Python-based WebSocket server that generates and sends specialized test data for multi-driver components (port 8767).
3. **ComponentValidator UI**: A React component integrated into the dashboard application that connects to either validation server and allows for on-demand component testing.

This system enables developers to test individual dashboard components in isolation, ensuring they render correctly and respond appropriately to the data they receive. The multi-driver validation capabilities allow for testing complex team-based interactions and handoff scenarios.

## Validation Servers

### Standard Validation Server

The standard validation server (`validate_dashboard_components.py`) is a WebSocket server that runs on port 8766 and provides the following functionality:

- Generates targeted test data for standard dashboard components
- Supports both automatic and on-demand component testing
- Provides validation summaries and statistics

#### Available Standard Components for Validation

The following standard components can be validated:

- `header`: Dashboard header with session information
- `telemetry`: Real-time telemetry data display
- `track_map`: Track map with position visualization
- `ai_coaching`: AI coaching insights and recommendations
- `competitor_analysis`: Competitor performance analysis
- `competitor_positions`: Competitor position tracking
- `video_panel`: Video feed management
- `strategy`: Race strategy planning and prediction

### Multi-Driver Validation Server

The multi-driver validation server (`validate_multi_driver_components.py`) is a WebSocket server that runs on port 8767 and provides the following functionality:

- Generates specialized test data for multi-driver components
- Simulates team communication and driver handoff scenarios
- Provides detailed validation results with rich test data

#### Available Multi-Driver Components for Validation

The following multi-driver components can be validated:

- `driver_selector`: Driver selection and status management
- `team_messages`: Team communication and messaging system
- `handoff_manager`: Driver handoff request and management
- `driver_comparison`: Multi-driver performance comparison

### Running the Validation Servers

#### Standard Validation Server

To start the standard validation server, run the following command from the project root:

```bash
python3 validation/validate_dashboard_components.py
```

The server will run for 60 seconds by default and will output logs indicating its status.

#### Multi-Driver Validation Server

To start the multi-driver validation server, run the following command from the project root:

```bash
python3 validation/validate_multi_driver_components.py
```

The multi-driver validation server will also run for 60 seconds by default and will output logs indicating its status.

## ComponentValidator UI

The ComponentValidator UI is a React component that provides a user interface for connecting to either validation server and testing individual dashboard components. It is accessible at the `/validator` route in the dashboard application.

### Features

- Connect to either the standard or multi-driver validation server
- Select specific components to validate based on server type
- View validation results in real-time with status indicators
- Track validation history
- Toggle between simple and detailed views for multi-driver validation results
- Error boundary protection for multi-driver component validation
- Loading state visualization during validation

### Using the ComponentValidator UI

1. Start the appropriate validation server as described above
2. Start the dashboard application (`npm start` in the `dashboard` directory)
3. Navigate to the `/validator` route in the dashboard application
4. Select the server type (Standard or Multi-Driver)
5. Click "Connect to Validation Server"
6. Select a component to validate from the dropdown (filtered based on server type)
7. Click "Validate Component"
8. View the validation results in the results panel
9. For multi-driver components, you can toggle between simple and detailed views

## WebSocket Service Integration

The dashboard's WebSocketService has been enhanced to support both Socket.io and native WebSocket connections, enabling it to connect to both the main PitBox backend and the validation servers.

### Connection Types

- `SOCKET_IO`: Used for connecting to the main PitBox backend
- `NATIVE_WEBSOCKET`: Used for connecting to the validation servers

### Event Types

The WebSocketService supports the following validation-related events:

#### Standard Validation Events

- `validation_summary`: Receives validation results from the server
- `track_position`: Receives track position data for the TrackMap component
- `video_data`: Receives video feed data for the VideoPanel component

#### Multi-Driver Validation Events

- `validation_summary`: Receives validation results from the server
- `team_message`: Receives team message data for the TeamMessages component
- `handoff_request`: Receives handoff request data for the HandoffManager component
- `handoff_response`: Receives handoff response data for the HandoffManager component
- `driver_update`: Receives driver update data for the DriverSelector component
- `driver_comparison`: Receives driver comparison data for the DriverComparison component

## Validation Protocol

The validation protocol uses JSON messages over WebSocket to communicate between the validation server and the ComponentValidator UI.

### Client-to-Server Messages

#### Validate Component Request

```json
{
  "type": "validate_component",
  "data": {
    "component": "telemetry",
    "serverType": "standard"
  }
}
```

For multi-driver components:

```json
{
  "type": "validate_component",
  "data": {
    "component": "team_messages",
    "serverType": "multiDriver"
  }
}
```

## Multi-Driver Validation Components

The multi-driver validation system includes several specialized components to enhance the validation experience:

### MultiDriverValidationWrapper

A React component that wraps multi-driver components during validation to provide:

- Error boundary protection with retry capability
- Loading state visualization
- Consistent styling and visual hierarchy

### MultiDriverValidationResults

A React component that displays detailed validation results for multi-driver components:

- Expandable/collapsible details for each validation result
- Color-coded status indicators (success, warning, error)
- JSON formatting for complex data structures
- Timestamp display for each validation event

### MultiDriverErrorBoundary

A React error boundary component specifically designed for multi-driver components:

- Catches and displays errors during component rendering
- Provides retry functionality
- Prevents errors in one component from crashing the entire validation UI

### MultiDriverLoadingState

A React component that displays a loading spinner and message while validation is in progress:

- Configurable size (small, medium, large)
- Customizable loading message
- Consistent styling with the rest of the validation UI

## Enhanced Test Data Generation

The multi-driver validation server generates rich, realistic test data for multi-driver components:

### Team Messages

- Various message types (strategy updates, weather alerts, team orders, technical feedback)
- Priority levels (normal, high, urgent)
- Read/unread status
- Optional attachments with different types

### Handoff Management

- Realistic handoff reasons and scenarios
- Multiple status types (pending, confirmed, rejected, completed, delayed, cancelled)
- Telemetry snapshots at handoff time
- Detailed status-specific information

### Driver Selection

- Multiple driver profiles with varying statuses
- Driver role changes and availability updates
- Performance metrics for comparison

## Best Practices for Multi-Driver Validation

1. **Run both validation servers simultaneously** when testing integrated functionality
2. **Use detailed view** for complex multi-driver components to see the full test data
3. **Test edge cases** by validating components multiple times to see different scenarios
4. **Check error handling** by intentionally disconnecting during validation
5. **Verify loading states** by observing the component during the validation process

#### Set Mode Request

```json
{
  "type": "set_mode",
  "data": {
    "mode": "auto"  // or "manual"
  }
}
```

### Server-to-Client Messages

#### Connection Success

```json
{
  "type": "connect",
  "data": {
    "status": "connected",
    "client_id": "12345678",
    "message": "Dashboard Component Validation Server Connected",
    "timestamp": "2025-07-10T20:13:30.346Z"
  }
}
```

#### Component Test Data

```json
{
  "type": "telemetry",  // or any other component type
  "data": {
    // Component-specific test data
  }
}
```

#### Validation Summary

```json
{
  "type": "validation_summary",
  "data": {
    "component": "telemetry",
    "status": "success",
    "message": "Telemetry component validated successfully",
    "details": {
      "data_type": "telemetry",
      "timestamp": "2025-07-10T20:13:35.123Z"
    },
    "timestamp": "2025-07-10T20:13:35.123Z"
  }
}
```

## Best Practices

1. **Test Components Individually**: Focus on testing one component at a time to isolate issues.
2. **Verify Data Rendering**: Ensure that all data fields are properly rendered in the component.
3. **Check Edge Cases**: Test with extreme values and edge cases to ensure robust rendering.
4. **Validate Interactivity**: If the component has interactive elements, ensure they respond correctly.
5. **Cross-Component Integration**: After validating individual components, test their integration in the main dashboard.

## Troubleshooting

### Connection Issues

If you're having trouble connecting to the validation server:

1. Ensure the validation server is running (`python3 validation/validate_dashboard_components.py`)
2. Check that you're using the correct WebSocket URL (`ws://localhost:8766`)
3. Verify that the port is not being used by another application

### Component Validation Failures

If a component fails validation:

1. Check the component's implementation for errors
2. Verify that the component correctly handles the test data format
3. Look for any TypeScript errors in the console
4. Ensure the WebSocketService is properly forwarding events to the component

## Extending the Validation System

### Adding New Component Tests

To add validation support for a new component:

1. Add a new test data generator function in `validate_dashboard_components.py`
2. Add the component name to the `VALIDATABLE_COMPONENTS` array in `ComponentValidator.tsx`
3. Update the WebSocketService to handle any new event types required by the component

### Customizing Test Data

To customize the test data for a component:

1. Modify the corresponding test data generator function in `validate_dashboard_components.py`
2. Ensure the data structure matches what the component expects
3. Update the component if necessary to handle the new data format

## Conclusion

The Dashboard Component Validation system provides a powerful tool for ensuring the quality and reliability of the PitBox dashboard components. By testing components individually with targeted data, developers can quickly identify and fix issues before they affect the entire dashboard.
