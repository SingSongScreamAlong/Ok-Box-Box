# ProjectPitBox Improvement Roadmap - iRacing Edition

**Generated**: November 29, 2025
**Current Status**: 100% Core Complete
**Focus**: iRacing-exclusive telemetry and coaching platform
**Next Phase**: Professional iRacing Features & MoTeC/Cosworth Integration

---

## 🏁 **iRACING-FOCUSED MISSION**

ProjectPitBox is a **professional-grade telemetry and AI coaching system exclusively for iRacing**, designed to help drivers improve their performance through data-driven insights and professional motorsport tools.

---

## 🏎️ **COSWORTH & MOTEC INTEGRATION** (iRacing Teams Use This!)

### Why This Matters for iRacing

Professional iRacing teams and top-level drivers use the same telemetry tools as real-world motorsport:
- **MoTeC i2** - Industry standard analysis software
- **Cosworth Toolbox** - Professional data logging
- **Pi Toolbox** - Track-side analysis

By exporting PitBox data to these formats, iRacing drivers can:
- Analyze with professional-grade tools
- Compare against real-world racing data
- Work with real race engineers who know these tools
- Access advanced features (math channels, XY plots, histograms)

### 1. **MoTeC i2 Export** ⭐ **HIGHEST PRIORITY**

**What**: Export iRacing telemetry to `.ld` (Logged Data) format

**iRacing-Specific Channels to Export**:
```
Speed (GPS speed from iRacing)
Engine RPM
Gear
Throttle % (0-100)
Brake % (0-100)
Steering Angle (degrees)
G-Forces (Lat/Long/Vert)
Track Position (X, Y, Z coordinates)
Tire Temps (per corner - IR, IM, IO, IC for each)
Tire Pressure (per corner)
Tire Wear (per corner)
Fuel Remaining (liters)
Fuel Used Per Lap
Brake Temps (per corner, if available)
Engine Temp
Oil Temp
Oil Pressure
Track Temp (from iRacing session data)
Air Temp (from iRacing session data)
Lap Number
Lap Time
Sector Times
Distance Around Track
Is On Track (boolean)
Session State
Track Surface Type
```

**Implementation**:
```python
# New file: /relay_agent/exporters/motec_exporter.py

class iRacingToMoTeC:
    """Convert iRacing telemetry to MoTeC i2 .ld format"""

    CHANNEL_MAP = {
        # iRacing field → MoTeC channel name
        'Speed': 'Ground Speed',
        'RPM': 'Engine Speed',
        'Gear': 'Gear',
        'Throttle': 'Throttle Pos',
        'Brake': 'Brake Pos',
        'SteeringWheelAngle': 'Steered Angle',
        'LongAccel': 'G Force Lat',
        'LatAccel': 'G Force Long',
        # ... etc
    }

    def export_session(self, iracing_data, output_path):
        """Export iRacing session to .ld file"""
        # Create MoTeC header
        # Map iRacing channels
        # Write binary .ld format
        # Include lap markers
```

**Time Estimate**: 2-3 days
**Value**: ⭐⭐⭐⭐⭐ Professional analysis capability

### 2. **iRacing Track Database with Corner Detection**

**What**: Database of all iRacing tracks with GPS corner positions

**Use Cases**:
- Automatic corner detection from GPS coordinates
- Corner-by-corner performance analysis
- Optimal racing line visualization
- Compare entry/exit speeds by corner

**Data Structure**:
```typescript
interface iRacingTrack {
  trackId: number;           // iRacing track ID
  trackName: string;         // "Road Atlanta"
  configName: string;        // "Full Course"
  corners: iRacingCorner[];
  sectors: Sector[];
  pitLaneEntry: GPSPoint;
  pitLaneExit: GPSPoint;
  startFinish: GPSPoint;
}

interface iRacingCorner {
  number: number;            // Corner 1, 2, etc.
  name?: string;             // "Turn 1", "The Kink", etc.
  apexGPS: GPSPoint;
  entryGPS: GPSPoint;
  exitGPS: GPSPoint;
  type: 'left' | 'right' | 'chicane';
  difficulty: 1-5;           // Based on iRacing data
  optimalGear: number;
  optimalSpeed: number;      // Based on track record analysis
}
```

**Implementation**: Extract from iRacing SDK track data + community database

### 3. **iRacing-Specific Telemetry Enhancements**

**Missing iRacing Data Points** (available in SDK but not captured):
```typescript
// Car-specific
WeightDistribution: number;      // Front/rear weight dist
AeroBalance: number;             // Downforce balance
BoostLevel: number;              // For turbocharged cars
DRSStatus: boolean;              // For DRS-enabled cars
PushToPassStatus: boolean;       // IndyCar-specific

// Track conditions (iRacing provides this)
TrackWetness: number;            // 0-1 scale
TrackRubberState: number;        // Rubbered in amount
TrackUsage: 'Practice' | 'Qualify' | 'Race';

// Session-specific
SessionTimeRemaining: number;
SessionLapsRemaining: number;
SessionType: string;
SOF: number;                     // Strength of Field
iRating: number;                 // Driver iRating
SafetyRating: string;            // License class

// Incident tracking
IncidentCount: number;
IncidentPoints: number;
LastIncidentLap: number;

// Relative positioning
CarsInFront: number;
CarsBehind: number;
GapToLeader: number;
GapToClassLeader: number;

// iRacing-specific flags
BlackFlag: boolean;
BlueFlag: boolean;
YellowFlag: boolean;
WhiteFlag: boolean;
CheckeredFlag: boolean;
```

---

## 🔒 **CRITICAL SECURITY FIXES** (Production Readiness)

### 1. **Environment Variable Migration** ⚠️ **IMMEDIATE**

**Problem**: 46+ hardcoded `localhost` URLs will break in production

**Files to Fix**:
```typescript
// src/config/AppConfig.ts
export class AppConfig {
  private static serverUrl: string =
-   'http://localhost:3000';
+   process.env.BACKEND_URL || 'http://localhost:3000';

  private static relayAgentUrl: string =
-   'ws://localhost:8765';
+   process.env.RELAY_AGENT_URL || 'ws://localhost:8765';
}
```

**Complete Migration Checklist**:
- [ ] `src/config/AppConfig.ts` - Backend URLs
- [ ] `relay_agent/config/config.json` - Backend endpoints
- [ ] `relay_agent/video_encoder.py` - WebSocket URLs
- [ ] `relay_agent/telemetry_collector.py` - API endpoints
- [ ] `dashboard/src/services/*.ts` - Service URLs
- [ ] `server/src/config.ts` - Database connection
- [ ] `ai_agent/server.js` - Service endpoints

### 2. **JWT Security Enforcement** ⚠️ **IMMEDIATE**

```javascript
// server/src/config.ts
const jwtSecret = process.env.JWT_SECRET;

- if (!jwtSecret || jwtSecret.length < 32) {
-   console.warn('JWT_SECRET should be at least 32 characters');
- }

+ if (!jwtSecret || jwtSecret.length < 32) {
+   throw new Error('FATAL: JWT_SECRET must be at least 32 characters for security');
+ }

+ if (process.env.NODE_ENV === 'production' && jwtSecret === 'default') {
+   throw new Error('FATAL: Cannot use default JWT_SECRET in production');
+ }
```

### 3. **SQL Injection Protection** ⚠️ **HIGH**

**Vulnerable Pattern** (found in multiple places):
```javascript
// BAD - String interpolation
const query = `SELECT * FROM sessions WHERE driver_id = '${driverId}'`;
db.query(query);

// GOOD - Parameterized queries
const query = 'SELECT * FROM sessions WHERE driver_id = ?';
db.query(query, [driverId]);
```

**Files to Audit**:
- All `server/src/*-routes.ts` files
- All database query builders
- Any dynamic SQL construction

### 4. **API Rate Limiting** ⚠️ **HIGH**

```javascript
// server/src/middleware/rate-limit.js (NEW FILE)
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Telemetry upload rate limit (higher for race sessions)
const telemetryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 600,                   // 600 requests per minute (10/sec * 60)
  skipSuccessfulRequests: false,
});

// AI coaching rate limit (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 10,                    // 10 AI requests per minute
  message: 'AI coaching rate limit exceeded',
});

module.exports = { apiLimiter, telemetryLimiter, aiLimiter };
```

Apply to routes:
```javascript
app.use('/api/', apiLimiter);
app.use('/api/telemetry', telemetryLimiter);
app.use('/api/ai/', aiLimiter);
```

---

## 📊 **IRACING-SPECIFIC TELEMETRY FEATURES**

### 1. **Full iRacing Telemetry Export** ⭐ **HIGH VALUE**

**Current Export**: 10 fields (basic)
**Target Export**: 50+ fields (complete iRacing data)

**Enhanced CSV Format**:
```csv
# Session Header
Session Type, Track, Car, Date/Time, Driver Name, iRating, Safety Rating

# Telemetry Columns (sampled at 60Hz)
Timestamp,
Lap, Sector, LapDistPct, LapTime, LapTimeRaw,

# Speed & Motion
Speed, RPM, Gear, Throttle, Brake, Clutch, Steering,

# Position & Orientation
Lat, Long, Alt, X, Y, Z, Yaw, Pitch, Roll,

# G-Forces
GForceLat, GForceLong, GForceVert,

# Tires (all 4 corners: LF, RF, LR, RR)
TempL_LF, TempM_LF, TempR_LF, TempI_LF,
TempL_RF, TempM_RF, TempR_RF, TempI_RF,
TempL_LR, TempM_LR, TempR_LR, TempI_LR,
TempL_RR, TempM_RR, TempR_RR, TempI_RR,
Pressure_LF, Pressure_RF, Pressure_LR, Pressure_RR,
Wear_LF, Wear_RF, Wear_LR, Wear_RR,

# Brakes
BrakeTemp_LF, BrakeTemp_RF, BrakeTemp_LR, BrakeTemp_RR,
BrakePressure,

# Engine & Fluids
EngineTemp, OilTemp, OilPressure, WaterTemp, WaterLevel,
Fuel, FuelUsedLap, FuelPressure,

# Suspension
SuspensionDeflection_LF, SuspensionDeflection_RF,
SuspensionDeflection_LR, SuspensionDeflection_RR,
RideHeight_LF, RideHeight_RF, RideHeight_LR, RideHeight_RR,

# Aero & Setup
DragCoeff, DownforceFront, DownforceRear, WingAngleFront, WingAngleRear,

# Track Conditions
TrackTemp, AirTemp, TrackWetness, WindSpeed, WindDir, Humidity,

# Session State
OnTrack, InPits, SessionTime, SessionState, SessionFlags,

# Relative Position
Position, ClassPosition, CarsInClass, GapToLeader, GapToNext, GapToPrev,

# Incidents & Warnings
IncidentCount, BlackFlag, BlueFlag, YellowFlag, WhiteFlag, Checkered
```

### 2. **iRacing Setup Analyzer** 🆕 **NEW FEATURE**

**What**: Analyze car setup impact on performance

**Features**:
- Track how setup changes affect lap times
- Correlate tire pressure with temperature and wear
- Analyze fuel strategy effectiveness
- Compare setups across sessions

**Data Collected**:
```typescript
interface iRacingSetup {
  sessionId: string;
  trackId: number;
  carId: number;

  // Aero
  frontWing: number;
  rearWing: number;
  rideHeight: { front: number; rear: number; };

  // Suspension
  springRate: { LF: number; RF: number; LR: number; RR: number; };
  damperBump: { LF: number; RF: number; LR: number; RR: number; };
  damperRebound: { LF: number; RF: number; LR: number; RR: number; };
  arbFront: number;
  arbRear: number;

  // Alignment
  camber: { LF: number; RF: number; LR: number; RR: number; };
  toe: { LF: number; RF: number; LR: number; RR: number; };
  caster: number;

  // Tires
  tirePressure: { LF: number; RF: number; LR: number; RR: number; };
  tireCompound: string;

  // Drivetrain
  diffPreload: number;
  diffPower: number;
  diffCoast: number;

  // Brakes
  brakeBias: number;

  // Performance Results
  avgLapTime: number;
  bestLapTime: number;
  tireWearRate: number;
  fuelConsumption: number;
  consistency: number;
}
```

**AI Analysis**:
- "Your tire pressures are too low - temps suggest 0.2 psi increase"
- "Front wing is creating understeer in Turn 3"
- "Brake bias could be 1% more forward based on lockup data"

### 3. **iRacing Race Strategy Optimizer** 🆕 **NEW FEATURE**

**What**: AI-powered pit strategy for iRacing races

**Features**:
- Fuel calculation with real-time burn rate
- Tire degradation prediction
- Optimal pit window calculation
- Alternative strategy scenarios

**Data Inputs**:
```typescript
interface iRacingRaceStrategy {
  // Session info
  raceLength: number;           // Laps or time
  currentLap: number;
  timeRemaining: number;

  // Car state
  currentFuel: number;
  fuelPerLap: number;           // Real-time calculation
  tireLapsRemaining: number;    // Predicted from wear

  // Position & competition
  currentPosition: number;
  carsInClass: number;
  gapToLeader: number;
  gapToNext: number;

  // Pit stop parameters
  pitStopTime: number;          // Track-specific
  fuelFillRate: number;         // Gallons per second
  tireChangeTime: number;       // Optional tire change

  // Track conditions
  yellowFlagLikelihood: number; // Based on SOF, track
  weatherForecast: 'dry' | 'rain' | 'mixed';
}
```

**AI Recommendations**:
```
Strategy A (Optimal):
- Pit on Lap 23 (7 laps from now)
- Take 8.2 gallons fuel
- Change tires (high wear detected)
- Estimated position after stop: P4
- Finish position: P2 (if pace maintained)

Strategy B (Aggressive):
- Short-fill pit on Lap 20
- 6.0 gallons (minimum to finish)
- No tire change (save 12 seconds)
- Risk: Tire deg in final 5 laps
- Potential finish: P1 or P5

Strategy C (Conservative):
- Pit on Lap 25 (wait for traffic)
- Full fuel load
- Fresh tires
- Guaranteed finish: P3
```

### 4. **iRacing-Specific Incident Analysis** 🆕 **NEW FEATURE**

**What**: Automatic detection and analysis of incidents

**Triggers**:
- Sudden speed loss (> 20 mph in < 0.5s)
- High G-force spike (> 3.0G)
- Off-track detection (iRacing provides this)
- Contact detection (damage increase)
- 4x/incident point increase

**Analysis Output**:
```typescript
interface iRacingIncident {
  timestamp: number;
  lap: number;
  corner: number | null;
  type: 'contact' | 'spin' | 'off-track' | 'wall-hit';

  // Telemetry at incident
  speed: number;
  gForce: { lat: number; long: number; };
  throttle: number;
  brake: number;
  steering: number;

  // AI Analysis
  cause: string;                // "Excessive throttle application"
  avoidable: boolean;
  incidentPoints: number;       // 0x, 2x, 4x
  timeLost: number;             // Seconds
  positionsLost: number;

  // Recommendations
  improvements: string[];       // ["Reduce throttle input by 10%", "Brake 5m earlier"]
}
```

---

## 🎯 **MISSING HIGH-VALUE FEATURES**

### 1. **Training System** ⭐⭐⭐⭐⭐

**Status**: Fully designed (139 lines), **ZERO implementation**

**iRacing-Specific Training Goals**:
```typescript
const iRacingTrainingGoals = [
  {
    name: "Rookie Racecraft",
    description: "Complete 10 races with 0x incidents",
    metric: "incidentPoints",
    target: 0,
    races: 10,
    reward: "Clean Racer Badge",
  },
  {
    name: "Consistency Master",
    description: "5 consecutive laps within 0.2s",
    metric: "lapTimeDeviation",
    target: 0.2,
    laps: 5,
    reward: "Consistency Badge",
  },
  {
    name: "Fuel Management",
    description: "Finish race with < 0.5L fuel remaining",
    metric: "fuelRemaining",
    target: 0.5,
    reward: "Fuel Strategist Badge",
  },
  {
    name: "Tire Whisperer",
    description: "Complete 20 laps with < 20% tire wear",
    metric: "tireWear",
    target: 20,
    laps: 20,
    reward: "Tire Management Badge",
  },
  {
    name: "Qualifying Specialist",
    description: "Start in top 5 for 5 consecutive races",
    metric: "startingPosition",
    target: 5,
    races: 5,
    reward: "Qualifier Badge",
  },
];
```

**Implementation Requirements**:
- Backend routes: `/api/training/*`
- Database schema for goals, progress, badges
- UI components for training dashboard
- AI-generated practice plans
- Progress tracking per track/car combination

### 2. **Session Report Generation** ⭐⭐⭐⭐

**What**: Automatic post-race/practice analysis

**iRacing Session Report Contents**:

```markdown
# iRacing Session Report
**Driver**: John Doe | **iRating**: 2450 | **Safety**: A 4.2
**Track**: Road Atlanta - Full Course
**Car**: BMW M4 GT3
**Session**: Race | **SOF**: 2850 | **Date**: 2025-11-29

## Summary
- **Best Lap**: 1:22.431 (Lap 8)
- **Avg Lap**: 1:23.145
- **Consistency**: 0.714s std dev (Good)
- **Finish Position**: 3rd / 24
- **Incidents**: 2x (Minor contact)
- **iRating Change**: +42

## Lap Analysis
| Lap | Time | Delta | Incidents | Notes |
|-----|------|-------|-----------|-------|
| 1 | 1:28.5 | +6.1 | 0x | Cold tires |
| 2 | 1:23.8 | +1.4 | 0x | - |
| 3 | 1:23.2 | +0.8 | 0x | Improving |
| 8 | 1:22.4 | 0.0 | 0x | **Best lap** |

## Corner Performance
Losing time in:
- **Turn 1**: -0.3s (brake 5m earlier)
- **Turn 7**: -0.2s (carry more speed)

Gaining time in:
- **Turn 3**: +0.1s (good line)
- **Turn 10**: +0.2s (excellent exit)

## Setup Recommendations
Based on tire temps and handling:
- Front tire pressure: +0.2 psi (running too cool)
- Rear wing: -1 click (slight understeer in Turn 3)
- Brake bias: 54.5% → 55.0% (front lockup in Turn 1)

## Fuel Strategy
- Average consumption: 2.8 L/lap
- Actual usage: 2.9 L/lap (5% over target)
- Tip: Lift earlier on straights to save fuel

## Incident Analysis
**Lap 12, Turn 5** (2x)
- Contact with car #22 at apex
- Cause: Slight overlap on entry
- Avoidable: Yes (wait for Turn 6)
- Time lost: 1.2s

## AI Coaching Summary
"Strong performance! Focus areas:
1. Brake point consistency in Turn 1
2. Throttle smoothness in Turn 7
3. Fuel management (save 0.1L per lap)

Next session goal: Sub-1:22.0 lap time"
```

### 3. **Corner-by-Corner Analysis** ⭐⭐⭐⭐

**What**: Detailed performance by corner

**Implementation**:
```typescript
interface iRacingCornerPerformance {
  corner: number;
  name: string;                    // "Turn 1"

  // Current lap
  entrySpeed: number;
  minSpeed: number;                // Apex speed
  exitSpeed: number;
  timeInCorner: number;

  // Comparison
  vsBestLap: number;               // Delta in seconds
  vsClassLeader: number;           // If data available
  vsOptimal: number;               // Theoretical best

  // Technique
  brakePoint: number;              // Distance from corner
  brakePressure: number;           // Max pressure
  throttleApplication: number;     // % at apex
  steeringInput: number;           // Max angle

  // Analysis
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  improvements: string[];
}
```

**Visualization** (Dashboard):
```
Track Map with color-coded corners:
🟢 Green = Gaining time
🟡 Yellow = Equal time
🔴 Red = Losing time

Click any corner for detailed analysis
```

---

## ⚡ **PERFORMANCE OPTIMIZATIONS**

### 1. **Dynamic Video Bitrate** (Complete TODO)

**Location**: `relay_agent/video_encoder.py:475`
**Current**: `TODO: Update encoder bitrate`

**Implementation**:
```python
def _transmission_loop(self):
    network_quality_history = []

    while self.running:
        # Monitor network performance
        network_quality = self._calculate_network_quality()
        network_quality_history.append(network_quality)

        # Adjust bitrate every 5 seconds
        if len(network_quality_history) >= 5:
            avg_quality = sum(network_quality_history[-5:]) / 5

            # Adjust bitrate based on network
            if avg_quality < 0.5:  # Poor network
                new_bitrate = int(self.max_bitrate * 0.5)
            elif avg_quality < 0.8:  # Medium network
                new_bitrate = int(self.max_bitrate * 0.75)
            else:  # Good network
                new_bitrate = self.max_bitrate

            # Update encoder if changed
            if new_bitrate != self.current_bitrate:
                self.current_bitrate = new_bitrate
                logger.info(f"Adjusted bitrate to {new_bitrate}kbps (quality: {avg_quality:.2f})")
                self._update_encoder_bitrate(new_bitrate)

def _calculate_network_quality(self) -> float:
    """Calculate network quality 0.0-1.0"""
    if not self.ws or not self.connected:
        return 0.0

    # Calculate from:
    # - Transmission success rate
    # - Latency
    # - Dropped frames
    success_rate = self.stats['frames_transmitted'] / max(self.stats['frames_encoded'], 1)
    dropped_rate = self.stats['dropped_frames'] / max(self.stats['frames_received'], 1)

    quality = success_rate * (1.0 - dropped_rate)
    return max(0.0, min(1.0, quality))
```

### 2. **GPU Monitoring** (Remove Placeholder)

**Location**: `relay_agent/core_agent.py:372-374`
**Current**: Hardcoded `0.0%`

**Implementation**:
```python
def get_gpu_usage(self) -> float:
    """Get GPU utilization percentage"""
    try:
        # Try NVIDIA GPUs first
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
        gpu_percent = float(utilization.gpu)
        pynvml.nvmlShutdown()
        return gpu_percent

    except ImportError:
        # Try AMD GPUs
        try:
            import pyamdgpuinfo
            gpu = pyamdgpuinfo.get_gpu(0)
            return float(gpu.query_load()) * 100.0
        except:
            pass

    except Exception as e:
        logger.debug(f"GPU monitoring unavailable: {e}")

    return 0.0  # Fallback if no GPU or monitoring unavailable
```

### 3. **iRacing Data Rate Optimization**

**Current**: Fixed 60Hz polling
**Issue**: May overwhelm on slow systems, underwhelm on fast systems

**Adaptive Sampling**:
```python
class AdaptiveTelemetryCollector:
    def __init__(self):
        self.target_hz = 60
        self.min_hz = 10
        self.max_hz = 120

    def adjust_sample_rate(self, cpu_usage: float, iracing_fps: int):
        """Adjust sampling based on system performance"""

        # If CPU struggling, reduce sampling
        if cpu_usage > 80:
            self.target_hz = max(self.min_hz, self.target_hz - 10)

        # If CPU idle and high FPS, increase sampling
        elif cpu_usage < 50 and iracing_fps > 100:
            self.target_hz = min(self.max_hz, self.target_hz + 10)

        # Match iRacing tick rate for efficiency
        if iracing_fps > 0:
            self.target_hz = min(self.target_hz, iracing_fps)

        logger.debug(f"Adjusted telemetry rate to {self.target_hz}Hz")
```

---

## 🧪 **TESTING STRATEGY**

### iRacing Integration Tests

```python
# tests/integration/test_iracing_pipeline.py

def test_full_iracing_session():
    """Test complete telemetry capture during iRacing session"""

    # 1. Start iRacing (or simulator)
    # 2. Start relay agent
    # 3. Start driver app
    # 4. Verify telemetry flowing
    # 5. Complete 3 laps
    # 6. Verify:
    #    - All laps recorded
    #    - Telemetry complete
    #    - Video captured
    #    - AI coaching generated
    #    - Data in database

def test_iracing_sdk_connection():
    """Test connection to iRacing shared memory"""
    # Verify iRacing SDK integration

def test_iracing_telemetry_accuracy():
    """Verify telemetry matches iRacing output"""
    # Compare PitBox data to iRacing telemetry files
```

---

## 📅 **IMPLEMENTATION ROADMAP**

### **Phase 1: Critical Fixes** (Week 1) ⚠️

**Days 1-2: Security**
- [ ] Migrate all hardcoded URLs to environment variables
- [ ] Enforce strong JWT secrets (fail on weak)
- [ ] Implement SQL parameterized queries throughout
- [ ] Add API rate limiting middleware

**Days 3-4: iRacing Data Quality**
- [ ] Complete dynamic video bitrate adjustment
- [ ] Implement GPU monitoring or remove placeholder
- [ ] Add missing iRacing SDK data points (incidents, flags, etc.)
- [ ] Fix any iRacing SDK connection issues

**Day 5: Testing**
- [ ] Integration test: Full iRacing session capture
- [ ] Verify all telemetry data accurate
- [ ] Performance test under load

---

### **Phase 2: MoTeC Integration** (Week 2) ⭐

**Days 1-3: MoTeC Exporter**
- [ ] Research MoTeC .ld binary format
- [ ] Implement channel mapper (iRacing → MoTeC)
- [ ] Write .ld file exporter
- [ ] Test with real MoTeC i2 software
- [ ] Document for users

**Days 4-5: Full Telemetry Export**
- [ ] Enhance CSV export (10 → 50+ fields)
- [ ] Add all iRacing SDK parameters
- [ ] Include session header metadata
- [ ] Add export options in UI

---

### **Phase 3: Advanced iRacing Features** (Week 3)

**Corner-by-Corner Analysis**
- [ ] Build iRacing track database (top 20 tracks first)
- [ ] Implement GPS-based corner detection
- [ ] Calculate entry/exit/apex speeds
- [ ] Add corner comparison visualizations

**Setup Analyzer**
- [ ] Capture iRacing setup data
- [ ] Correlate setup with performance
- [ ] AI analysis of setup impact
- [ ] Setup recommendations

---

### **Phase 4: AI & Automation** (Week 4)

**Session Reports**
- [ ] Automated report generation backend
- [ ] Report templates (practice, qualifying, race)
- [ ] PDF/HTML export
- [ ] Email delivery option

**Race Strategy**
- [ ] Real-time fuel calculation
- [ ] Tire degradation prediction
- [ ] Pit strategy optimizer
- [ ] Alternative strategy scenarios

---

### **Phase 5: Training System** (Weeks 5-6)

**Implementation**
- [ ] Database schema for training data
- [ ] Backend API routes
- [ ] Training dashboard UI
- [ ] Badge system
- [ ] Goal tracking
- [ ] AI-generated practice plans
- [ ] Progress visualization

---

### **Phase 6: Polish & Deploy** (Week 7)

**Production Readiness**
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] Deployment to DigitalOcean
- [ ] User onboarding flow
- [ ] Beta testing with iRacing community

---

## 💰 **BUSINESS VALUE - iRacing Focus**

| Feature | iRacing User Value | Implementation | ROI |
|---------|-------------------|----------------|-----|
| MoTeC Export | ⭐⭐⭐⭐⭐ | 2-3 days | **Very High** |
| Security Fixes | ⭐⭐⭐⭐⭐ | 2-3 hours | **Critical** |
| Training System | ⭐⭐⭐⭐⭐ | 1-2 weeks | **High** |
| Session Reports | ⭐⭐⭐⭐ | 3-4 days | **High** |
| Corner Analysis | ⭐⭐⭐⭐ | 3-4 days | **High** |
| Setup Analyzer | ⭐⭐⭐⭐ | 2-3 days | **Medium-High** |
| Race Strategy | ⭐⭐⭐⭐ | 2-3 days | **Medium-High** |
| Full CSV Export | ⭐⭐⭐ | 1 day | **High** |
| Incident Analysis | ⭐⭐⭐ | 2 days | **Medium** |

---

## 🎓 **LEARNING FROM PRO MOTORSPORT**

**What Cosworth/MoTeC Teams Do** (Apply to iRacing):

1. **Math Channels** - Derived calculations
   - Slip angle = atan(lateral velocity / longitudinal velocity)
   - Corner speed efficiency = actual apex speed / theoretical max
   - Brake efficiency = deceleration / brake pressure

2. **XY Plots** - Multi-variable analysis
   - Lateral G vs Speed (traction circle)
   - Throttle vs Steering (understeer detection)
   - Tire temp vs Pressure (optimal pressure finder)

3. **Histograms** - Distribution analysis
   - Gear usage by corner
   - Brake pressure distribution
   - Throttle application patterns

4. **Reference Laps** - Professional benchmarking
   - Compare against world record iRacing laps
   - Overlay telemetry with class leaders
   - Learn from top split drivers

---

## ✅ **QUICK WINS** (< 1 Day Each)

1. **Full CSV Export** - Add all iRacing SDK fields (4 hours)
2. **Environment Variables** - Migrate hardcoded URLs (3 hours)
3. **API Rate Limiting** - Add express-rate-limit (2 hours)
4. **JWT Enforcement** - Fail on weak secrets (1 hour)
5. **Incident Detection** - Auto-detect from iRacing data (4 hours)
6. **Flag Indicators** - Display iRacing flags in UI (2 hours)

---

## 🎯 **SUCCESS METRICS**

**Technical Goals**:
- ✅ Zero hardcoded URLs
- ✅ 100% SQL injection protected
- ✅ MoTeC export working with real i2 software
- ✅ < 5% CPU usage during races
- ✅ < 100ms telemetry latency

**User Value Goals**:
- ✅ 10+ iRacing tracks with corner database
- ✅ Lap time improvement tracking
- ✅ Professional-grade telemetry export
- ✅ AI coaching accuracy > 85%
- ✅ Setup recommendations tested and validated

---

**Status**: Ready to implement - iRacing-focused roadmap ⚡
**Priority**: Security → MoTeC → Training → Advanced Features
**Timeline**: 7 weeks to "Pro iRacing Platform" status

---

*This roadmap transforms PitBox into the premier iRacing telemetry platform, combining professional motorsport tools with AI-powered coaching specifically for iRacing sim racers.*
