import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Configuración dinámica de orígenes permitidos por CORS
const defaultOrigins = [
  'https://notitas-cleo.vercel.app',
  'https://notitas-alessander.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origin (como curl, Render health checks o apps móviles)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Bloqueado por CORS: Origen no autorizado'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(cookieParser());
app.use(compression({
  threshold: 1024, // Comprimir solo respuestas mayores a 1KB
  level: 6,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Montaje de rutas con y sin prefijo /api para soporte universal (Vercel Serverless + Standalone)
app.use('/api/public', publicRoutes);
app.use('/public', publicRoutes);

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);

app.use('/api/notes', noteRoutes);
app.use('/notes', noteRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);

app.use('/api/templates', templateRoutes);
app.use('/templates', templateRoutes);

// Redirección de /uploads/:filename a Supabase Storage para compatibilidad de imágenes anteriores
app.get(['/uploads/:filename', '/api/uploads/:filename'], (req, res) => {
  const { filename } = req.params;
  const target = `https://psohmafcklylghcohcns.supabase.co/storage/v1/object/public/uploads/${filename}`;
  return res.redirect(302, target);
});

// Health check
app.get(['/', '/health', '/api/health', '/api/ping'], (req, res) => {
  res.json({ status: 'ok', service: 'Notitas API (Node.js en Vercel)', version: '1.0.0' });
});

// Manejador centralizado de errores
app.use(errorHandler);

export default app;
