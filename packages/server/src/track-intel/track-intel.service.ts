import fs from 'fs/promises';
import path from 'path';
const DATA_DIR = path.resolve(__dirname, '../data/tracks');

export interface TrackData {
    id: string;
    name: string;
    config: string;
    length: number;
    lengthUnit: string;
    turns: any[];
    metadata: any;
}

export class TrackIntelService {
    private static instance: TrackIntelService;
    private cache: Map<string, TrackData> = new Map();

    private constructor() { }

    public static getInstance(): TrackIntelService {
        if (!TrackIntelService.instance) {
            TrackIntelService.instance = new TrackIntelService();
        }
        return TrackIntelService.instance;
    }

    public async getTrack(trackId: string): Promise<TrackData | null> {
        if (this.cache.has(trackId)) {
            return this.cache.get(trackId)!;
        }

        try {
            const filePath = path.join(DATA_DIR, `${trackId}.json`);
            const data = await fs.readFile(filePath, 'utf-8');
            const track = JSON.parse(data) as TrackData;

            this.cache.set(trackId, track);
            return track;
        } catch (error) {
            console.error(`Error loading track ${trackId}:`, error);
            return null;
        }
    }

    public async getAllTracks(): Promise<TrackData[]> {
        try {
            const files = await fs.readdir(DATA_DIR);
            const tracks: TrackData[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const trackId = path.basename(file, '.json');
                    const track = await this.getTrack(trackId);
                    if (track) {
                        tracks.push(track);
                    }
                }
            }
            return tracks;
        } catch (error) {
            console.error('Error listing tracks:', error);
            return [];
        }
    }
}
