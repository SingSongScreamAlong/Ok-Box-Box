import { TrackMapPro } from './TrackMapPro'; // The new Ultimate system

// Upgrading the legacy wrapper to use the new PRO system
export function TrackMapRive(props: any) {
  // Pass through all props, TrackMapPro's interface is compatible
  return <TrackMapPro {...props} />;
}

// Also export as TrackMap for cleaner imports
export { TrackMapPro as TrackMap };
