# PitBox Racing Dashboard

A real-time telemetry visualization dashboard for the PitBox sim racing platform. This React-based dashboard provides a modular, customizable interface for displaying telemetry data, AI coaching insights, track maps, competitor analysis, and more.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## PitBox Dashboard Architecture

The dashboard follows a modular component-based architecture:

```
src/
├── components/
│   ├── AICoaching/       # AI coaching insights and recommendations
│   ├── CompetitorAnalysis/ # Competitor positions and analysis
│   ├── Dashboard/        # Main container component
│   ├── Header/           # Session information display
│   ├── Telemetry/        # Real-time telemetry visualization
│   ├── TrackMap/         # Track visualization with position
│   └── VideoPanel/       # Video feed integration
├── services/
│   └── WebSocketService.ts # WebSocket connection management
├── styles/
│   └── dashboard.css     # Global dashboard styling
├── App.tsx              # Application entry point
└── index.tsx            # React entry point
```

## WebSocket Integration

The dashboard connects to the PitBox backend via WebSockets to receive real-time telemetry data. The `WebSocketService` singleton manages this connection and provides an event-based API for components to subscribe to specific event types.

Supported event types include:
- `connect`: Connection established
- `disconnect`: Connection lost
- `telemetry`: Real-time telemetry updates
- `session_info`: Session information updates
- `coaching`: AI coaching insights
- `skill_analysis`: Driver skill analysis
- `competitor_data`: Competitor positions and performance
- `strategy_data`: Race strategy recommendations

## Extending the Dashboard

### Adding a New Panel

1. Create a new component directory in `src/components/`
2. Create your component files (TSX and CSS)
3. Subscribe to relevant WebSocket events
4. Add your component to the Dashboard layout in `Dashboard.tsx`

### Validation

A validation script is provided to test the dashboard integration:

```bash
python3 validation/validate_dashboard_integration.py
```

This script starts a WebSocket server and generates mock telemetry data to simulate a real racing session.

## Tacview Telemetry (MVP)

A lightweight Tacview-like visualization is available on the Team side for session playback and live streaming.

Setup
- Copy `.env.local.example` to `.env.local` and set `REACT_APP_BACKEND_URL` (defaults to `http://localhost:4000`).
- Start backend (persistence + Socket.IO): `cd server && npm start`.
- Start dashboard: `cd dashboard && npm start`.

Quick demo
- In the Tacview tab toolbar:
  - Create Dev Session → Append Sample → Load Session.
  - Refresh Sessions → Pick Session to choose a session from the backend.
  - Toggle Live to stream live telemetry for the selected session.

Notes
- Busy operations temporarily disable controls; the timeline shows mm:ss labels.
- Legacy services are kept under `dashboard/archived/**` and excluded from builds—do not import from there.

## Documentation

For more detailed information about the dashboard integration, architecture, and extension points, see the [Dashboard Integration Documentation](../docs/dashboard_integration.md).
