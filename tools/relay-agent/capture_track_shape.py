#!/usr/bin/env python3
"""
Capture Track Shape from iRacing
Collects centerline data as you drive around the track
"""
import pyirsdk
import json
import time
from pathlib import Path

def main():
    ir = pyirsdk.IRSDK()
    if not ir.startup():
        print('iRacing not running')
        return
    
    track_name = ir['WeekendInfo']['TrackDisplayName']
    track_id = ir['WeekendInfo']['TrackID']
    config = ir['WeekendInfo']['TrackConfigName'] or ''
    print(f'Track: {track_name} (ID: {track_id})')
    print(f'Config: {config}')
    
    centerline = []
    seen_pcts = set()
    
    print('Collecting track centerline from car positions...')
    print('Drive around the track or wait for cars to complete laps')
    print('Press Ctrl+C when done')
    
    try:
        while True:
            ir.freeze_var_buffer_latest()
            
            pct = ir['LapDistPct']
            lat = ir['Lat']
            lon = ir['Lon']
            alt = ir['Alt']
            
            if pct is not None and pct >= 0 and lat is not None:
                pct_key = round(pct * 1000)
                if pct_key not in seen_pcts:
                    seen_pcts.add(pct_key)
                    centerline.append({
                        'distPct': pct,
                        'lat': lat,
                        'lon': lon,
                        'alt': alt if alt else 0
                    })
                    coverage = len(seen_pcts) / 10
                    print(f'  Points: {len(seen_pcts)} | Coverage: {coverage:.0f}%', end='\r')
            
            time.sleep(0.02)
    except KeyboardInterrupt:
        pass
    
    print(f'\nCaptured {len(centerline)} unique track positions')
    
    if len(centerline) < 50:
        print('Not enough points. Drive more of the track.')
        ir.shutdown()
        return
    
    # Sort by distance percentage
    centerline.sort(key=lambda p: p['distPct'])
    
    # Convert lat/lon to X/Y
    origin_lat = centerline[0]['lat']
    origin_lon = centerline[0]['lon']
    
    import math
    meters_per_deg_lat = 111320
    meters_per_deg_lon = 111320 * math.cos(math.radians(origin_lat))
    
    shape_points = []
    for p in centerline:
        x = (p['lon'] - origin_lon) * meters_per_deg_lon
        y = (p['lat'] - origin_lat) * meters_per_deg_lat
        shape_points.append({
            'x': round(x, 2),
            'y': round(y, 2),
            'distPct': p['distPct']
        })
    
    xs = [p['x'] for p in shape_points]
    ys = [p['y'] for p in shape_points]
    
    shape = {
        'name': track_name,
        'trackId': str(track_id),
        'config': config,
        'centerline': shape_points,
        'bounds': {
            'xMin': min(xs),
            'xMax': max(xs),
            'yMin': min(ys),
            'yMax': max(ys)
        }
    }
    
    output_dir = Path('track_shapes')
    output_dir.mkdir(exist_ok=True)
    slug = track_name.lower().replace(' ', '-').replace('/', '-')
    output_file = output_dir / f'{slug}.shape.json'
    
    with open(output_file, 'w') as f:
        json.dump(shape, f, indent=2)
    
    print(f'Saved: {output_file}')
    print(f'Points: {len(shape_points)}')
    
    ir.shutdown()

if __name__ == '__main__':
    main()
