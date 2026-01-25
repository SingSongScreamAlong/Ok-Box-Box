import { TrackMap } from './TrackMap';

// Re-export as TrackMapRive to maintain compatibility with existing consumers
// but use the new Programmatic SVG implementation
export function TrackMapRive(props: any) {
  return <TrackMap {...props} />;
}

export { TrackMap };
