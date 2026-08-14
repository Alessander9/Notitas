import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';

export const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extraer de cookie 'jwt' o 'token'
    if (req.cookies && (req.cookies.jwt || req.cookies.token)) {
      token = req.cookies.jwt || req.cookies.token;
    }

    // 2. Extraer de cabecera Authorization: Bearer <token>
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No autorizado: Token no proporcionado' });
    }

    // 3. Verificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Buscar usuario en base de datos para validar token_version (revocación)
    const userRes = await query('SELECT id, email, name, avatar, token_version FROM users WHERE id = $1', [decoded.id || decoded.sub]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = userRes.rows[0];

    // Verificar si el token_version en el token coincide con la BD
    if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.token_version)) {
      return res.status(401).json({ message: 'Sesión invalidada. Inicia sesión nuevamente.' });
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      tokenVersion: user.token_version,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
};
