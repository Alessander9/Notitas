import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

export const getProfile = async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, name, avatar FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const user = result.rows[0];
    return res.status(200).json({
      id: Number(user.id),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Nombre y email son requeridos' });
    }

    const emailNorm = email.toLowerCase().trim();

    // Verificar si el nuevo email ya está en uso por otro usuario
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [emailNorm, req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está en uso por otra cuenta' });
    }

    const result = await query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, email, name, avatar',
      [name.trim(), emailNorm, req.user.id]
    );

    const updatedUser = result.rows[0];
    return res.status(200).json({
      id: Number(updatedUser.id),
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Contraseña actual y nueva requeridas' });
    }

    const userRes = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!match) {
      return res.status(400).json({ message: 'La contraseña actual no es correcta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    // Obtener avatar anterior para eliminarlo de Cloudinary
    const currentRes = await query('SELECT avatar FROM users WHERE id = $1', [req.user.id]);
    const oldAvatar = currentRes.rows[0]?.avatar;

    // Subir a Cloudinary con recorte facial y optimización automática
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'notitas/avatars',
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    const newAvatarUrl = uploadResult.secure_url;

    // Actualizar BD
    await query('UPDATE users SET avatar = $1 WHERE id = $2', [newAvatarUrl, req.user.id]);

    // Eliminar avatar anterior de Cloudinary si existía
    if (oldAvatar && oldAvatar.includes('cloudinary.com')) {
      deleteFromCloudinary(oldAvatar);
    }

    return res.status(200).json({
      message: 'Foto de perfil actualizada exitosamente',
      avatar: newAvatarUrl,
    });
  } catch (error) {
    next(error);
  }
};
