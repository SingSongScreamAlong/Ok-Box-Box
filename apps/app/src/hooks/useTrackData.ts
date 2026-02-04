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
            return;
        }

        // Try to find the matching module (file)
        // The keys are relative paths like "../../../../packages/dashboard/src/data/trackData/191.shape.json"
        // We need to map trackId (which might be a slug or ID) to the file.
        // Assuming we might need to search by content or have a mapping.
        // For now, let's assume we load by ID if possible, but the files are named by ID (e.g. 191.shape.json).
        // The `tracks.ts` lookup logic might be needed here too.

        // HOWEVER, the file names are integers (iRacing Track IDs) like 191.shape.json.
        // The `trackId` passed prop is usually a slug like 'daytona-road'.
        // We need a way to map slug -> ID.
        // Let's import the TRACK_DATA from tracks.ts which might have the ID, or we fetch loosely.

        const loadShape = async () => {
            setLoading(true);
            setError(null);

            try {
                // Strategy: 
                // 1. Check if we have a direct ID match (if trackId passed is "191")
                // 2. Iterate all loaded shapes? No, that's too heavy.
                // 3. We rely on the mapping in tracks.ts or we need to scan the files.
                // Since we can't scan without loading ensuring, let's try to map generic slugs to known IDs or load all and find match (expensive).

                // BETTER: We will export a map of slug->ID in tracks.ts or here.
                // For now, let's try to find if any key contains the ID.

                // Temporary: Just load ALL keys, find the one that matches.
                // Actually, we can loop through the keys (strings) and regex match.

                // But first, let's see if we can find the module.
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
                    console.warn(`[useTrackData] Could not find shape file for ${trackId} (normalized: ${normalizedId}), using fallback oval`);
                    // Generate a fallback oval shape
                    const fallbackShape: TrackShape = generateFallbackOval(trackId);
                    setShape(fallbackShape);
                    setLoading(false);
                    return;
                }

                if (shapeCache[moduleKey]) {
                    setShape(shapeCache[moduleKey]);
                    setLoading(false);
                    return;
                }

                const loadFn = modules[moduleKey] as () => Promise<TrackShape>;
                const data = await loadFn();

                shapeCache[moduleKey] = data;
                setShape(data);
            } catch (err) {
                console.error('Failed to load track shape:', err);
                setError('Failed to load track data');
            } finally {
                setLoading(false);
            }
        };

        loadShape();
    }, [trackId]);

    return { shape, loading, error };
}
