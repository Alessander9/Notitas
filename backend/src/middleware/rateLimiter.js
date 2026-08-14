import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 15, // máximo 15 solicitudes por minuto por IP
  message: { message: 'Demasiadas solicitudes. Intenta de nuevo en 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});
