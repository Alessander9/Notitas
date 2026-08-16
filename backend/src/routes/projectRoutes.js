import express from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectCover,
  deleteProjectCover,
  getInviteToken,
  joinProject,
  changeMemberRole,
  removeMember,
} from '../controllers/projectController.js';
import { getNotesByProject, createNote } from '../controllers/noteController.js';
import { authenticateToken } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/cover', imageUpload.single('file'), uploadProjectCover);
router.delete('/:id/cover', deleteProjectCover);
router.post('/:id/invite-token', getInviteToken);
router.post('/join/:token', joinProject);
router.put('/:id/members/:userId', changeMemberRole);
router.delete('/:id/members/:userId', removeMember);

// Notas anidadas en el proyecto
router.get('/:projectId/notes', getNotesByProject);
router.post('/:projectId/notes', (req, res, next) => {
  req.body.projectId = req.params.projectId;
  return createNote(req, res, next);
});

export default router;
