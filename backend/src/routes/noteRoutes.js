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
  deleteCoverImage,
  uploadInlineImage,
  addAttachment,
  deleteAttachment,
  updateAttachmentTag,
  generateShareToken,
  revokeShareToken,
  getVersions,
  restoreVersion,
  duplicateNote,
  getPublicSharedNote,
  joinNote,
  getNoteMembers,
  updateNoteMemberRole,
  removeNoteMember,
  restoreAllTrashNotes,
  emptyTrash,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  setNotePin,
  verifyNotePin,
  removeNotePin,
} from '../controllers/noteController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, imageUpload } from '../middleware/upload.js';

const router = express.Router();

// Ruta pública sin autenticación
router.get('/public/shared/:token', getPublicSharedNote);

// Rutas protegidas
router.use(authenticateToken);

// Colaboración mediante enlace
router.post('/join/:token', joinNote);

// Rutas de papelera en bloque (antes de /:id para evitar conflicto de parámetros)
router.post('/deleted/restore-all', restoreAllTrashNotes);
router.post('/trash/restore-all', restoreAllTrashNotes);
router.delete('/deleted', emptyTrash);
router.delete('/trash', emptyTrash);

router.get('/favorites', getFavorites);
router.get('/archived', getArchived);
router.get('/trash', getTrash);
router.get('/deleted', getTrash);
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
router.post('/:id/duplicate', duplicateNote);

router.post('/:id/cover', imageUpload.single('file'), uploadNoteCover);
router.delete('/:id/cover', deleteCoverImage);
router.post('/:id/images', imageUpload.single('file'), uploadInlineImage);
router.post('/:id/attachment', upload.single('file'), addAttachment);
router.post('/:id/attachments', upload.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);
router.put('/:id/attachments/:attachmentId/tag', updateAttachmentTag);
router.post('/:id/share-token', generateShareToken);
router.delete('/:id/share-token', revokeShareToken);

// Gestión de miembros colaboradores de la nota
router.get('/:id/members', getNoteMembers);
router.put('/:id/members/:userId', updateNoteMemberRole);
router.delete('/:id/members/:userId', removeNoteMember);

router.get('/:id/versions', getVersions);
router.post('/:id/versions/:versionId/restore', restoreVersion);

// Comentarios
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);
router.put('/:id/comments/:commentId', updateComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Bloqueo y protección con PIN
router.post('/:id/pin', setNotePin);
router.post('/:id/verify-pin', verifyNotePin);
router.delete('/:id/pin', removeNotePin);

export default router;
