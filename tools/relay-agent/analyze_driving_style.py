#!/usr/bin/env python3
"""
Driving Style Analyzer - Runs captured telemetry through behavioral analysis
Computes BSI (Braking Smoothness Index), TCI (Throttle Control Index), 
CPI-2 (Cornering Precision Index), and RCI (Rotation Control Index)
"""
import json
import math
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Optional

LOG_DIR = Path("race_logs/20260303_110231")

@dataclass
class TelemetrySample:
    ts: float
    speed_mph: float
    rpm: int
    gear: int
    throttle: float  # 0-100
    brake: float     # 0-100
    steering: float  # -1 to 1
    lap: int
    position: int
    track_pct: float
    
@dataclass 
class LapAnalysis:
    lap_number: int
    lap_time: float
    max_speed: float
    avg_speed: float
    brake_events: int
    hard_brakes: int  # >80%
    smooth_brakes: int
    trail_brake_pct: float
    throttle_events: int
    harsh_throttle: int
    smooth_throttle: int
    steering_corrections: int
    steering_reversals: int
    samples: int

def load_telemetry() -> List[TelemetrySample]:
    """Load player telemetry from all_events"""
    samples = []
    
    with open(LOG_DIR / "all_events.jsonl", 'r', errors='ignore') as f:
        for line in f:
            try:
                event = json.loads(line)
                if event.get('event') != 'telemetry:driver':
                    continue
                    
                data = event.get('data', {})
                cars = data.get('cars', [])
                
                for car in cars:
                    if car.get('isPlayer'):
                        samples.append(TelemetrySample(
                            ts=event.get('ts', 0),
                            speed_mph=car.get('speed', 0) * 2.237,
                            rpm=car.get('rpm', 0),
                            gear=car.get('gear', 0),
                            throttle=car.get('throttle', 0) * 100,
                            brake=car.get('brake', 0) * 100,
                            steering=car.get('steering', 0),
                            lap=car.get('lap', 0),
                            position=car.get('position', 0),
                            track_pct=car.get('pos', {}).get('s', 0),
                        ))
                        break
            except:
                pass
    
    return samples

def compute_bsi(samples: List[TelemetrySample]) -> Dict:
    """
    Braking Smoothness Index (BSI)
    Measures how smoothly the driver applies brakes
    - Penalizes sudden brake applications
    - Rewards trail braking
    - Penalizes ABS activations (hard braking)
    """
    if len(samples) < 10:
        return {'score': 50, 'details': {}}
    
    brake_events = 0
    hard_brakes = 0
    smooth_brakes = 0
    trail_brake_ticks = 0
    total_brake_ticks = 0
    
    last_brake = 0
    in_braking = False
    brake_onset_rate = []
    
    for i, s in enumerate(samples):
        if s.brake > 5:  # Braking
            total_brake_ticks += 1
            
            if not in_braking:
                # Brake onset
                brake_events += 1
                in_braking = True
                onset_rate = s.brake - last_brake
                brake_onset_rate.append(onset_rate)
                
                if onset_rate > 50:  # Sudden application
                    hard_brakes += 1
                elif onset_rate < 20:  # Gradual application
                    smooth_brakes += 1
            
            # Trail braking: brake + steering
            if abs(s.steering) > 0.1 and s.brake > 10:
                trail_brake_ticks += 1
                
            if s.brake > 80:
                hard_brakes += 1
        else:
            in_braking = False
        
        last_brake = s.brake
    
    # Calculate BSI (0-100)
    if brake_events == 0:
        bsi = 50
    else:
        smooth_ratio = smooth_brakes / max(brake_events, 1)
        hard_ratio = hard_brakes / max(brake_events, 1)
        trail_ratio = trail_brake_ticks / max(total_brake_ticks, 1)
        
        # BSI formula: reward smooth, penalize hard, bonus for trail braking
        bsi = 50 + (smooth_ratio * 30) - (hard_ratio * 20) + (trail_ratio * 20)
        bsi = max(0, min(100, bsi))
    
    return {
        'score': round(bsi, 1),
        'brake_events': brake_events,
        'hard_brakes': hard_brakes,
        'smooth_brakes': smooth_brakes,
        'trail_brake_pct': round(trail_brake_ticks / max(total_brake_ticks, 1) * 100, 1),
        'avg_onset_rate': round(sum(brake_onset_rate) / max(len(brake_onset_rate), 1), 1),
    }

def compute_tci(samples: List[TelemetrySample]) -> Dict:
    """
    Throttle Control Index (TCI)
    Measures throttle application smoothness
    - Penalizes harsh throttle applications
    - Rewards progressive throttle
    - Detects wheelspin (throttle + low speed gain)
    """
    if len(samples) < 10:
        return {'score': 50, 'details': {}}
    
    throttle_events = 0
    harsh_throttle = 0
    smooth_throttle = 0
    modulation_ticks = 0
    
    last_throttle = 0
    in_throttle = False
    throttle_onset_rate = []
    
    for i, s in enumerate(samples):
        if s.throttle > 10:  # On throttle
            if not in_throttle:
                # Throttle onset
                throttle_events += 1
                in_throttle = True
                onset_rate = s.throttle - last_throttle
                throttle_onset_rate.append(onset_rate)
                
                if onset_rate > 60:  # Harsh application
                    harsh_throttle += 1
                elif onset_rate < 25:  # Progressive
                    smooth_throttle += 1
            
            # Modulation: throttle changes while on throttle
            if abs(s.throttle - last_throttle) > 5 and abs(s.throttle - last_throttle) < 30:
                modulation_ticks += 1
        else:
            in_throttle = False
        
        last_throttle = s.throttle
    
    # Calculate TCI
    if throttle_events == 0:
        tci = 50
    else:
        smooth_ratio = smooth_throttle / max(throttle_events, 1)
        harsh_ratio = harsh_throttle / max(throttle_events, 1)
        
        tci = 50 + (smooth_ratio * 30) - (harsh_ratio * 25)
        tci = max(0, min(100, tci))
    
    return {
        'score': round(tci, 1),
        'throttle_events': throttle_events,
        'harsh_applications': harsh_throttle,
        'smooth_applications': smooth_throttle,
        'modulation_ticks': modulation_ticks,
        'avg_onset_rate': round(sum(throttle_onset_rate) / max(len(throttle_onset_rate), 1), 1),
    }

def compute_cpi2(samples: List[TelemetrySample]) -> Dict:
    """
    Cornering Precision Index v2 (CPI-2)
    Measures steering precision and consistency
    - Penalizes mid-corner corrections
    - Penalizes steering reversals
    - Rewards smooth, committed steering
    """
    if len(samples) < 10:
        return {'score': 50, 'details': {}}
    
    corrections = 0
    reversals = 0
    turn_ins = 0
    
    last_steer = 0
    last_steer_vel = 0
    in_corner = False
    
    for i, s in enumerate(samples):
        steer_vel = s.steering - last_steer
        
        # Detect turn-in (steering from neutral to committed)
        if abs(last_steer) < 0.1 and abs(s.steering) > 0.2:
            turn_ins += 1
            in_corner = True
        
        # Detect corner exit
        if abs(s.steering) < 0.1:
            in_corner = False
        
        # Mid-corner correction: steering change while already turning
        if in_corner and abs(s.steering) > 0.2:
            if abs(steer_vel) > 0.05:  # Significant steering change
                corrections += 1
        
        # Steering reversal: direction change
        if last_steer_vel != 0 and steer_vel != 0:
            if (last_steer_vel > 0 and steer_vel < -0.02) or (last_steer_vel < 0 and steer_vel > 0.02):
                reversals += 1
        
        last_steer = s.steering
        last_steer_vel = steer_vel
    
    # Calculate CPI-2
    if turn_ins == 0:
        cpi2 = 50
    else:
        correction_ratio = corrections / max(turn_ins * 10, 1)  # Expect ~10 samples per corner
        reversal_ratio = reversals / max(turn_ins, 1)
        
        cpi2 = 70 - (correction_ratio * 30) - (reversal_ratio * 20)
        cpi2 = max(0, min(100, cpi2))
    
    return {
        'score': round(cpi2, 1),
        'turn_ins': turn_ins,
        'mid_corner_corrections': corrections,
        'steering_reversals': reversals,
        'corrections_per_corner': round(corrections / max(turn_ins, 1), 2),
    }

def compute_rci(samples: List[TelemetrySample]) -> Dict:
    """
    Rotation Control Index (RCI)
    Measures car control and stability
    - Based on steering smoothness at speed
    - Detects overcorrections
    """
    if len(samples) < 10:
        return {'score': 50, 'details': {}}
    
    high_speed_corrections = 0
    overcorrections = 0
    stable_ticks = 0
    total_driving_ticks = 0
    
    last_steer = 0
    
    for s in samples:
        if s.speed_mph > 30:  # Only analyze at speed
            total_driving_ticks += 1
            steer_change = abs(s.steering - last_steer)
            
            if steer_change < 0.02:  # Stable steering
                stable_ticks += 1
            elif steer_change > 0.1:  # Significant correction
                high_speed_corrections += 1
                if steer_change > 0.2:  # Overcorrection
                    overcorrections += 1
        
        last_steer = s.steering
    
    # Calculate RCI
    if total_driving_ticks == 0:
        rci = 50
    else:
        stability_ratio = stable_ticks / total_driving_ticks
        correction_ratio = high_speed_corrections / total_driving_ticks
        
        rci = 40 + (stability_ratio * 50) - (correction_ratio * 30) - (overcorrections * 2)
        rci = max(0, min(100, rci))
    
    return {
        'score': round(rci, 1),
        'stable_ticks_pct': round(stability_ratio * 100, 1) if total_driving_ticks > 0 else 0,
        'high_speed_corrections': high_speed_corrections,
        'overcorrections': overcorrections,
    }

def generate_coaching(bsi: Dict, tci: Dict, cpi2: Dict, rci: Dict, samples: List[TelemetrySample]) -> List[str]:
    """Generate coaching feedback based on indices"""
    coaching = []
    
    # BSI feedback
    if bsi['score'] < 40:
        coaching.append("🔴 BRAKING: You're braking too aggressively. Try to squeeze the brake pedal progressively rather than stabbing it.")
    elif bsi['score'] < 60:
        coaching.append("🟡 BRAKING: Your brake application could be smoother. Focus on gradual pressure buildup.")
    else:
        coaching.append("🟢 BRAKING: Good brake modulation! Your trail braking is helping rotation.")
    
    if bsi.get('trail_brake_pct', 0) < 20:
        coaching.append("💡 TIP: Try more trail braking - keep light brake pressure while turning in to help the car rotate.")
    
    # TCI feedback
    if tci['score'] < 40:
        coaching.append("🔴 THROTTLE: You're getting on the power too aggressively. This can cause wheelspin and oversteer.")
    elif tci['score'] < 60:
        coaching.append("🟡 THROTTLE: Work on progressive throttle application on corner exit.")
    else:
        coaching.append("🟢 THROTTLE: Good throttle control! You're feeding in power smoothly.")
    
    # CPI-2 feedback
    if cpi2['score'] < 40:
        coaching.append("🔴 STEERING: Too many mid-corner corrections. Try to commit to your steering input and hold it.")
    elif cpi2['score'] < 60:
        coaching.append("🟡 STEERING: Some steering corrections detected. Focus on looking further ahead and planning your line.")
    else:
        coaching.append("🟢 STEERING: Clean steering inputs! You're committing well to your lines.")
    
    if cpi2.get('corrections_per_corner', 0) > 3:
        coaching.append("💡 TIP: You're making {:.1f} corrections per corner. Try to 'set and forget' your steering angle.".format(cpi2['corrections_per_corner']))
    
    # RCI feedback
    if rci['score'] < 40:
        coaching.append("🔴 CAR CONTROL: The car seems unstable. You may be overdriving or the setup needs adjustment.")
    elif rci['score'] < 60:
        coaching.append("🟡 CAR CONTROL: Some instability detected. Focus on smooth inputs to keep the car balanced.")
    else:
        coaching.append("🟢 CAR CONTROL: Good car control! The car looks stable under your inputs.")
    
    return coaching

def analyze_session():
    """Main analysis function"""
    print("Loading telemetry data...")
    samples = load_telemetry()
    
    # Filter to driving samples
    driving_samples = [s for s in samples if s.speed_mph > 10]
    
    print(f"Loaded {len(samples)} total samples")
    print(f"Driving samples (speed > 10 mph): {len(driving_samples)}")
    
    if len(driving_samples) < 100:
        print("Not enough driving data for analysis!")
        return
    
    print("\nComputing behavioral indices...")
    
    bsi = compute_bsi(driving_samples)
    tci = compute_tci(driving_samples)
    cpi2 = compute_cpi2(driving_samples)
    rci = compute_rci(driving_samples)
    
    # Overall score (weighted average)
    overall = (bsi['score'] * 0.25 + tci['score'] * 0.25 + cpi2['score'] * 0.25 + rci['score'] * 0.25)
    
    print("\n" + "="*60)
    print("🏎️  DRIVING STYLE ANALYSIS - Conrad Weeden")
    print("    Auto Club Speedway | Toyota Tundra TRD Pro")
    print("="*60)
    
    print(f"\n📊 OVERALL SCORE: {overall:.0f}/100")
    
    # Grade
    if overall >= 80:
        grade = "A - Excellent"
    elif overall >= 70:
        grade = "B - Good"
    elif overall >= 60:
        grade = "C - Average"
    elif overall >= 50:
        grade = "D - Needs Work"
    else:
        grade = "F - Struggling"
    print(f"   Grade: {grade}")
    
    print("\n" + "-"*60)
    print("BEHAVIORAL INDICES")
    print("-"*60)
    
    print(f"\n🛑 Braking Smoothness Index (BSI): {bsi['score']}/100")
    print(f"   Brake events: {bsi['brake_events']}")
    print(f"   Hard brakes (>80%): {bsi['hard_brakes']}")
    print(f"   Smooth applications: {bsi['smooth_brakes']}")
    print(f"   Trail braking: {bsi['trail_brake_pct']}% of braking zones")
    
    print(f"\n⚡ Throttle Control Index (TCI): {tci['score']}/100")
    print(f"   Throttle events: {tci['throttle_events']}")
    print(f"   Harsh applications: {tci['harsh_applications']}")
    print(f"   Smooth applications: {tci['smooth_applications']}")
    
    print(f"\n🎯 Cornering Precision Index (CPI-2): {cpi2['score']}/100")
    print(f"   Turn-ins: {cpi2['turn_ins']}")
    print(f"   Mid-corner corrections: {cpi2['mid_corner_corrections']}")
    print(f"   Steering reversals: {cpi2['steering_reversals']}")
    print(f"   Corrections per corner: {cpi2['corrections_per_corner']}")
    
    print(f"\n🔄 Rotation Control Index (RCI): {rci['score']}/100")
    print(f"   Stability: {rci['stable_ticks_pct']}% of driving time")
    print(f"   High-speed corrections: {rci['high_speed_corrections']}")
    print(f"   Overcorrections: {rci['overcorrections']}")
    
    print("\n" + "-"*60)
    print("🎓 COACHING FEEDBACK")
    print("-"*60)
    
    coaching = generate_coaching(bsi, tci, cpi2, rci, driving_samples)
    for tip in coaching:
        print(f"\n{tip}")
    
    print("\n" + "="*60)
    
    # Save report
    report_file = LOG_DIR / "DRIVING_ANALYSIS.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"# 🏎️ Driving Style Analysis\n\n")
        f.write(f"**Driver:** Conrad Weeden\n")
        f.write(f"**Track:** Auto Club Speedway\n")
        f.write(f"**Car:** Toyota Tundra TRD Pro\n\n")
        f.write(f"## Overall Score: {overall:.0f}/100 ({grade})\n\n")
        f.write(f"## Behavioral Indices\n\n")
        f.write(f"| Index | Score | Rating |\n")
        f.write(f"|-------|-------|--------|\n")
        f.write(f"| Braking Smoothness (BSI) | {bsi['score']}/100 | {'🟢' if bsi['score'] >= 60 else '🟡' if bsi['score'] >= 40 else '🔴'} |\n")
        f.write(f"| Throttle Control (TCI) | {tci['score']}/100 | {'🟢' if tci['score'] >= 60 else '🟡' if tci['score'] >= 40 else '🔴'} |\n")
        f.write(f"| Cornering Precision (CPI-2) | {cpi2['score']}/100 | {'🟢' if cpi2['score'] >= 60 else '🟡' if cpi2['score'] >= 40 else '🔴'} |\n")
        f.write(f"| Rotation Control (RCI) | {rci['score']}/100 | {'🟢' if rci['score'] >= 60 else '🟡' if rci['score'] >= 40 else '🔴'} |\n\n")
        f.write(f"## Coaching Feedback\n\n")
        for tip in coaching:
            f.write(f"{tip}\n\n")
    
    print(f"\n✅ Analysis saved to: {report_file}")

if __name__ == "__main__":
    analyze_session()
