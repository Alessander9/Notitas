export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error in request:', err);

  // Errores específicos de Multer (límites de tamaño, etc.)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'El archivo excede el tamaño máximo permitido.' });
    }
    return res.status(400).json({ message: `Error en la subida del archivo: ${err.message}` });
  }

  // Errores de validación de filtros de archivo o CORS
  if (err.message && (err.message.includes('seguridad') || err.message.includes('imagen válida') || err.message.includes('CORS'))) {
    return res.status(400).json({ message: err.message });
  }

  // Errores de conectividad con la base de datos (cold start, reconexión o timeout)
  const isDbOffline =
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === '57P01' ||
    err.name === 'AggregateError' ||
    (err.errors && Array.isArray(err.errors) && err.errors.some((e) => e.code === 'ECONNREFUSED'));

  if (isDbOffline) {
    return res.status(503).json({
      message: 'El servicio de base de datos está reconectando o no está disponible temporalmente.',
      isDatabaseOffline: true,
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  return res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
