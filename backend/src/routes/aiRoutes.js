import express from 'express';
import { handleAiChat, handleAiTransform } from '../controllers/aiController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(optionalAuthenticateToken);

router.post('/chat', handleAiChat);
router.post('/transform', handleAiTransform);

export default router;
