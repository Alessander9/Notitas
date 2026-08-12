import { describe, it, expect } from 'vitest';
import { sanitizeFilename, htmlToMarkdown, exportNoteAsDocx } from './exportNote';

describe('sanitizeFilename', () => {
  it('elimina caracteres no válidos para nombres de archivo', () => {
    expect(sanitizeFilename('Mi nota: final?')).toBe('Mi nota- final-');
    expect(sanitizeFilename('a/b\\c*d')).toBe('a-b-c-d');
    expect(sanitizeFilename('')).toBe('nota');
    expect(sanitizeFilename('   ')).toBe('nota');
    expect(sanitizeFilename('Reunión de hoy')).toBe('Reunión de hoy');
  });
});

describe('htmlToMarkdown', () => {
  it('convierte encabezados, negritas y listas', async () => {
    const md = await htmlToMarkdown(
      '<h2>Título</h2><p>Hola <strong>mundo</strong> y <em>adiós</em></p><ul><li><p>Elemento A</p></li><li><p>Elemento B</p></li></ul>'
    );
    expect(md).toContain('## Título');
    expect(md).toContain('**mundo**');
    expect(md).toContain('*adiós*');
    // La indentación tras el guion puede variar (GFM válido: '-   Elemento A')
    expect(md).toMatch(/-\s+Elemento A/);
    expect(md).toMatch(/-\s+Elemento B/);
  });

  it('convierte listas de tareas de Tiptap con checkboxes', async () => {
    const md = await htmlToMarkdown(
      '<ul data-type="taskList">' +
        '<li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Hecho</p></div></li>' +
        '<li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pendiente</p></div></li>' +
        '</ul>'
    );
    expect(md).toContain('- [x] Hecho');
    expect(md).toContain('- [ ] Pendiente');
  });

  it('convierte bloques de código a fenced code', async () => {
    const md = await htmlToMarkdown('<pre><code class="language-js">const a = 1;</code></pre>');
    expect(md).toContain('```js');
    expect(md).toContain('const a = 1;');
    expect(md).toContain('```');
  });

  it('convierte tablas de Tiptap a tablas GFM', async () => {
    const md = await htmlToMarkdown(
      '<table><tbody>' +
        '<tr><th><p>Nombre</p></th><th><p>Edad</p></th></tr>' +
        '<tr><td><p>Ana</p></td><td><p>30</p></td></tr>' +
        '</tbody></table>'
    );
    expect(md).toContain('| Nombre | Edad |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| Ana | 30 |');
  });

  it('convierte enlaces e imágenes', async () => {
    const md = await htmlToMarkdown(
      '<p>Visita <a href="https://notitas.example">Notitas</a> y mira <img src="/uploads/foto.png" alt="Foto"></p>'
    );
    expect(md).toContain('[Notitas](https://notitas.example)');
    expect(md).toContain('![Foto](/uploads/foto.png)');
  });
});

describe('exportNoteAsDocx', () => {
  it('genera un documento Word válido desde el HTML de la nota', async () => {
    // jsdom no implementa createObjectURL; se reemplaza con un stub.
    const original = URL.createObjectURL;
    URL.createObjectURL = () => 'blob:mock-docx';
    URL.revokeObjectURL = () => {};
    try {
      await expect(
        exportNoteAsDocx({
          title: 'Mi nota',
          html:
            '<h1>Título</h1>' +
            '<p>Hola <strong>mundo</strong> y <a href="https://ejemplo.com">enlace</a></p>' +
            '<ol><li><p>Uno</p></li><li><p>Dos</p></li></ol>' +
            '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Hecho</p></div></li></ul>' +
            '<pre><code>const x = 1;</code></pre>',
          coverUrl: null,
        })
      ).resolves.toBeUndefined();
    } finally {
      URL.createObjectURL = original;
    }
  });
});
