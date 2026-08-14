import app from './app.js';
import { pool } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Notitas Node.js Backend corriendo en el puerto ${PORT}`);

  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`✅ Conexión con PostgreSQL establecida correctamente: ${res.rows[0].now}`);
  } catch (err) {
    console.warn(`⚠️ Advertencia de base de datos al arrancar: ${err.message}`);
  }
});

// Manejo de apagado graceful
const shutdown = () => {
  console.log('Cerrando servidor Node.js...');
  server.close(async () => {
    await pool.end();
    console.log('Servidor y conexiones de BD cerradas.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
