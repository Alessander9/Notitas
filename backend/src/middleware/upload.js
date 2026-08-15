import multer from 'multer';
import path from 'path';

// Almacenamiento en memoria para subir directamente a Cloudinary vía stream
const storage = multer.memoryStorage();

// Lista de extensiones ejecutables o de script bloqueadas por seguridad
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.cgi',
  '.pl', '.py', '.js', '.vbs', '.msi', '.dll', '.com', '.scr', '.jar',
]);

const safeFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error('Tipo de archivo no permitido por razones de seguridad.'), false);
  }
  cb(null, true);
};

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('El archivo debe ser una imagen válida (JPEG, PNG, WebP, GIF, SVG).'), false);
  }
};

// Subida de imágenes (avatares, portadas, imágenes embebidas)
export const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB para imágenes
  },
  fileFilter: imageFileFilter,
});

// Subida general de archivos / adjuntos
export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB límite máximo
  },
  fileFilter: safeFileFilter,
});
