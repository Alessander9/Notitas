/**
 * Utilidades de exportación de notas: PDF, PNG, Word (.docx) y Markdown (.md).
 *
 * Las librerías pesadas (html2canvas, jspdf, docx, turndown) se cargan bajo
 * demanda con import() dinámico para no inflar el bundle inicial de la app.
 */

// ── Helpers básicos ──────────────────────────────────────────────────────────

/** Elimina caracteres no válidos para nombres de archivo. */
export const sanitizeFilename = (name = '') =>
  String(name).replace(/[\\/:*?"<>|]/g, '-').trim() || 'nota';

/** Descarga un Blob con el nombre indicado. */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Pequeño margen para que la descarga se complete antes de liberar la URL.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const getImageSize = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

const waitForImages = (root) =>
  Promise.all(
    Array.from(root.querySelectorAll('img')).map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
    )
  );

// ── Exportación visual (PDF / PNG) ───────────────────────────────────────────

// Estilos aplicados al documento clonado que se captura. Replica el aspecto del
// editor en modo claro, independiente del tema actual de la app.
const EXPORT_CSS = `
  .notitas-export-root { box-sizing: border-box; }
  .notitas-export-root *, .notitas-export-root *::before, .notitas-export-root *::after { box-sizing: border-box; }
  .notitas-export-title {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;
    color: #1f2430; margin: 0 0 20px;
  }
  .notitas-export-cover {
    display: block; width: 100%; height: 220px; object-fit: cover;
    border-radius: 12px; margin: 0 0 24px;
  }
  .notitas-export-content {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 15px; line-height: 1.7; color: #1f2430;
  }
  .notitas-export-content p { margin: 0 0 12px; }
  .notitas-export-content h1, .notitas-export-content h2, .notitas-export-content h3,
  .notitas-export-content h4, .notitas-export-content h5, .notitas-export-content h6 {
    clear: both; color: #141a26; line-height: 1.3; margin: 26px 0 10px;
  }
  .notitas-export-content h1 { font-size: 26px; }
  .notitas-export-content h2 { font-size: 22px; }
  .notitas-export-content h3 { font-size: 19px; }
  .notitas-export-content h4 { font-size: 16px; }
  .notitas-export-content ul, .notitas-export-content ol { margin: 0 0 12px; padding-left: 26px; }
  .notitas-export-content li { margin: 3px 0; }
  .notitas-export-content a { color: #386c5f; }
  .notitas-export-content blockquote {
    border-left: 4px solid #386c5f; color: #4a5568; font-style: italic;
    margin: 0 0 12px; padding: 4px 0 4px 16px;
  }
  .notitas-export-content pre {
    background: #f4f6fa; border-radius: 8px; color: #1f2430;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 13px; line-height: 1.5; margin: 0 0 12px; overflow: hidden;
    padding: 14px 16px; white-space: pre-wrap;
  }
  .notitas-export-content code {
    background: #eef1f6; border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em; padding: 2px 5px;
  }
  .notitas-export-content pre code { background: transparent; padding: 0; }
  .notitas-export-content hr { border: none; border-top: 1px solid #d4dae3; margin: 22px 0; }
  .notitas-export-content table { border-collapse: collapse; margin: 0 0 14px; width: 100%; }
  .notitas-export-content th, .notitas-export-content td {
    border: 1px solid #d4dae3; padding: 7px 10px; text-align: left; vertical-align: top;
  }
  .notitas-export-content th { background: #eef2f7; font-weight: 700; }
  .notitas-export-content img { border-radius: 8px; display: block; height: auto; margin: 14px auto; max-width: 100%; }
  .notitas-export-content img.align-left { display: block; float: left; margin: 12px 16px 12px 0; max-width: 45%; }
  .notitas-export-content img.align-right { display: block; float: right; margin: 12px 0 12px 16px; max-width: 45%; }
  .notitas-export-content img[data-notitas-float="true"] {
    display: block !important; left: auto !important; margin: 16px auto;
    position: static !important; top: auto !important;
  }
  .notitas-export-content ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  .notitas-export-content ul[data-type="taskList"] li { align-items: center; display: flex; gap: 8px; margin: 4px 0; }
  .notitas-export-content ul[data-type="taskList"] input[type="checkbox"] {
    accent-color: #386c5f; height: 15px; margin: 0; width: 15px;
  }
`;

/**
 * Construye un contenedor oculto (fuera de pantalla) con el título, la portada
 * y el contenido de la nota, listo para capturar con html2canvas.
 */
const buildExportContainer = ({ title, html, coverUrl }) => {
  const container = document.createElement('div');
  container.className = 'notitas-export-root';
  container.style.cssText = [
    'position:fixed',
    'left:-99999px',
    'top:0',
    'width:794px', // Ancho A4 @ 96 dpi
    'background:#ffffff',
    'color:#1f2430',
    'padding:56px 64px',
    'z-index:-1',
  ].join(';');

  const styleEl = document.createElement('style');
  styleEl.textContent = EXPORT_CSS;

  const titleEl = document.createElement('h1');
  titleEl.className = 'notitas-export-title';
  titleEl.textContent = title || 'Sin título';

  const contentEl = document.createElement('div');
  contentEl.className = 'notitas-export-content';
  contentEl.innerHTML = html || '';

  container.appendChild(styleEl);
  if (coverUrl) {
    const cover = document.createElement('img');
    cover.className = 'notitas-export-cover';
    cover.src = coverUrl;
    cover.alt = 'Portada';
    container.appendChild(cover);
  }
  container.appendChild(titleEl);
  container.appendChild(contentEl);
  document.body.appendChild(container);
  return container;
};

/** Captura la nota como canvas (blanco, en modo claro). */
const captureNoteCanvas = async (payload) => {
  const container = buildExportContainer(payload);
  try {
    await waitForImages(container);
    // Respiro mínimo para que el navegador aplique fuentes y layout.
    await new Promise((resolve) => setTimeout(resolve, 120));
    const { default: html2canvas } = await import('html2canvas');
    // Notas muy largas: se reduce la escala para no superar los límites del
    // lienzo del navegador (~16.000 px de alto).
    const rawHeight = Math.max(container.scrollHeight, 800);
    const scale = Math.min(2, Math.max(1, 14000 / rawHeight));
    return html2canvas(container, {
      backgroundColor: '#ffffff',
      logging: false,
      scale,
      useCORS: true,
    });
  } finally {
    container.remove();
  }
};

/** Exporta la nota como imagen PNG. */
export const exportNoteAsPng = async ({ title, html, coverUrl }) => {
  const canvas = await captureNoteCanvas({ title, html, coverUrl });
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen PNG'))),
      'image/png'
    )
  );
  downloadBlob(blob, `${sanitizeFilename(title)}.png`);
};

/** Exporta la nota como PDF (A4, con paginación automática). */
export const exportNoteAsPdf = async ({ title, html, coverUrl }) => {
  const canvas = await captureNoteCanvas({ title, html, coverUrl });
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  pdf.setProperties({ title: title || 'Nota', creator: 'Notitas' });
  pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);

  let heightLeft = imgHeight - contentHeight;
  let position = margin;
  while (heightLeft > 0) {
    position -= contentHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }
  pdf.save(`${sanitizeFilename(title)}.pdf`);
};

// ── Exportación Word (.docx) ─────────────────────────────────────────────────

const makeImageParagraph = async (src, D, maxWidth = 560) => {
  const { Paragraph, ImageRun, AlignmentType } = D;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawType = blob.type.split('/')[1] || 'png';
    const ext = rawType === 'jpeg' ? 'jpg' : rawType === 'svg+xml' ? 'svg' : rawType;
    if (!['png', 'jpg', 'gif', 'bmp', 'svg'].includes(ext)) return null;

    const data = await blobToBase64(blob);
    const size = await getImageSize(src);
    const naturalWidth = size?.width || 800;
    const naturalHeight = size?.height || 600;
    const width = Math.min(maxWidth, naturalWidth);
    const height = Math.max(1, Math.round((naturalHeight / naturalWidth) * width));

    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: ext, data, transformation: { width, height } })],
      spacing: { after: 240 },
    });
  } catch (error) {
    console.warn('No se pudo incrustar una imagen en el documento Word:', error);
    return null;
  }
};

/** Convierte nodos en línea (strong, em, code, enlaces...) en TextRuns. */
const buildRuns = (node, D, fmt = {}) => {
  const { TextRun, ExternalHyperlink } = D;
  const runs = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (!text) return;
      const opts = { text, bold: fmt.bold, italics: fmt.italic, strike: fmt.strike };
      if (fmt.underline) opts.underline = {};
      if (fmt.mono) {
        opts.font = { ascii: 'Consolas', hAnsi: 'Consolas', cs: 'Consolas' };
        opts.size = 20;
        opts.color = '333333';
      }
      runs.push(new TextRun(opts));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName.toLowerCase();
    switch (tag) {
      case 'br':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'strong':
      case 'b':
        runs.push(...buildRuns(child, D, { ...fmt, bold: true }));
        break;
      case 'em':
      case 'i':
        runs.push(...buildRuns(child, D, { ...fmt, italic: true }));
        break;
      case 's':
      case 'strike':
      case 'del':
        runs.push(...buildRuns(child, D, { ...fmt, strike: true }));
        break;
      case 'u':
        runs.push(...buildRuns(child, D, { ...fmt, underline: true }));
        break;
      case 'code':
        runs.push(...buildRuns(child, D, { ...fmt, mono: true }));
        break;
      case 'a': {
        const href = child.getAttribute('href');
        if (href) {
          runs.push(new ExternalHyperlink({ children: buildRuns(child, D, fmt), link: href }));
        } else {
          runs.push(...buildRuns(child, D, fmt));
        }
        break;
      }
      case 'span':
      case 'p':
      case 'div':
        runs.push(...buildRuns(child, D, fmt));
        break;
      case 'img':
        // Las imágenes de bloque se tratan a nivel de bloque.
        break;
      default:
        runs.push(...buildRuns(child, D, fmt));
    }
  });
  return runs;
};

/** Recorre los bloques de la nota (h1..h6, p, listas, tablas, código...) y los añade al documento. */
const addBlocks = async (node, out, D) => {
  const {
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    ShadingType,
    WidthType,
  } = D;

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (text && text.trim()) out.push(new Paragraph({ children: [new TextRun(text)] }));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = Number(tag[1]);
        const headingMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6,
        };
        out.push(new Paragraph({ heading: headingMap[level], children: buildRuns(el, D) }));
        break;
      }

      case 'p':
        out.push(new Paragraph({ children: buildRuns(el, D), spacing: { after: 160 } }));
        break;

      case 'ul': {
        const isTask = el.getAttribute('data-type') === 'taskList';
        for (const li of Array.from(el.children)) {
          if (isTask) {
            const input = li.querySelector('input[type="checkbox"]');
            const checked = input?.checked || li.getAttribute('data-checked') === 'true';
            const content = li.querySelector('div, p') || li;
            out.push(
              new Paragraph({
                children: [
                  new TextRun({ text: checked ? '[x] ' : '[ ] ', color: '666666' }),
                  ...buildRuns(content, D),
                ],
                indent: { left: 360 },
                spacing: { after: 80 },
              })
            );
          } else {
            out.push(
              new Paragraph({ bullet: { level: 0 }, children: buildRuns(li, D), spacing: { after: 80 } })
            );
          }
        }
        break;
      }

      case 'ol': {
        for (const li of Array.from(el.children)) {
          out.push(
            new Paragraph({
              numbering: { reference: 'notitas-ordered', level: 0 },
              children: buildRuns(li, D),
              spacing: { after: 80 },
            })
          );
        }
        break;
      }

      case 'pre': {
        const code = el.textContent.replace(/\n$/, '');
        const lines = code.split('\n');
        const runs = lines.flatMap((line, i) => {
          const lineRuns = [
            new TextRun({
              text: line,
              font: { ascii: 'Consolas', hAnsi: 'Consolas', cs: 'Consolas' },
              size: 20,
              color: '333333',
            }),
          ];
          if (i < lines.length - 1) lineRuns.push(new TextRun({ break: 1 }));
          return lineRuns;
        });
        out.push(
          new Paragraph({
            children: runs,
            indent: { left: 240, right: 240 },
            shading: { type: ShadingType.CLEAR, fill: 'F4F6FA' },
            spacing: { before: 120, after: 160 },
          })
        );
        break;
      }

      case 'blockquote':
        out.push(
          new Paragraph({
            children: buildRuns(el, D),
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: '386C5F', space: 8 } },
            indent: { left: 480 },
            spacing: { after: 160 },
          })
        );
        break;

      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length > 0) {
          const docRows = rows.map((tr) => {
            const cells = Array.from(tr.querySelectorAll(':scope > th, :scope > td'));
            return new TableRow({
              children: cells.map((cell) => {
                const isHeader = cell.tagName.toLowerCase() === 'th';
                return new TableCell({
                  children: [new Paragraph({ children: buildRuns(cell, D), spacing: { after: 0 } })],
                  shading: isHeader ? { type: ShadingType.CLEAR, fill: 'EEF2F7' } : undefined,
                });
              }),
            });
          });
          out.push(new Table({ rows: docRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          // Separador tras la tabla
          out.push(new Paragraph({ children: [], spacing: { after: 120 } }));
        }
        break;
      }

      case 'img': {
        const paragraph = await makeImageParagraph(el.getAttribute('src'), D);
        if (paragraph) out.push(paragraph);
        break;
      }

      case 'hr':
        out.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D4DAE3' } },
            children: [],
            spacing: { before: 120, after: 120 },
          })
        );
        break;

      default:
        // div y etiquetas desconocidas: se recorren sus hijos como bloques.
        await addBlocks(el, out, D);
    }
  }
};

/** Exporta la nota como documento Word (.docx) real. */
export const exportNoteAsDocx = async ({ title, html, coverUrl }) => {
  const D = await import('docx');
  const { Document, Packer, AlignmentType } = D;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  const children = [];
  if (coverUrl) {
    const coverParagraph = await makeImageParagraph(coverUrl, D, 560);
    if (coverParagraph) children.push(coverParagraph);
  }
  await addBlocks(root, children, D);

  const document = new Document({
    numbering: {
      config: [
        {
          reference: 'notitas-ordered',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1,
              format: 'lowerLetter',
              text: '%2.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
            {
              level: 2,
              format: 'lowerRoman',
              text: '%3.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
};

// ── Exportación Markdown (.md) ───────────────────────────────────────────────

/**
 * Convierte el HTML de Tiptap a Markdown (GFM: tablas, tachado, checklists).
 * Exportada para poder probarla en unit tests.
 */
export const htmlToMarkdown = async (html) => {
  const { default: TurndownService } = await import('turndown');
  const { gfm } = await import('turndown-plugin-gfm');

  // Normaliza el HTML de Tiptap antes de convertir:
  //  - quita los <p> de las celdas de tabla (GFM requiere celdas de una línea)
  //  - aplana las imágenes flotantes a imágenes en línea
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('th, td').forEach((cell) => {
    cell.querySelectorAll('p').forEach((p) => {
      while (p.firstChild) cell.insertBefore(p.firstChild, p);
      p.remove();
    });
  });
  doc.querySelectorAll('img[data-notitas-float="true"]').forEach((img) => {
    img.removeAttribute('data-notitas-float');
    img.removeAttribute('style');
  });

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });
  turndown.use(gfm);

  // Listas de tareas de Tiptap: <ul data-type="taskList"><li data-checked="true">
  // (la regla GFM no aplica porque el checkbox vive dentro de un <label>).
  // addRule antepone reglas, por eso estas tienen prioridad sobre gfm.
  turndown.addRule('taskList', {
    filter: (node) => node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList',
    replacement: (content) => content,
  });
  turndown.addRule('taskListItem', {
    filter: (node) =>
      node.nodeName === 'LI' && node.parentElement?.getAttribute('data-type') === 'taskList',
    replacement: (content, node) => {
      const input = node.querySelector('input[type="checkbox"]');
      const checked = input?.checked || node.getAttribute('data-checked') === 'true';
      const text = content.replace(/\n+$/, '').trim();
      const marker = checked ? '- [x]' : '- [ ]';
      return text ? `${marker} ${text}\n` : `${marker}\n`;
    },
  });

  return turndown.turndown(doc.body.innerHTML);
};

/** Exporta la nota como documento Markdown (.md). */
export const exportNoteAsMarkdown = async ({ title, html, coverUrl }) => {
  const cover = coverUrl ? `![Portada](${coverUrl})\n\n` : '';
  const body = await htmlToMarkdown(html);
  const md = `# ${title || 'Sin título'}\n\n${cover}${body}`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.md`);
};
