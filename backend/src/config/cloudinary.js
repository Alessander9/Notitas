import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary con credenciales provistas o variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'notitas-app',
  api_key: process.env.CLOUDINARY_API_KEY || '128275187432123',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'jU1f3sewX5jHoBZKCPQB47Z9oY8',
  secure: true,
});

export default cloudinary;
