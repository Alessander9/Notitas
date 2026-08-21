import { describe, it, expect } from 'vitest';
import { parseSingleFile } from './universalImporter';

describe('universalImporter', () => {
  it('extrae título, hashtags y contenido HTML desde Markdown con frontmatter', async () => {
    const markdownContent = `---
title: "Nota con Frontmatter"
tags: [frontend, react, productividad]
---

# Titulo Principal
Este es un párrafo de prueba con #urgente y #diseño.

- [ ] Tarea 1
- [x] Tarea 2
`;

    const mockFile = {
      name: 'mi-nota.md',
      text: async () => markdownContent,
    };

    const result = await parseSingleFile(mockFile);

    expect(result.title).toBe('Nota con Frontmatter');
    expect(result.tags).toContain('frontend');
    expect(result.tags).toContain('react');
    expect(result.tags).toContain('urgente');
    expect(result.content).toContain('<p>');
  });

  it('extrae título desde el primer encabezado Markdown si no hay frontmatter', async () => {
    const markdownContent = `# Mi Gran Idea de Proyecto

Detalles del proyecto sin frontmatter.
`;

    const mockFile = {
      name: 'archivo-sin-frontmatter.md',
      text: async () => markdownContent,
    };

    const result = await parseSingleFile(mockFile);
    expect(result.title).toBe('Mi Gran Idea de Proyecto');
  });
});
