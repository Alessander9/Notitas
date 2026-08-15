import express from 'express';
import { handleAiChat, handleAiTransform } from '../controllers/aiController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas de IA requieren autenticación de usuario
router.use(authenticateToken);

router.post('/chat', handleAiChat);
router.post('/transform', handleAiTransform);

export default router;
