at# PitBox Driver App Development Guide

This guide provides instructions for setting up and developing the PitBox Driver App.

> Note on archived code
>
> The repository may contain an `archived/` directory for legacy or experimental modules retained for reference (for example, `dashboard/archived/services/TacviewDataService.ts`). This path is excluded from TypeScript builds and ESLint to prevent accidental imports. Do not import anything from `archived/**` into active code. If you need a module back, move it into the appropriate `src/` folder and modernize types/tests.

## Development Environment Setup

### Prerequisites
- Node.js 16+ and npm 8+
- TypeScript 4.5+
- Electron 22+
- Git

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/pitbox.git
   cd pitbox/driver_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For testing with a mock backend:
   ```bash
   # In a separate terminal
   cd mock_server
   npm install
   npm start
   ```

## Tacview Development Workflow (Dashboard)

The team dashboard includes a Tacview-like telemetry view for historical playback and live streaming.

1. Backend URL
   - Dashboard uses `REACT_APP_BACKEND_URL` for the persistence API (default: `http://localhost:4000`).
   - Ensure this is set in `dashboard/.env.local` (see `.env.local.example`).

2. Start services
   - Backend: `cd server && npm start` (serves REST + Socket.IO on port 4000 by default).
   - Dashboard: `cd dashboard && npm start`.

3. Quick demo flow
   - In the Tacview tab toolbar:
     - Click “Create Dev Session” (creates `dev-session-1`).
     - Click “Append Sample” to add a sample telemetry point.
     - Click “Load Session” to fetch and render data.

4. Session picker
   - Click “Refresh Sessions” to load available sessions.
   - Click “Pick Session” and select one; “Load Session” will use the selected ID.

5. Live mode
   - Toggle “Live: On” to connect to Socket.IO and stream telemetry for the selected session.
   - Live updates append to the current view; toggle “Live: Off” to disconnect and clean up.

Notes
- Busy operations disable controls to prevent concurrent requests.
- Timeline labels show `mm:ss`; slider is disabled while busy.

## Backend Persistence (Postgres/Timescale)

The backend now persists sessions and telemetry to Postgres using TimescaleDB.

### Install Postgres and TimescaleDB

- macOS (Homebrew):
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  # TimescaleDB
  brew install timescaledb
  timescaledb-tune --quiet --yes || true
  ```

- Ubuntu/Debian (apt):
  ```bash
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
  # TimescaleDB
  # See: https://docs.timescale.com/self-hosted/latest/install/installation-linux/
  # Example for Ubuntu 22.04:
  sudo apt-get install -y gnupg wget lsb-release
  echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list
  curl -L https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
  sudo apt-get update
  sudo apt-get install -y timescaledb-2-postgresql-14 || true
  sudo timescaledb-tune --quiet --yes || true
  sudo systemctl restart postgresql
  ```

### Create database and enable extension

```sql
-- In psql
CREATE DATABASE pitbox_telemetry;
\c pitbox_telemetry
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Configure backend env

Copy and edit `server/.env.example` to `server/.env`:

```
PG_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/pitbox_telemetry
```

### Install server deps and run migrations

```bash
cd server
npm install
npm run migrate:dev
```

### Run backend and verify

```bash
npm run dev
# In another terminal
curl -s http://localhost:4000/health | jq
curl -s -X POST http://localhost:4000/sessions -H 'Content-Type: application/json' -d '{"name":"Dev Session","track":"Test"}' | jq
curl -s http://localhost:4000/sessions | jq

# Append sample telemetry (replace SESSION_ID)
SESSION_ID=<id from previous output>
curl -s -X POST http://localhost:4000/sessions/$SESSION_ID/telemetry \
  -H 'Content-Type: application/json' \
  -d '{
    "driverId":"d1",
    "speed":120,
    "rpm":7500,
    "gear":4,
    "throttle":0.85,
    "brake":0.0,
    "steering":0.02,
    "tires":{
      "frontLeft":{"temp":85,"wear":0.02,"pressure":26.2},
      "frontRight":{"temp":86,"wear":0.02,"pressure":26.3},
      "rearLeft":{"temp":90,"wear":0.03,"pressure":25.9},
      "rearRight":{"temp":91,"wear":0.03,"pressure":26.0}
    },
    "position":{"x":123.4,"y":56.7,"z":0},
    "lap":5,
    "sector":2,
    "lapTime":0,
    "sectorTime":0,
    "bestLapTime":0,
    "bestSectorTimes":[],
    "gForce":{"lateral":1.1,"longitudinal":0.2,"vertical":0.9},
    "trackPosition":0.45,
    "racePosition":3,
    "gapAhead":1.2,
    "gapBehind":0.8,
    "timestamp":'"$(node -e 'console.log(Date.now())')"'
  }' | jq

# Query back
curl -s "http://localhost:4000/sessions/$SESSION_ID/telemetry?fromTs=0" | jq '.count'
```

The dashboard Tacview panel will now show persisted data when selecting this session and live streaming remains functional via Socket.IO.

## Project Structure

```
driver_app/
├── src/                  # Source code
│   ├── adapters/         # Simulator adapters (iRacing, Assetto Corsa, etc.)
│   ├── api/              # API interfaces for service boundaries
│   ├── config/           # Configuration management
│   ├── models/           # Data models and interfaces
│   ├── services/         # Core services (telemetry, data transmission, etc.)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── main.ts           # Main Electron process
│   └── preload.ts        # Electron preload script
├── resources/            # Static resources (icons, images, etc.)
├── mock_server/          # Mock backend server for development
├── deployment/           # Deployment configurations and scripts
├── tests/                # Test files
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Development Workflow

### 1. Feature Development

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Implement your feature, following the modular architecture:
   - Add new adapters in `src/adapters/`
   - Define API interfaces in `src/api/`
   - Create data models in `src/models/`
   - Implement services in `src/services/`

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

4. Write tests for your feature:
   ```bash
   # Create test files in tests/ directory
   npm test
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### 2. Code Quality

- Run linting:
  ```bash
  npm run lint
  ```

- Run TypeScript type checking:
  ```bash
  npm run type-check
  ```

- Format code:
  ```bash
  npm run format
  ```

### 3. Testing

- Run unit tests:
  ```bash
  npm test
  ```

- Run integration tests:
  ```bash
  npm run test:integration
  ```

- Run end-to-end tests:
  ```bash
  npm run test:e2e
  ```

### 4. Pull Request

1. Push your feature branch:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a pull request to the `develop` branch
3. Ensure CI checks pass
4. Request code review
5. Address feedback and make necessary changes
6. Merge to `develop` once approved

## API Integration

### Connecting to PitBox Core

The Driver App communicates with PitBox Core using WebSockets and REST APIs:

1. WebSocket connection for real-time telemetry:
   ```typescript
   // Example in src/services/DataTransmissionService.ts
   this.socket = io(this.serverUrl, {
     reconnection: true,
     reconnectionAttempts: Infinity,
     reconnectionDelay: 1000,
     reconnectionDelayMax: 5000,
     timeout: 20000,
   });
   ```

2. REST API for configuration and authentication:
   ```typescript
   // Example API call
   async function fetchConfig() {
     const response = await fetch(`${serverUrl}/api/v1/system/config`);
     return response.json();
   }
   ```

### Simulator Adapters

To add support for a new simulator:

1. Create a new adapter in `src/adapters/` that implements the `SimAdapter` interface
2. Register the adapter in `src/services/TelemetryService.ts`

## Building and Packaging

- Build TypeScript:
  ```bash
  npm run build
  ```

- Package the application:
  ```bash
  npm run package
  ```

- Create installers:
  ```bash
  npm run make
  ```

## Debugging

- Enable debug logging:
  ```bash
  # Windows
  set DEBUG=pitbox:*
  # macOS/Linux
  export DEBUG=pitbox:*
  
  npm run dev
  ```

- Debug Electron main process:
  ```bash
  npm run debug:main
  ```

## Contributing Guidelines

1. Follow the TypeScript coding style
2. Write meaningful commit messages following Conventional Commits
3. Include tests for new features
4. Update documentation for API changes
5. Keep pull requests focused on a single feature or bug fix

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Socket.IO Documentation](https://socket.io/docs/v4)
- [iRacing SDK Documentation](https://github.com/iRacing/irsdk-node)
