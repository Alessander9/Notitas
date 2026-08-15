import express from 'express';
import { ping, health } from '../controllers/healthController.js';
import { getPublicSharedNote } from '../controllers/noteController.js';

const router = express.Router();

// Liveness y ping admiten GET y HEAD
router.all('/ping', ping);
router.all('/health', health);

// Nota compartida pública (lectura sin autenticación)
router.get('/notes/shared/:token', getPublicSharedNote);

export default router;
