import { useState, useEffect } from 'react';

// Define the shape structure matching *.shape.json
export interface TrackShape {
    name: string;
    trackId: string;
    course_id?: number;
    centerline: Array<{
        x: number;
        y: number;
        distPct: number;
    }>;
    bounds: {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
    };
    pitlane?: Array<{ x: number, y: number, distPct: number }>;
}

// Vite glob import for all shape files (both *.shape.json and *.json)
const shapeModules = import.meta.glob('../../../../packages/dashboard/src/data/trackData/*.shape.json', {
    import: 'default',
    eager: false
});

// Also import slug-named track files (like monza-combinedchicanes.json)
const slugModules = import.meta.glob('../../../../packages/dashboard/src/data/trackData/*.json', {
    import: 'default',
    eager: false
});

// Cache for loaded shapes
const shapeCache: Record<string, TrackShape> = {};

// Generate a fallback oval shape when track data is not available
function generateFallbackOval(trackId: string): TrackShape {
    const points: Array<{ x: number; y: number; distPct: number }> = [];
    const numPoints = 100;
    const radiusX = 400;
    const radiusY = 200;
    const centerX = 500;
    const centerY = 300;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        points.push({
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
            distPct: i / numPoints
        });
    }
    
    return {
        name: trackId,
        trackId: trackId,
        centerline: points,
        bounds: {
            xMin: centerX - radiusX - 50,
            xMax: centerX + radiusX + 50,
            yMin: centerY - radiusY - 50,
            yMax: centerY + radiusY + 50
        }
    };
}

export function useTrackData(trackId: string | undefined) {
    const [shape, setShape] = useState<TrackShape | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!trackId) {
            setShape(null);
            setLoading(false);
            setError(null);
            return;
        }

        // Set loading synchronously before the async work starts.
        // This prevents a render cycle where loading=false and shape=null
        // causes components to flash an error state briefly.
        setLoading(true);
        setError(null);

        const loadShape = async () => {
            try {
                // Normalize trackId: "monza combinedchicanes" -> "monza-combinedchicanes"
                const normalizedId = trackId.toLowerCase().replace(/\s+/g, '-');

                // Try to find in shape modules first (numeric IDs like 191.shape.json)
                let moduleKey = Object.keys(shapeModules).find(key => key.includes(`/${trackId}.shape.json`));
                let modules = shapeModules;

                // If not found, try slug modules (like monza-combinedchicanes.json)
                if (!moduleKey) {
                    moduleKey = Object.keys(slugModules).find(key =>
                        key.includes(`/${normalizedId}.json`) && !key.includes('.shape.json')
                    );
                    modules = slugModules;
                }

                // Still not found? Try partial match on slug modules
                if (!moduleKey) {
                    moduleKey = Object.keys(slugModules).find(key => {
                        const filename = key.split('/').pop()?.replace('.json', '') || '';
                        return filename === normalizedId || normalizedId.includes(filename) || filename.includes(normalizedId);
                    });
                    modules = slugModules;
                }

                if (!moduleKey) {
                    console.warn(`[useTrackData] No shape file found for "${trackId}" — using fallback oval`);
                    setShape(generateFallbackOval(trackId));
                    return;
                }

                if (shapeCache[moduleKey]) {
                    setShape(shapeCache[moduleKey]);
                    return;
                }

                const loadFn = modules[moduleKey] as () => Promise<TrackShape>;
                const data = await loadFn();

                shapeCache[moduleKey] = data;
                setShape(data);
            } catch (err) {
                console.error('[useTrackData] Failed to load track shape:', err);
                setError('Failed to load track data');
            } finally {
                setLoading(false);
            }
        };

        loadShape();
    }, [trackId]);

    return { shape, loading, error };
}
