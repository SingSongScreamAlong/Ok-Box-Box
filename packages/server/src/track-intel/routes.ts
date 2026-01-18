import { Router } from 'express';
import { TrackIntelController } from './track-intel.controller.js';

const router = Router();

router.get('/', TrackIntelController.getAllTracks);
router.get('/:trackId', TrackIntelController.getTrack);

export default router;
