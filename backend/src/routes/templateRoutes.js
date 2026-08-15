import express from 'express';
import {
  getCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  createTemplateFromNote,
} from '../controllers/templateController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas de plantillas personalizadas requieren autenticación
router.use(authenticateToken);

router.get('/', getCustomTemplates);
router.post('/', createCustomTemplate);
router.put('/:id', updateCustomTemplate);
router.delete('/:id', deleteCustomTemplate);
router.post('/from-note/:noteId', createTemplateFromNote);

export default router;
