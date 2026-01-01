# ProjectPitBox Improvement Roadmap

**Generated**: November 29, 2025
**Current Status**: 100% Core Complete
**Next Phase**: Professional Features & Integrations

---

## 🏎️ **COSWORTH & MOTORSPORT TELEMETRY INTEGRATION**

### What is Cosworth?

**Cosworth Electronics** is a leading provider of professional motorsport telemetry systems, used in:
- Formula 1, IndyCar, Formula E
- WEC (World Endurance Championship)
- Professional racing teams worldwide

**Key Products**:
- **Cosworth Toolbox** - Professional telemetry analysis software
- **Pi Toolbox** - Track-side data logging system
- Industry-standard data formats (.ld files)

### Integration Opportunities

#### 1. **MoTeC i2 Format Export** ⭐ **HIGH PRIORITY**

**What**: MoTeC i2 is the industry-standard telemetry analysis software
**File Format**: `.ld` (Logged Data) files
**Value**:
- Professional drivers/teams can analyze data in their preferred tool
- Direct comparison with professional reference laps
- Access to MoTeC's advanced analysis features

**Implementation**:
```
Location: New file /relay_agent/exporters/motec_exporter.py
Complexity: Medium (2-3 days)
Dependencies:
  - Binary file format library (struct)
  - MoTeC .ld format specification
  - Channel mapping (telemetry → MoTeC channels)
```

**Data Mapping**:
```
PitBox → MoTeC i2 Channels:
- Speed → Ground Speed (km/h)
- RPM → Engine Speed
- Throttle → Throttle Position (%)
- Brake → Brake Pressure (%)
- Steering → Steering Angle (deg)
- G-Forces → G Lat, G Long
- Tire Temps → FL/FR/RL/RR Tire Temp
- GPS Position → GPS Latitude/Longitude
```

#### 2. **Atlas Format Export** ⭐ **MEDIUM PRIORITY**

**What**: Atlas is another popular telemetry software (free alternative to MoTeC)
**File Format**: `.csv` with specific structure
**Value**:
- Free software for users
- Good visualization tools
- Easy to implement (CSV-based)

#### 3. **Pi Toolbox Integration** (Future)

**What**: Import reference laps from professional Pi Toolbox systems
**Value**: Compare your sim laps against real-world professional data
**Challenge**: Requires access to Pi Toolbox data (proprietary)

---

## 🔒 **CRITICAL SECURITY FIXES**

### 1. **Remove Hardcoded localhost URLs** ⚠️ **IMMEDIATE**

**Current Issue**: 46+ hardcoded `http://localhost:3000` references
**Impact**: Production deployments will fail
**Fix**:
```typescript
// src/config/AppConfig.ts
- serverUrl: 'http://localhost:3000'
+ serverUrl: process.env.BACKEND_URL || 'http://localhost:3000'
```

**Files to Update**:
- `src/config/AppConfig.ts`
- `relay_agent/telemetry_collector.py`
- `relay_agent/video_encoder.py`
- All service configuration files

### 2. **Enforce Strong JWT Secrets** ⚠️ **IMMEDIATE**

**Current Issue**: Weak JWT secrets only trigger a warning
**Fix**:
```javascript
// server/src/config.ts
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
-  console.warn('JWT_SECRET should be at least 32 characters');
+  throw new Error('JWT_SECRET must be at least 32 characters for production');
}
```

### 3. **SQL Injection Protection** ⚠️ **IMMEDIATE**

**Current Issue**: String interpolation in queries
**Fix**: Use parameterized queries everywhere
```javascript
// BAD
db.query(`SELECT * FROM sessions WHERE id = '${sessionId}'`)

// GOOD
db.query('SELECT * FROM sessions WHERE id = ?', [sessionId])
```

### 4. **API Rate Limiting** ⚠️ **HIGH**

**Current Issue**: Documented but not implemented
**Fix**: Add express-rate-limit middleware
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 📊 **TELEMETRY EXPORT ENHANCEMENTS**

### Current State
- ✅ Minimal CSV export (Tacview component only)
- ✅ Basic JSON export
- ❌ Missing 90% of telemetry parameters in exports
- ❌ No professional format support

### Proposed Enhancements

#### 1. **Full Telemetry CSV Export** ⭐ **HIGH PRIORITY**

**Current Export** (10 fields):
```csv
driverId,timestamp,x,y,z,speed,throttle,brake,gear,rpm
```

**Enhanced Export** (40+ fields):
```csv
timestamp,lap,sector,distance,
speed,rpm,gear,throttle,brake,clutch,steering,
tireTemp_FL,tireTemp_FR,tireTemp_RL,tireTemp_RR,
tirePressure_FL,tirePressure_FR,tirePressure_RL,tirePressure_RR,
tireWear_FL,tireWear_FR,tireWear_RL,tireWear_RR,
gLat,gLong,gVert,
fuel,fuelPerLap,
brakeTemp_FL,brakeTemp_FR,brakeTemp_RL,brakeTemp_RR,
suspension_FL,suspension_FR,suspension_RL,suspension_RR,
engineTemp,oilTemp,oilPressure,
trackTemp,airTemp,
position,x,y,z,heading
```

#### 2. **MoTeC .ld Export** ⭐ **HIGH PRIORITY**

**Implementation Plan**:
```python
# New file: relay_agent/exporters/motec_exporter.py

class MoTeCLDExporter:
    """Export telemetry to MoTeC i2 .ld format"""

    def __init__(self, session_data):
        self.session = session_data
        self.channels = self._map_channels()

    def export(self, output_path):
        """Write .ld file"""
        # Header
        self._write_header()
        # Channel definitions
        self._write_channels()
        # Data samples
        self._write_samples()
        # Lap markers
        self._write_laps()
```

**Benefits**:
- Professional analysis in MoTeC i2
- Industry-standard format
- Team collaboration with real race engineers

#### 3. **Import Telemetry Data** 🆕 **NEW FEATURE**

**Value**: Load reference laps for comparison
**Formats to Support**:
- CSV (our format)
- MoTeC .ld (if available)
- iRacing telemetry files
- Generic JSON format

---

## 🚀 **MISSING HIGH-VALUE FEATURES**

### 1. **Training System** ⭐ **HIGHEST USER VALUE**

**Status**: Fully designed (139 lines of interfaces), **ZERO implementation**

**What's Missing**:
```typescript
// Models exist in src/models/TrainingModel.ts
interface TrainingGoal { ... }      // ✅ Defined
interface Badge { ... }              // ✅ Defined
interface SkillProgression { ... }   // ✅ Defined

// Implementation: ❌ NONE
- No backend routes
- No database schema
- No UI components
- No goal tracking logic
```

**User Value**: ⭐⭐⭐⭐⭐
- Gamification (badges, achievements)
- Structured practice goals
- Skill progression tracking
- Learning velocity metrics

**Implementation Estimate**: 5-7 days

#### Training System Architecture

```
┌─────────────────────────────────────────┐
│  Training Dashboard UI                  │
│  - Active goals                         │
│  - Badge collection                     │
│  - Skill radar chart                    │
│  - Practice recommendations             │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  Training Engine (NEW)                  │
│  - Goal progress tracking               │
│  - Achievement detection                │
│  - Skill assessment                     │
│  - AI-generated practice plans          │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  Telemetry Analysis                     │
│  - Lap time improvements                │
│  - Consistency scoring                  │
│  - Technique metrics                    │
└─────────────────────────────────────────┘
```

### 2. **Session Report Generation** ⭐ **HIGH VALUE**

**Status**: Interfaces defined, **no implementation**

**What It Should Do**:
- Automatic post-session analysis
- Setup recommendations (tire pressure, wing angles, etc.)
- Strategy analysis (fuel, tire stint length)
- Incident tracking
- Performance trends
- AI-generated improvement suggestions

**Current**: Manual review only
**Proposed**: Automated PDF/HTML report generation

### 3. **Corner-by-Corner Analysis** ⭐ **HIGH VALUE**

**Status**: Data structures defined, **no corner detection**

**Missing**:
- Corner detection algorithm
- Entry/exit speed tracking
- Minimum speed identification
- Braking point analysis
- Apex speed comparison

**Value**:
- Identify which corners losing/gaining time
- Compare braking points lap-to-lap
- Track corner-specific improvements

### 4. **Lap Comparison Tool** ⭐ **HIGH VALUE**

**Current**: Only "best lap" tracking
**Proposed**:
- Visual overlay of multiple laps
- Telemetry delta comparison
- Speed trace visualization
- Time gained/lost by segment

---

## 🎯 **PERFORMANCE OPTIMIZATIONS**

### 1. **Dynamic Video Bitrate Adjustment** ⚠️ **TODO REMOVAL**

**Location**: `relay_agent/video_encoder.py:475`
**Current**: `TODO: Update encoder bitrate`
**Impact**: Video quality doesn't adapt to network

**Implementation**:
```python
def adjust_bitrate(self, network_quality):
    """Dynamically adjust encoder bitrate"""
    if network_quality < 0.5:  # Poor network
        self.current_bitrate = self.max_bitrate * 0.5
    elif network_quality < 0.8:  # Medium network
        self.current_bitrate = self.max_bitrate * 0.75
    else:  # Good network
        self.current_bitrate = self.max_bitrate

    # Update OpenCV encoder settings
    if hasattr(cv2, 'VIDEOWRITER_PROP_BITRATE'):
        self.video_writer.set(
            cv2.VIDEOWRITER_PROP_BITRATE,
            self.current_bitrate * 1000
        )
```

### 2. **GPU Monitoring Implementation**

**Location**: `relay_agent/core_agent.py:372-374`
**Current**: Hardcoded `0.0%` placeholder
**Fix**: Use pynvml (NVIDIA GPUs) or WMI (Windows)

```python
try:
    import pynvml
    pynvml.nvmlInit()
    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
    utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
    gpu_percent = utilization.gpu
except:
    gpu_percent = 0.0  # Fallback
```

### 3. **Telemetry Buffer Configuration**

**Current**: Fixed 1000 samples
**Issue**: Insufficient for endurance racing (2+ hour sessions)
**Fix**: Time-based rolling window

```typescript
// Instead of: maxSamples: 1000
const HISTORY_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SAMPLE_RATE_HZ = 60;
const maxSamples = (HISTORY_DURATION_MS / 1000) * SAMPLE_RATE_HZ;
```

---

## 🔌 **SIM PLATFORM EXPANSION**

### Current Support
- ✅ iRacing (full support)
- ⚠️ Assetto Corsa (placeholder only)

### Proposed Additions

#### 1. **rFactor 2** ⭐ **HIGH DEMAND**

**Why**: Professional sim used by real racing teams
**Complexity**: Medium (similar to iRacing SDK)
**API**: rFactor 2 Shared Memory Plugin

#### 2. **Automobilista 2** ⭐ **MEDIUM DEMAND**

**Why**: Growing competitive sim
**Complexity**: Low (uses same API as Project CARS)
**API**: Shared Memory

#### 3. **F1 Series** (EA/Codemasters)

**Why**: Massive user base
**Complexity**: Medium
**API**: UDP telemetry packets

---

## 🧪 **TESTING IMPROVEMENTS**

### Current Coverage
- ✅ Dashboard: 14 test files
- ❌ Driver App: 0 tests
- ❌ Relay Agent: 0 unit tests
- ❌ AI Agent: 0 tests
- ❌ Backend: 0 tests

### Proposed Test Suite

#### Unit Tests (High Priority)
```
driver_app/
  tests/
    services/
      TelemetryService.test.ts
      DataTransmissionService.test.ts
      DriverIdentificationService.test.ts
      VideoCapture.test.ts

relay_agent/
  tests/
    test_video_encoder.py
    test_telemetry_collector.py
    test_core_agent.py

ai_agent/
  tests/
    test_coaching.js
    test_analysis.js
    test_voice.js
```

#### Integration Tests
```
tests/integration/
  test_full_telemetry_pipeline.py
  test_multi_driver_handoff.py
  test_ai_coaching_flow.py
  test_video_streaming.py
```

#### Performance Tests
```
tests/performance/
  test_concurrent_drivers.py
  test_telemetry_throughput.py
  test_websocket_load.py
  test_memory_leaks.py
```

---

## 📱 **DEPLOYMENT & OPERATIONS**

### 1. **Environment Variable Validation**

**Current**: No validation
**Risk**: Production starts with missing config

**Solution**:
```javascript
// server/src/validate-env.js
const required = [
  'JWT_SECRET',
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

### 2. **Health Check Endpoints**

**Add**:
- `/health` - Basic liveness
- `/health/ready` - Readiness (DB connected, etc.)
- `/health/metrics` - Prometheus metrics

### 3. **Logging Improvements**

**Current**: Basic console.log
**Proposed**: Structured logging with Winston/Pino

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 🎨 **USER EXPERIENCE ENHANCEMENTS**

### 1. **Onboarding Flow**

**Current**: User must configure everything manually
**Proposed**:
- Setup wizard for first-time users
- Auto-detect iRacing installation
- Test connection before starting session
- Pre-configured profiles for common use cases

### 2. **Performance Dashboard**

**Add Real-time Metrics**:
- Current lap delta to best
- Tire temperature gradient visualization
- Fuel consumption rate
- Estimated laps remaining
- Consistency score (live)

### 3. **Team Communication**

**Enhance**:
- Voice chat integration (Discord/TeamSpeak)
- Shared race notes
- Strategy board
- Real-time annotations on telemetry

---

## 📅 **IMPLEMENTATION PRIORITY**

### Phase 1: Security & Stability (Week 1) ⚠️
1. ✅ Remove hardcoded URLs → environment variables
2. ✅ Enforce strong JWT secrets
3. ✅ Implement SQL parameterized queries
4. ✅ Add API rate limiting
5. ✅ Complete GPU monitoring or remove placeholder
6. ✅ Implement dynamic video bitrate adjustment

### Phase 2: Professional Features (Weeks 2-3) ⭐
7. ✅ MoTeC i2 .ld export format
8. ✅ Full CSV export (40+ telemetry fields)
9. ✅ Session report generation
10. ✅ Corner-by-corner analysis
11. ✅ Lap comparison tool
12. ✅ Import telemetry functionality

### Phase 3: User Growth (Weeks 4-5) 🚀
13. ✅ Training system implementation
14. ✅ rFactor 2 support
15. ✅ Onboarding wizard
16. ✅ Comprehensive testing suite
17. ✅ Performance optimizations

### Phase 4: Advanced Features (Weeks 6-8) 🎯
18. ✅ Predictive tire degradation
19. ✅ ML driver style classification
20. ✅ Weather strategy automation
21. ✅ Mobile app (React Native)
22. ✅ Team collaboration enhancements

---

## 💰 **BUSINESS VALUE MATRIX**

| Feature | User Value | Implementation Cost | ROI |
|---------|-----------|-------------------|-----|
| MoTeC Export | ⭐⭐⭐⭐⭐ | Medium | **Very High** |
| Training System | ⭐⭐⭐⭐⭐ | High | **High** |
| Security Fixes | ⭐⭐⭐⭐⭐ | Low | **Critical** |
| Session Reports | ⭐⭐⭐⭐ | Medium | **High** |
| Corner Analysis | ⭐⭐⭐⭐ | Medium | **High** |
| rFactor 2 Support | ⭐⭐⭐⭐ | Medium | **Medium-High** |
| Full CSV Export | ⭐⭐⭐ | Low | **High** |
| Lap Comparison | ⭐⭐⭐⭐ | Medium | **Medium** |
| Import Data | ⭐⭐⭐ | Medium | **Medium** |
| Mobile App | ⭐⭐⭐⭐ | Very High | **Medium** |

---

## 🎓 **COSWORTH-SPECIFIC RECOMMENDATIONS**

Since you asked about Cosworth specifically, here's what we can learn from their approach:

### 1. **Professional Data Standards**
- Implement **standardized channel naming** (like Cosworth's)
- Support **GPS-based track mapping** (for corner detection)
- Add **math channels** (derived calculations like slip angle)

### 2. **Track Database**
- Build **circuit database** with corner positions
- Store **reference lap data** for each track
- Enable **optimal line visualization**

### 3. **Real-time Alerts**
- **Out-of-range warnings** (tire temp, fuel, etc.)
- **Performance threshold alerts** (lap time targets)
- **Pit strategy prompts**

### 4. **Data Presentation**
- **XY plots** (lateral G vs speed)
- **Histogram analysis** (gear usage, brake points)
- **Scatter plots** (consistency visualization)

---

## 🔗 **INTEGRATION EXAMPLES**

### MoTeC Integration Flow
```
iRacing → PitBox → MoTeC Export → i2 Pro Analysis
                   ↓
            AI Coaching Suggestions
```

### Team Workflow
```
Driver → PitBox Capture → Cloud Storage
                          ↓
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
  Race Engineer                        Team Principal
  (MoTeC Analysis)                     (Dashboard View)
        ▼                                   ▼
  Strategy Adjustments ─────► Shared Notes
```

---

## 📚 **RESOURCES & REFERENCES**

### MoTeC i2 Format
- [MoTeC SDK Documentation](https://www.motec.com.au/)
- File format: Binary with header + channels + samples
- Common tools: motec-file-reader (Python library)

### Racing Data Standards
- **ATLAS**: CSV with specific column structure
- **Pi Toolbox**: Proprietary but similar to MoTeC
- **Generic LD**: Logged Data universal format

### Sim Racing APIs
- iRacing: Shared memory API (implemented)
- rFactor 2: rF2SharedMemoryMapPlugin
- Assetto Corsa: UDP packets + shared memory
- F1 Series: UDP telemetry (documented by EA)

---

## ✅ **NEXT ACTIONS**

**Recommended Starting Point**:

1. **Immediate** (Today): Fix security issues (2-3 hours)
2. **This Week**: Implement MoTeC export (2-3 days)
3. **Next Week**: Build Session Reports (3-4 days)
4. **Month 1**: Training System implementation (1-2 weeks)

**Quick Wins** (< 1 day each):
- Full CSV export enhancement
- Environment variable migration
- API rate limiting
- Health check endpoints

---

*This roadmap provides a path from "100% core complete" to "Professional-grade racing telemetry platform"*

**Status**: Ready to implement ⚡
**Priority**: Security fixes → Professional features → Platform expansion
