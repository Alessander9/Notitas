import { describe, it, expect } from 'vitest';
import { compressImage } from './imageCompression';

describe('compressImage', () => {
  it('retorna el archivo sin modificar si es un GIF', async () => {
    const gifFile = new File(['fake-gif-data'], 'anim.gif', { type: 'image/gif' });
    const result = await compressImage(gifFile);
    expect(result).toBe(gifFile);
  });

  it('retorna el archivo sin modificar si no es una imagen', async () => {
    const txtFile = new File(['fake-text'], 'doc.pdf', { type: 'application/pdf' });
    const result = await compressImage(txtFile);
    expect(result).toBe(txtFile);
  });
});
