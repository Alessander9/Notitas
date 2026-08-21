import { describe, it, expect } from 'vitest';
import { Fragment } from 'react';
import { renderMarkdown, markdownToEditorHtml } from './markdown';

// Cada bloque se envuelve en un <React.Fragment key>; desempaquetamos el hijo real
const unwrap = (block) => (block && block.type === Fragment ? block.props.children : block);
const first = (blocks) => unwrap(blocks[0]);
const findByType = (blocks, type) => {
  for (const block of blocks) {
    const el = unwrap(block);
    if (el && el.type === type) return el;
  }
  return null;
};

// Aplana el árbol de nodos React a texto plano (para inspeccionar contenido)
const flatten = (node) => {
  if (node == null || typeof node === 'string' || typeof node === 'number') return String(node ?? '');
  if (Array.isArray(node)) return node.map(flatten).join('');
  return flatten(node.props?.children);
};

describe('renderMarkdown', () => {
  it('convierte encabezados y negritas', () => {
    const blocks = renderMarkdown('### 📌 Resumen\n\nUn texto con **negrita** y *cursiva*.');
    expect(first(blocks).type).toBe('h3');
    expect(flatten(first(blocks).props.children)).toContain('📌 Resumen');
    const paragraph = findByType(blocks, 'p');
    expect(flatten(paragraph.props.children)).toContain('negrita');
    expect(flatten(paragraph.props.children)).toContain('cursiva');
  });

  it('convierte listas con viñetas', () => {
    const blocks = renderMarkdown('- Primer punto\n- Segundo punto');
    const list = first(blocks);
    expect(list.type).toBe('ul');
    expect(flatten(list.props.children)).toContain('Primer punto');
    expect(flatten(list.props.children)).toContain('Segundo punto');
  });

  it('convierte listas numeradas', () => {
    const blocks = renderMarkdown('1. Paso uno\n2. Paso dos');
    expect(first(blocks).type).toBe('ol');
  });

  it('convierte bloques de código', () => {
    const blocks = renderMarkdown('```js\nconst a = 1;\n```');
    const pre = first(blocks);
    expect(pre.type).toBe('pre');
    expect(flatten(pre.props.children)).toContain('const a = 1;');
  });

  it('convierte código inline', () => {
    const blocks = renderMarkdown('Usa `npm test` para verificar.');
    expect(flatten(first(blocks).props.children)).toContain('npm test');
  });

  it('convierte tablas markdown', () => {
    const blocks = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    const table = first(blocks).props.children;
    expect(table.type).toBe('table');
    expect(flatten(table.props.children)).toContain('A');
    expect(flatten(table.props.children)).toContain('1');
  });

  it('convierte citas', () => {
    const blocks = renderMarkdown('> Cita importante');
    expect(first(blocks).type).toBe('blockquote');
    expect(flatten(first(blocks).props.children)).toContain('Cita importante');
  });

  it('convierte enlaces', () => {
    const blocks = renderMarkdown('Visita [Notitas](https://notitas.app)');
    const paragraph = first(blocks);
    const link = paragraph.props.children.find((c) => c && c.type === 'a');
    expect(link.props.href).toBe('https://notitas.app');
    expect(flatten(link.props.children)).toBe('Notitas');
  });

  it('convierte líneas divisorias', () => {
    expect(first(renderMarkdown('---')).type).toBe('hr');
  });

  it('convierte párrafos de texto plano', () => {
    const blocks = renderMarkdown('Hola mundo');
    expect(first(blocks).type).toBe('p');
    expect(flatten(first(blocks).props.children)).toBe('Hola mundo');
  });
});

describe('markdownToEditorHtml', () => {
  it('convierte encabezados y párrafos con formato inline', () => {
    const html = markdownToEditorHtml('# Título\n\nTexto con **negrita**, *cursiva* y `código`.');
    expect(html).toContain('<h1>Título</h1>');
    expect(html).toContain('<p>');
    expect(html).toContain('<strong>negrita</strong>');
    expect(html).toContain('<em>cursiva</em>');
    expect(html).toContain('<code>código</code>');
  });

  it('convierte listas de tareas para TipTap TaskList', () => {
    const html = markdownToEditorHtml('- [ ] Tarea pendiente\n- [x] Tarea completada');
    expect(html).toContain('<ul data-type="taskList">');
    expect(html).toContain('<li data-type="taskItem" data-checked="false">');
    expect(html).toContain('<li data-type="taskItem" data-checked="true">');
    expect(html).toContain('Tarea pendiente');
    expect(html).toContain('Tarea completada');
  });

  it('convierte listas ordenadas y con viñetas', () => {
    const ulHtml = markdownToEditorHtml('- Item 1\n- Item 2');
    expect(ulHtml).toContain('<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>');

    const olHtml = markdownToEditorHtml('1. Primero\n2. Segundo');
    expect(olHtml).toContain('<ol><li><p>Primero</p></li><li><p>Segundo</p></li></ol>');
  });

  it('convierte bloques de código y citas', () => {
    const html = markdownToEditorHtml('```js\nconsole.log("hola");\n```\n\n> Cita motivacional');
    expect(html).toContain('<pre><code>console.log("hola");</code></pre>');
    expect(html).toContain('<blockquote><p>Cita motivacional</p></blockquote>');
  });

  it('convierte tablas markdown a HTML', () => {
    const html = markdownToEditorHtml('| Col1 | Col2 |\n|---|---|\n| Val1 | Val2 |');
    expect(html).toContain('<table><tbody>');
    expect(html).toContain('<th><p>Col1</p></th>');
    expect(html).toContain('<td><p>Val1</p></td>');
  });
});
