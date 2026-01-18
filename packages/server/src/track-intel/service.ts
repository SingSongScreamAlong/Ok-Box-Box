import fs from 'fs/promises';
import path from 'path';

// Types (should eventually be shared)
export interface TrackData {
    id: string;
    name: string;
    turns: any[];
    [key: string]: any;
}

export class TrackIntelService {
    private dataDir: string;
    private cache: Map<string, TrackData>;

    constructor() {
        // Adjust path relative to where this service is compiled/run
        // Assuming src/track-intel -> dist/track-intel
        // Data is in src/data/tracks -> dist/data/tracks
        this.dataDir = path.resolve(__dirname, '../../data/tracks');
        this.cache = new Map();
    }

    async getTrackById(id: string): Promise<TrackData | null> {
        if (this.cache.has(id)) {
            return this.cache.get(id)!;
        }

        try {
            const filePath = path.join(this.dataDir, `${id}.json`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            this.cache.set(id, data);
            return data;
        } catch (error) {
            console.error(`[TrackIntel] Failed to load track ${id}:`, error);
            return null;
        }
    }

    async getAllTracks(): Promise<Partial<TrackData>[]> {
        try {
            const files = await fs.readdir(this.dataDir);
            const tracks: Partial<TrackData>[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const id = file.replace('.json', '');
                    const track = await this.getTrackById(id);
                    if (track) {
                        tracks.push({
                            id: track.id,
                            name: track.name,
                            turns_count: track.turns.length
                        });
                    }
                }
            }
            return tracks;
        } catch (error) {
            console.error('[TrackIntel] Failed to list tracks:', error);
            return [];
        }
    }
}

export const trackIntelService = new TrackIntelService();
