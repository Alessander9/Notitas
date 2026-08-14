export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error in request:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  return res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
