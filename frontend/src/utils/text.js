/**
 * Extracts plain text from an HTML string (e.g. TipTap note content).
 * @param {string} html - HTML string to strip.
 * @param {string} fallback - Text to return when there is no content.
 * @returns {string}
 */
export const getPlainText = (html, fallback = '') => {
  if (!html) return fallback;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || fallback;
};

/**
 * Formats an ISO date as a compact "12 mar" string.
 * @param {string} iso - ISO date string.
 * @returns {string}
 */
export const formatShortDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * Formats an ISO date as a relative time string (e.g. "hace 5 min", "hace 2 h").
 * @param {string} iso - ISO date string.
 * @returns {string}
 */
export const formatRelativeTime = (iso) => {
  if (!iso) return '';
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatShortDate(iso);
};

import { API_BASE_URL } from '../services/api';

/**
 * Convierte una ruta del servidor (p. ej. "/uploads/x.png") en una URL
 * absoluta usando la base de la API. Si ya es una URL completa, la devuelve
 * tal cual. Reemplaza el patrón `x.startsWith('http') ? x : 'http://localhost:8080' + x`
 * que se repetía en decenas de componentes con el host hardcodeado.
 * @param {string} url - Ruta del servidor o URL completa.
 * @returns {string|null}
 */
export const getAssetUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

/**
 * Builds an absolute URL for a user avatar (stored as a server path).
 * @param {string} avatar - Avatar path or full URL.
 * @returns {string|null}
 */
export const getAvatarUrl = (avatar) => getAssetUrl(avatar);
