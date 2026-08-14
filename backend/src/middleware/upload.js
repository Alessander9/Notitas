import multer from 'multer';

// Almacenamiento en memoria para subir directamente a Cloudinary vía stream
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB límite máximo
  },
});
