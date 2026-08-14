import { query } from '../config/db.js';

export const ping = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'notitas-api-node',
    timestamp: new Date().toISOString(),
  });
};

export const health = async (req, res) => {
  try {
    const result = await query('SELECT 1');
    if (result) {
      return res.status(200).json({
        status: 'ok',
        service: 'notitas-api-node',
        database: 'up',
      });
    }
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      service: 'notitas-api-node',
      database: 'unreachable',
      error: err.message,
    });
  }
};
