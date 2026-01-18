import { Request, Response } from 'express';
import { TrackIntelService } from './track-intel.service.js';

export class TrackIntelController {
    public static async getTrack(req: Request, res: Response): Promise<void> {
        try {
            const { trackId } = req.params;
            const service = TrackIntelService.getInstance();
            const track = await service.getTrack(trackId);

            if (!track) {
                res.status(404).json({ error: 'Track not found' });
                return;
            }

            res.json(track);
        } catch (error) {
            console.error('Error in getTrack:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    public static async getAllTracks(_req: Request, res: Response): Promise<void> {
        try {
            const service = TrackIntelService.getInstance();
            const tracks = await service.getAllTracks();
            res.json(tracks);
        } catch (error) {
            console.error('Error in getAllTracks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
