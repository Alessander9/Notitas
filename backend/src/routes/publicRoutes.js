import express from 'express';
import { ping, health } from '../controllers/healthController.js';

const router = express.Router();

// Liveness y ping admiten GET y HEAD
router.all('/ping', ping);
router.all('/health', health);

export default router;
