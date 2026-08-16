import { describe, it, expect } from 'vitest';
import { Fragment } from 'react';
import { renderMarkdown } from './markdown';

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
