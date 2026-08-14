import express from 'express';
import {
  getNotesByProject,
  getFavorites,
  getArchived,
  getTrash,
  searchNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  deleteNotePermanent,
  restoreNote,
  toggleFavorite,
  archiveNote,
  uploadNoteCover,
  addAttachment,
  deleteAttachment,
  getVersions,
  restoreVersion,
  getPublicSharedNote,
} from '../controllers/noteController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Ruta pública sin autenticación
router.get('/public/shared/:token', getPublicSharedNote);

// Rutas protegidas
router.use(authenticateToken);

router.get('/favorites', getFavorites);
router.get('/archived', getArchived);
router.get('/trash', getTrash);
router.get('/search', searchNotes);
router.get('/project/:projectId', getNotesByProject);

router.post('/', createNote);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.delete('/:id/permanent', deleteNotePermanent);
router.post('/:id/restore', restoreNote);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/archive', archiveNote);

router.post('/:id/cover', upload.single('file'), uploadNoteCover);
router.post('/:id/attachments', upload.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

router.get('/:id/versions', getVersions);
router.post('/:id/versions/:versionId/restore', restoreVersion);

export default router;
