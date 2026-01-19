# 🏁 Live Race Operations Console

This is the special operations view featuring:
- **Tabs**: LIVE, RACE, COMMS, TRACK
- **Panels**: Competitor Analysis, Pit Timing, Race Engineer Feed

## 🚀 How to Run
Run the console with the dedicated ops command:

```bash
npm run ops:console
```

This will:
1. Start the console on **Port 3005**.
2. Point it to the **Current API** on Port 3001 (`REACT_APP_BACKEND_URL=http://localhost:3001`).

**Access URL:** [http://localhost:3005](http://localhost:3005)

## 📂 Location
The source code is located in:
`legacy/ProjectBlackBox/dashboard`

## 🔗 Main Components
- **Dashboard Root**: `src/components/Dashboard/Dashboard.tsx`
- **Competitor Analysis**: `src/components/CompetitorAnalysis/CompetitorPositions.tsx`
- **Timing Tower**: `src/components/TimingTower/TimingTower.tsx`

> **Note:** This runs separately from the main `packages/dashboard` app. To integrate it fully, we will need to port the Redux logic to the new codebase.
