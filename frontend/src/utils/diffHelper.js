/**
 * Calcula diferencias a nivel de palabras entre dos textos.
 * Devuelve un array de objetos con `{ type: 'added' | 'removed' | 'unchanged', text: string }`
 */
export function computeWordDiff(oldText = '', newText = '') {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const n = oldWords.length;
  const m = newWords.length;

  // LCS Matrix
  const matrix = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldWords[i] === newWords[j]) {
        matrix[i + 1][j + 1] = matrix[i][j] + 1;
      } else {
        matrix[i + 1][j + 1] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff chunks
  let i = n;
  let j = m;
  const result = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: 'unchanged', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      result.unshift({ type: 'added', text: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      result.unshift({ type: 'removed', text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive chunks of same type
  const merged = [];
  for (const chunk of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === chunk.type) {
      last.text += chunk.text;
    } else if (chunk.text) {
      merged.push({ ...chunk });
    }
  }

  return merged;
}
