import JSZip from 'jszip';
import { markdownToEditorHtml } from './markdown';

/**
 * Parsea un archivo individual (Markdown, texto plano)
 */
export async function parseSingleFile(file) {
  const text = await file.text();
  const title = extractTitleFromMarkdown(text, file.name);
  const tags = extractTagsFromMarkdown(text);
  const htmlContent = markdownToEditorHtml(text);

  return {
    filename: file.name,
    title,
    tags,
    content: htmlContent,
  };
}

/**
 * Extrae y parsea todas las notas desde un archivo comprimido .zip (Obsidian, Notion, etc.)
 */
export async function parseZipArchive(zipFile, onProgress) {
  const zip = new JSZip();
  const uncompressed = await zip.loadAsync(zipFile);
  const notes = [];
  const entries = Object.keys(uncompressed.files).filter(
    (filename) =>
      !uncompressed.files[filename].dir &&
      (filename.endsWith('.md') || filename.endsWith('.markdown') || filename.endsWith('.txt')) &&
      !filename.startsWith('__MACOSX') &&
      !filename.includes('/.trash/')
  );

  let processed = 0;
  for (const filename of entries) {
    const fileObj = uncompressed.files[filename];
    const text = await fileObj.async('text');

    // Determinar nombre de subcarpeta como sugerencia de proyecto o categoría
    const pathParts = filename.split('/');
    const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
    const baseFilename = pathParts[pathParts.length - 1];

    const title = extractTitleFromMarkdown(text, baseFilename);
    const tags = extractTagsFromMarkdown(text);
    const htmlContent = markdownToEditorHtml(text);

    notes.push({
      filename,
      folderName,
      title,
      tags,
      content: htmlContent,
    });

    processed++;
    if (typeof onProgress === 'function') {
      onProgress(Math.round((processed / entries.length) * 100));
    }
  }

  return notes;
}

function extractTitleFromMarkdown(text, fallbackName = 'Nota Importada') {
  if (!text) return fallbackName.replace(/\.[^/.]+$/, '');

  // 1. Buscar en YAML frontmatter (ej: title: Mi Nota)
  const yamlMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const titleMatch = yamlMatch[1].match(/^title:\s*["']?([^"'\n\r]+)["']?/m);
    if (titleMatch && titleMatch[1].trim()) {
      return titleMatch[1].trim();
    }
  }

  // 2. Buscar primer encabezado Markdown (# Titulo)
  const headingMatch = text.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1].trim()) {
    return headingMatch[1].trim();
  }

  // 3. Fallback al nombre del archivo sin extensión
  return fallbackName.replace(/\.[^/.]+$/, '');
}

function extractTagsFromMarkdown(text) {
  if (!text) return [];
  const tags = new Set();

  // 1. Tags desde YAML frontmatter (tags: [a, b] o tags:\n - a)
  const yamlMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlMatch) {
    const tagsInline = yamlMatch[1].match(/^tags:\s*\[(.*?)\]/m);
    if (tagsInline) {
      tagsInline[1].split(',').forEach((t) => {
        const clean = t.trim().replace(/^["']|["']$/g, '');
        if (clean) tags.add(clean);
      });
    }
    const tagsList = yamlMatch[1].match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (tagsList) {
      tagsList[1].split('\n').forEach((line) => {
        const clean = line.replace(/^\s*-\s*/, '').replace(/^["']|["']$/g, '').trim();
        if (clean) tags.add(clean);
      });
    }
  }

  // 2. Tags tipo hashtag inline (#react #diseño)
  const hashtagMatches = text.matchAll(/(?:^|\s)#([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+)(?=\s|$)/g);
  for (const match of hashtagMatches) {
    const tag = match[1];
    // Evitar falsos positivos como números (#1, #2)
    if (!/^\d+$/.test(tag) && tag.length > 1) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}
