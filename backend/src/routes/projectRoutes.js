import express from 'express';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectCover,
  getInviteToken,
  joinProject,
  changeMemberRole,
  removeMember,
} from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/cover', upload.single('file'), uploadProjectCover);
router.post('/:id/invite-token', getInviteToken);
router.post('/join/:token', joinProject);
router.put('/:id/members/:userId', changeMemberRole);
router.delete('/:id/members/:userId', removeMember);

export default router;
