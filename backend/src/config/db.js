import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Extraer connection string desde DATABASE_URL o DB_URL
const connectionString = process.env.DATABASE_URL || process.env.DB_URL || '';

// Si la URL viene en formato jdbc:postgresql://, convertir a postgresql://
const sanitizedConnectionString = connectionString.replace(/^jdbc:/, '');

export const pool = new Pool({
  connectionString: sanitizedConnectionString || undefined,
  user: process.env.DB_USER || undefined,
  password: process.env.DB_PASSWORD || undefined,
  host: process.env.DB_HOST || undefined,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME || undefined,
  ssl: sanitizedConnectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text, params) => pool.query(text, params);
