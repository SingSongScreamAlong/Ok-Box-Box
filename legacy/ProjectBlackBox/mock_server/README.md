# PitBox Mock Server

This is a simple mock server for testing the PitBox Driver App. It provides a Socket.IO server that can receive telemetry data, video frames, and driver identification from the Driver App.

## Features

- Socket.IO server for real-time communication
- API endpoints for health checks, driver profiles, and telemetry data
- Mock driver profiles for testing
- Telemetry data storage (in-memory)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

The server will run on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/drivers` - Get list of mock driver profiles
- `GET /api/telemetry/latest` - Get the latest telemetry data (last 10 entries)

## Socket.IO Events

### Client to Server

- `telemetry` - Send telemetry data to the server
- `identify_driver` - Identify the driver for the current connection
- `video_frame` - Send a video frame to the server

### Server to Client

- `telemetry_received` - Acknowledgment of received telemetry data
- `driver_identified` - Acknowledgment of driver identification
- `video_received` - Acknowledgment of received video frame

## Testing

You can test the server using the PitBox Driver App or any Socket.IO client.

## License

This project is licensed under the MIT License.
