import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  updateAvatar,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/password', changePassword);
router.post('/profile/avatar', upload.single('file'), updateAvatar);

export default router;
