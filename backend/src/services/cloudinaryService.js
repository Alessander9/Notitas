import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

/**
 * Sube un buffer de archivo directamente a Cloudinary vía streaming
 * @param {Buffer} buffer - Contenido del archivo
 * @param {Object} options - Opciones de Cloudinary (folder, transformation, etc.)
 * @returns {Promise<Object>} Resultado de Cloudinary con secure_url y public_id
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'notitas',
        resource_type: options.resourceType || 'auto',
        transformation: options.transformation || [{ quality: 'auto', fetch_format: 'auto' }],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    // Escribir el buffer al stream
    uploadStream.end(buffer);
  });
};

/**
 * Elimina un recurso de Cloudinary por su public_id o URL
 * @param {string} publicIdOrUrl 
 */
export const deleteFromCloudinary = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;
  try {
    let publicId = publicIdOrUrl;
    // Si se pasa una URL completa, extraer el publicId aproximado
    if (publicIdOrUrl.startsWith('http')) {
      const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (match && match[1]) {
        publicId = match[1];
      }
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Could not delete asset from Cloudinary:', err.message);
  }
};
