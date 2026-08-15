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

const SUPABASE_STORAGE_URL = 'https://psohmafcklylghcohcns.supabase.co/storage/v1/object/public/uploads';

/**
 * Convierte una ruta del servidor (p. ej. "/uploads/x.png") en una URL
 * absoluta usando la base de la API o el CDN de almacenamiento.
 * @param {string} url - Ruta del servidor o URL completa.
 * @returns {string|null}
 */
export const getAssetUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    const filename = url.replace(/^\/uploads\//, '');
    return `${SUPABASE_STORAGE_URL}/${filename}`;
  }
  return `${API_BASE_URL}${url}`;
};

/**
 * Builds an absolute URL for a user avatar (stored as a server path).
 * @param {string} avatar - Avatar path or full URL.
 * @returns {string|null}
 */
export const getAvatarUrl = (avatar) => getAssetUrl(avatar);

