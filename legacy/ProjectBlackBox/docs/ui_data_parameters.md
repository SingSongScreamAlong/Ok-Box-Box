
# ProjectPitBox: UI Data Parameters and Visualization Points

This document provides a comprehensive list of all parameters and data points collected and displayed in the ProjectPitBox system. Use this as a reference for UI prototyping and development.

## Table of Contents
1. [Telemetry Data](#telemetry-data)
2. [Driver Analysis Data](#driver-analysis-data)
3. [Strategy Engine Data](#strategy-engine-data)
4. [Actionable Coaching Data](#actionable-coaching-data)
5. [Learning Insights Data](#learning-insights-data)
6. [Track Analysis Data](#track-analysis-data)
7. [Race Context Data](#race-context-data)
8. [Visualization Components](#visualization-components)

## Telemetry Data

### Core Telemetry Parameters
| Parameter | Type | Description | Units |
|-----------|------|-------------|-------|
| Speed | float | Current vehicle speed | km/h |
| RPM | float | Engine RPM | RPM |
| Gear | int | Current gear | - |
| Throttle | float | Throttle position | 0.0-1.0 |
| Brake | float | Brake pressure | 0.0-1.0 |
| Clutch | float | Clutch position | 0.0-1.0 |
| Steering | float | Steering wheel position | -1.0 to 1.0 |
| FuelLevel | float | Current fuel level | Liters |
| FuelUsePerHour | float | Fuel consumption rate | L/hour |
| LapTime | float | Current lap time | seconds |
| LapDist | float | Distance around track | meters |
| TrackTemp | float | Track temperature | °C |
| AirTemp | float | Air temperature | °C |
| SessionTime | float | Time elapsed in session | seconds |
| SessionLapsRemaining | int | Laps remaining in session | - |
| SessionTimeRemaining | float | Time remaining in session | seconds |

### Tire Data
| Parameter | Type | Description | Units |
|-----------|------|-------------|-------|
| TireTempLeft_FL | float | Front left tire left temperature | °C |
| TireTempCenter_FL | float | Front left tire center temperature | °C |
| TireTempRight_FL | float | Front left tire right temperature | °C |
| TireTempLeft_FR | float | Front right tire left temperature | °C |
| TireTempCenter_FR | float | Front right tire center temperature | °C |
| TireTempRight_FR | float | Front right tire right temperature | °C |
| TireTempLeft_RL | float | Rear left tire left temperature | °C |
| TireTempCenter_RL | float | Rear left tire center temperature | °C |
| TireTempRight_RL | float | Rear left tire right temperature | °C |
| TireTempLeft_RR | float | Rear right tire left temperature | °C |
| TireTempCenter_RR | float | Rear right tire center temperature | °C |
| TireTempRight_RR | float | Rear right tire right temperature | °C |
| TirePressure_FL | float | Front left tire pressure | kPa |
| TirePressure_FR | float | Front right tire pressure | kPa |
| TirePressure_RL | float | Rear left tire pressure | kPa |
| TirePressure_RR | float | Rear right tire pressure | kPa |
| TireWear_FL | float | Front left tire wear | 0.0-1.0 |
| TireWear_FR | float | Front right tire wear | 0.0-1.0 |
| TireWear_RL | float | Rear left tire wear | 0.0-1.0 |
| TireWear_RR | float | Rear right tire wear | 0.0-1.0 |

### Position and Timing Data
| Parameter | Type | Description | Units |
|-----------|------|-------------|-------|
| Position | int | Current race position | - |
| LapNumber | int | Current lap number | - |
| LastLapTime | float | Last lap time | seconds |
| BestLapTime | float | Best lap time | seconds |
| Sector1Time | float | Sector 1 time | seconds |
| Sector2Time | float | Sector 2 time | seconds |
| Sector3Time | float | Sector 3 time | seconds |
| BestSector1Time | float | Best sector 1 time | seconds |
| BestSector2Time | float | Best sector 2 time | seconds |
| BestSector3Time | float | Best sector 3 time | seconds |
| Delta | float | Delta to optimal lap | seconds |
| GapAhead | float | Gap to car ahead | seconds |
| GapBehind | float | Gap to car behind | seconds |

## Driver Analysis Data

### Driver Metrics
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| CornerConsistency | float | Consistency in corner execution | 0.0-1.0 |
| BrakingConsistency | float | Consistency in braking points | 0.0-1.0 |
| ThrottleApplication | float | Throttle application quality | 0.0-1.0 |
| RacingLineAdherence | float | Adherence to racing line | 0.0-1.0 |
| OverallConsistency | float | Overall driving consistency | 0.0-1.0 |
| CornerEntrySpeed | float | Corner entry speed vs optimal | % |
| CornerExitSpeed | float | Corner exit speed vs optimal | % |
| BrakingEfficiency | float | Braking efficiency | 0.0-1.0 |
| ThrottleEfficiency | float | Throttle efficiency | 0.0-1.0 |
| FuelEfficiency | float | Fuel usage efficiency | 0.0-1.0 |
| TireManagement | float | Tire management skill | 0.0-1.0 |

### Driver Classification
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| AggressionLevel | float | Driver aggression level | 0.0-1.0 |
| ConsistencyLevel | float | Driver consistency level | 0.0-1.0 |
| AdaptabilityLevel | float | Driver adaptability level | 0.0-1.0 |
| DefensiveSkill | float | Defensive driving skill | 0.0-1.0 |
| OffensiveSkill | float | Offensive driving skill | 0.0-1.0 |
| WetWeatherSkill | float | Wet weather driving skill | 0.0-1.0 |
| TireManagementSkill | float | Tire management skill | 0.0-1.0 |
| FuelManagementSkill | float | Fuel management skill | 0.0-1.0 |
| DriverStyle | string | Driver style classification | "Aggressive", "Conservative", "Balanced", etc. |

### Driver Comparison
| Parameter | Type | Description | Units |
|-----------|------|-------------|-------|
| TimeDelta | float | Time delta to comparison driver | seconds |
| SpeedDelta | float | Speed delta to comparison driver | km/h |
| BrakingPointDelta | float | Braking point delta | meters |
| ThrottleApplicationDelta | float | Throttle application delta | % |
| RacingLineDelta | float | Racing line delta | meters |
| SectorTimeDelta | float | Sector time delta | seconds |
| CornerSpeedDelta | float | Corner speed delta | km/h |

## Strategy Engine Data

### Race Strategy
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| PitWindowStart | int | Start of pit window | lap number |
| PitWindowEnd | int | End of pit window | lap number |
| RecommendedPitLap | int | Recommended pit lap | lap number |
| FuelStrategy | string | Fuel strategy | "standard", "conservative", "aggressive" |
| TireStrategy | string | Tire strategy | "standard", "conservative", "aggressive" |
| PaceRecommendation | string | Pace recommendation | "standard", "push", "conserve" |
| FocusAreas | list | Areas to focus on | list of strings |
| RacePosition | int | Current race position | position |
| PositionDelta | int | Position change | +/- positions |
| EstimatedFinish | int | Estimated finish position | position |

### Pit Strategy
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| OptimalPitLap | int | Optimal lap for pit stop | lap number |
| PitWindowOpen | bool | Is pit window open | true/false |
| FuelToAdd | float | Recommended fuel to add | liters |
| TireCompound | string | Recommended tire compound | compound name |
| EstimatedPitTime | float | Estimated pit stop time | seconds |
| UndercutPotential | float | Potential time gain from undercut | seconds |
| OvercutPotential | float | Potential time gain from overcut | seconds |
| TireLifeRemaining | float | Remaining tire life | % |
| FuelRemaining | float | Remaining fuel | liters |
| LapsUntilEmpty | float | Laps until fuel empty | laps |

## Actionable Coaching Data

### Coaching Recommendations
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| Type | string | Type of recommendation | "braking", "throttle", "racing_line", etc. |
| Location | string | Track location | corner name/number |
| Issue | string | Description of issue | text |
| Recommendation | string | Coaching recommendation | text |
| Impact | float | Potential time gain | seconds |
| Confidence | float | Confidence in recommendation | 0.0-1.0 |
| Priority | string | Priority level | "high", "medium", "low" |
| TelemetryData | dict | Associated telemetry data | dict of telemetry values |

### Coaching Summary
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| TimePotential | float | Potential time gain | seconds |
| TopIssues | list | List of top issues | list of strings |
| ImprovementAreas | dict | Areas with improvement potential | dict of area:potential pairs |
| RecommendationCount | int | Number of recommendations | count |
| PriorityDistribution | dict | Distribution of priorities | dict of priority:count pairs |

## Learning Insights Data

### Learning Insights
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| LearningVelocity | float | Rate of improvement | seconds/session |
| ImprovementTrend | string | Trend in improvement | "improving", "stable", "declining" |
| FocusAreas | list | Areas to focus on | list of strings |
| RecommendationEffectiveness | dict | Effectiveness of recommendations | dict of type:effectiveness pairs |
| SessionsAnalyzed | int | Number of sessions analyzed | count |
| TotalImprovementTime | float | Total time improved | seconds |

### Learning Goals
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| GoalType | string | Type of learning goal | "braking", "exit_speed", "racing_line", "consistency" |
| Target | float | Target improvement | seconds or % |
| Current | float | Current improvement | seconds or % |
| Progress | float | Progress towards goal | 0.0-1.0 |

### Session Data
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| SessionDate | datetime | Date and time of session | datetime |
| LapsCompleted | int | Number of laps completed | count |
| Improvement | float | Time improvement | seconds |
| RecommendationsApplied | int | Recommendations applied | count |
| FocusAreas | list | Areas focused on | list of strings |
| LearningInsights | dict | Insights from session | dict of insights |

## Track Analysis Data

### Track Map
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| TrackName | string | Name of track | text |
| TrackLength | float | Length of track | meters |
| Corners | list | List of corners | list of corner objects |
| Sectors | list | List of sectors | list of sector objects |
| OptimalLapData | dict | Optimal lap telemetry | dict of telemetry values |
| TrackMap | object | Visual track map | image/vector data |

### Corner Data
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| CornerNumber | int | Corner number | number |
| CornerName | string | Corner name | text |
| EntryPoint | float | Entry point on track | meters from start |
| ApexPoint | float | Apex point on track | meters from start |
| ExitPoint | float | Exit point on track | meters from start |
| OptimalEntrySpeed | float | Optimal entry speed | km/h |
| OptimalApexSpeed | float | Optimal apex speed | km/h |
| OptimalExitSpeed | float | Optimal exit speed | km/h |
| CornerType | string | Type of corner | "slow", "medium", "fast", "hairpin", etc. |
| CornerRadius | float | Radius of corner | meters |
| BrakingZoneLength | float | Length of braking zone | meters |
| CornerDifficulty | float | Difficulty rating | 0.0-1.0 |

### Sector Data
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| SectorNumber | int | Sector number | number |
| StartPoint | float | Start point on track | meters from start |
| EndPoint | float | End point on track | meters from start |
| Length | float | Length of sector | meters |
| Corners | list | Corners in sector | list of corner numbers |
| OptimalSectorTime | float | Optimal sector time | seconds |
| SectorCharacteristic | string | Characteristic of sector | "technical", "high-speed", "mixed", etc. |

## Race Context Data

### Race Information
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| SessionType | string | Type of session | "practice", "qualifying", "race" |
| TrackName | string | Name of track | text |
| TrackState | string | State of track | "green", "rubbered", "wet", etc. |
| AmbientTemp | float | Ambient temperature | °C |
| TrackTemp | float | Track temperature | °C |
| WindSpeed | float | Wind speed | km/h |
| WindDirection | float | Wind direction | degrees |
| WeatherCondition | string | Weather condition | "clear", "cloudy", "rain", etc. |
| SessionLapsTotal | int | Total laps in session | count |
| SessionTimeTotal | float | Total time in session | seconds |

### Competitor Data
| Parameter | Type | Description | Units/Range |
|-----------|------|-------------|-------------|
| Position | int | Race position | position |
| DriverName | string | Driver name | text |
| CarNumber | int | Car number | number |
| TeamName | string | Team name | text |
| BestLapTime | float | Best lap time | seconds |
| LastLapTime | float | Last lap time | seconds |
| Gap | float | Gap to leader | seconds |
| Interval | float | Interval to car ahead | seconds |
| LapsBehind | int | Laps behind leader | count |
| InPit | bool | In pit | true/false |
| PitCount | int | Number of pit stops | count |
| TireCompound | string | Current tire compound | compound name |
| TireAge | int | Age of tires | laps |

## Visualization Components

### Dashboard Components
| Component | Description | Data Points Displayed |
|-----------|-------------|----------------------|
| TelemetryDisplay | Real-time telemetry visualization | Speed, RPM, Gear, Throttle, Brake, etc. |
| TrackMap | Interactive track map | Position, Sector times, Corner performance |
| LapTimeChart | Lap time progression chart | Lap times, Best lap, Optimal lap |
| TireWearDisplay | Tire wear visualization | Tire temperatures, pressures, wear |
| FuelCalculator | Fuel usage calculator | Fuel level, consumption rate, estimated laps |
| PositionTracker | Race position tracker | Position, gaps, intervals |
| StrategyPlanner | Strategy planning tool | Pit windows, tire strategies, fuel strategies |
| WeatherMonitor | Weather monitoring | Temperature, wind, precipitation probability |
| DriverComparisonTool | Driver comparison visualization | Time deltas, speed differences, line differences |
| SessionSummary | Session summary dashboard | Key metrics, improvements, focus areas |

### Visualization Types
| Type | Description | Typical Usage |
|------|-------------|---------------|
| LineChart | Line chart for time series data | Lap times, sector times, speed traces |
| BarChart | Bar chart for comparative data | Sector comparisons, corner speed comparisons |
| GaugeChart | Gauge for real-time values | Speed, RPM, fuel level |
| HeatMap | Heat map for spatial data | Tire temperatures, track usage |
| ScatterPlot | Scatter plot for correlation analysis | Speed vs. throttle, brake vs. steering |
| RadarChart | Radar chart for multi-dimensional data | Driver skills, performance metrics |
| TableView | Tabular data display | Session results, competitor information |
| ProgressBar | Progress bar for completion metrics | Tire wear, fuel level, session progress |
| SpeedTrace | Speed trace visualization | Speed vs. distance around track |
| ColorGradient | Color gradient for range values | Performance indicators (red to green) |

### UI Themes and Styling
| Element | Description | Options |
|---------|-------------|---------|
| ColorScheme | Color scheme for UI | Dark theme (default), Light theme, Custom themes |
| FontFamily | Font family for text | Sans-serif (default), Monospace for technical data |
| ChartColors | Colors for chart elements | Performance-based (red/yellow/green), Team colors |
| AlertLevels | Visual indicators for alerts | Critical (red), Warning (yellow), Info (blue), Success (green) |
| LayoutOptions | Layout customization | Fixed, Flexible, Grid-based, User-configurable |
| DataDensity | Density of displayed information | High (expert), Medium (standard), Low (simplified) |
| AnimationStyle | Style of UI animations | Smooth transitions, Instant updates, Minimal animation |
| InteractionModel | User interaction model | Click-based, Drag-and-drop, Touch-optimized |

This document provides a comprehensive overview of the data parameters and visualization components in the ProjectPitBox system. Use this as a reference for UI prototyping and development to ensure all necessary data points are properly represented in the user interface.
