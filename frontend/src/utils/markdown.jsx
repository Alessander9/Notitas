import React from 'react';

// Renderizador ligero de Markdown a elementos React (sin dangerouslySetInnerHTML).
// Soporta el subconjunto usado por CleoBot: encabezados, listas, tablas,
// bloques de código, citas, líneas divisorias, negrita, cursiva, código
// inline, enlaces y saltos de línea.

// Importante: la regex se crea por llamada. Con una regex global compartida,
// la recursión (negrita/cursiva/enlaces) reseteaba `lastIndex` del bucle padre
// y provocaba un bucle infinito.
export function renderInline(text, keyPrefix = 'i') {
  if (!text) return null;
  const nodes = [];
  const INLINE_REGEX = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let i = 0;
  let match;
  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-${i}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{renderInline(token.slice(2, -2), `${keyPrefix}-${i}`)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={`${keyPrefix}-${i}`}>{renderInline(token.slice(1, -1), `${keyPrefix}-${i}`)}</em>);
    } else if (token.startsWith('[')) {
      // Grupos: [0]=match, 1=code, 2=bold, 3=italic, 4=link, 5=label, 6=href
      nodes.push(
        <a key={`${keyPrefix}-${i}`} href={match[6]} target="_blank" rel="noreferrer">
          {renderInline(match[5], `${keyPrefix}-${i}`)}
        </a>
      );
    }
    lastIndex = match.index + token.length;
    i += 1;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const splitCells = (line) => {
  const cells = line.split('|').map((c) => c.trim());
  if (cells[0] === '') cells.shift();
  if (cells[cells.length - 1] === '') cells.pop();
  return cells;
};

const isTableSeparator = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*\s*$/.test(line) && /-/.test(line);

export function renderMarkdown(content) {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;

  const pushBlock = (node) => blocks.push(<React.Fragment key={key++}>{node}</React.Fragment>);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bloque de código con fences
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // saltar el cierre
      pushBlock(<pre><code>{codeLines.join('\n')}</code></pre>);
      continue;
    }

    // Encabezados
    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      if (level === 1) pushBlock(<h3>{renderInline(text, `h1-${key}`)}</h3>);
      else if (level === 2) pushBlock(<h3>{renderInline(text, `h2-${key}`)}</h3>);
      else pushBlock(<h3>{renderInline(text, `h3-${key}`)}</h3>);
      i += 1;
      continue;
    }

    // Línea divisoria
    if (/^\s*([-*_])\1{2,}\s*$/.test(trimmed)) {
      pushBlock(<hr />);
      i += 1;
      continue;
    }

    // Tabla
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitCells(line);
      i += 2; // saltar cabecera + separador
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitCells(lines[i]));
        i += 1;
      }
      pushBlock(
        <div style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82em' }}>
            <thead>
              <tr>{header.map((h, idx) => <th key={idx} style={{ textAlign: 'left', borderBottom: '2px solid', padding: '6px 8px' }}>{renderInline(h, `th-${idx}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ridx) => (
                <tr key={ridx}>{row.map((cell, cidx) => <td key={cidx} style={{ borderBottom: '1px solid', padding: '6px 8px' }}>{renderInline(cell, `td-${ridx}-${cidx}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Cita
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      pushBlock(<blockquote>{quoteLines.map((q, qi) => <div key={qi}>{renderInline(q, `q-${key}-${qi}`)}</div>)}</blockquote>);
      continue;
    }

    // Listas
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items = [];
      const collect = (re) => {
        while (i < lines.length) {
          const m = lines[i].trim().match(re);
          if (m) {
            items.push(m[1]);
            i += 1;
          } else {
            break;
          }
        }
      };
      if (ordered) collect(/^\d+[.)]\s+(.*)$/);
      else collect(/^[-*•]\s+(.*)$/);
      const ListTag = ordered ? 'ol' : 'ul';
      pushBlock(
        <ListTag style={{ paddingLeft: 22, margin: '4px 0' }}>
          {items.map((item, idx) => <li key={idx} style={{ margin: '2px 0' }}>{renderInline(item, `li-${key}-${idx}`)}</li>)}
        </ListTag>
      );
      continue;
    }

    // Párrafo (incluye líneas vacías como separadores)
    if (trimmed === '') {
      i += 1;
      continue;
    }
    pushBlock(<p>{renderInline(trimmed, `p-${key}`)}</p>);
    i += 1;
  }

  return blocks;
}
