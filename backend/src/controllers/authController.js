import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';
const COOKIE_SECURE = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax');

const generateToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(
    {
      id: user.id,
      sub: user.email,
      email: user.email,
      tv: Number(user.token_version || 0),
      rm: Boolean(rememberMe),
    },
    JWT_SECRET,
    { expiresIn }
  );
};

const setJwtCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined;
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: '/',
    maxAge,
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const emailNorm = email.toLowerCase().trim();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [emailNorm]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Error: El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO users (name, email, password, token_version) VALUES ($1, $2, $3, 0)',
      [name.trim(), emailNorm, hashedPassword]
    );

    return res.status(200).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const emailNorm = email.toLowerCase().trim();
    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [emailNorm]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken(user, rememberMe);
    setJwtCookie(res, token, rememberMe);

    return res.status(200).json({
      token,
      id: Number(user.id),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt || req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Sesión no válida o expirada' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Sesión no válida o expirada' });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.token_version)) {
      return res.status(401).json({ message: 'Sesión revocada' });
    }

    const rememberMe = Boolean(decoded.rm);
    const newToken = generateToken(user, rememberMe);
    setJwtCookie(res, newToken, rememberMe);

    return res.status(200).json({
      token: newToken,
      id: Number(user.id),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt || req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.id || decoded.sub)) {
          await query(
            'UPDATE users SET token_version = token_version + 1 WHERE id = $1 OR LOWER(email) = LOWER($2)',
            [decoded.id || 0, decoded.sub || '']
          );
        }
      } catch {
        // Ignorar error al decodificar token expirado
      }
    }

    res.clearCookie('jwt', {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: '/',
    });

    return res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }

    const emailNorm = email.toLowerCase().trim();
    const userRes = await query('SELECT id FROM users WHERE LOWER(email) = $1', [emailNorm]);

    let devResetLink = null;
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES ($1, $2, $3, false)',
        [user.id, resetToken, expiresAt]
      );

      const emailResult = await sendPasswordResetEmail(emailNorm, resetToken);
      if (emailResult.devLink) {
        devResetLink = emailResult.devLink;
      }
    }

    const responsePayload = {
      message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    };
    if (devResetLink && process.env.NODE_ENV !== 'production') {
      responsePayload.devResetLink = devResetLink;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
    }

    const tokenRes = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o ha expirado' });
    }

    const resetRecord = tokenRes.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña y revocar sesiones previas
    await query(
      'UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    );

    // Marcar token como usado
    await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetRecord.id]);

    return res.status(200).json({
      message: 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error) {
    next(error);
  }
};
