/**
 * Utilidad de compresión y redimensionamiento de imágenes en el cliente.
 * Convierte imágenes (PNG, JPG, WebP) a formato WebP optimizado antes de enviarlas al servidor.
 */

/**
 * Comprime un archivo File o Blob de imagen a WebP.
 * @param {File|Blob} file - Archivo de imagen original.
 * @param {Object} options
 * @param {number} options.maxWidth - Ancho máximo en px (default: 1600).
 * @param {number} options.maxHeight - Alto máximo en px (default: 1600).
 * @param {number} options.quality - Calidad de compresión WebP 0-1 (default: 0.82).
 * @returns {Promise<File>} Archivo comprimido en formato WebP.
 */
export async function compressImage(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = {}) {
  // Si no es imagen o es un GIF animado, no alterar para preservar la animación
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calcular nuevas dimensiones manteniendo la relación de aspecto
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback al archivo original si no hay contexto canvas
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Si el archivo comprimido resulta más grande que el original, mantener el original
          if (blob.size >= file.size && file.type === 'image/webp') {
            resolve(file);
            return;
          }

          const originalName = (file.name || 'image').replace(/\.[^/.]+$/, '');
          const compressedFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback ante error
    };

    img.src = objectUrl;
  });
}
