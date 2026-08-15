import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPlainText, formatShortDate, formatRelativeTime, getAssetUrl, getAvatarUrl } from './text';

describe('getPlainText', () => {
  it('extrae texto plano de HTML', () => {
    expect(getPlainText('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
  });

  it('devuelve el fallback si no hay contenido', () => {
    expect(getPlainText('', 'Sin contenido')).toBe('Sin contenido');
    expect(getPlainText(null, 'x')).toBe('x');
    expect(getPlainText(undefined, 'x')).toBe('x');
  });
});

describe('formatShortDate', () => {
  it('formatea una fecha ISO', () => {
    // "12 mar" independientemente de la locale del runner
    const d = new Date(2026, 2, 12, 10, 0, 0);
    expect(formatShortDate(d.toISOString())).toBe(d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  });

  it('devuelve vacío sin fecha', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve "ahora" para menos de un minuto', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const iso = new Date(2026, 0, 1, 11, 59, 45).toISOString();
    expect(formatRelativeTime(iso)).toBe('ahora');
  });

  it('devuelve minutos', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const iso = new Date(2026, 0, 1, 11, 55, 0).toISOString();
    expect(formatRelativeTime(iso)).toBe('hace 5 min');
  });

  it('devuelve horas', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    const iso = new Date(2026, 0, 1, 9, 30, 0).toISOString();
    expect(formatRelativeTime(iso)).toBe('hace 2h');
  });

  it('devuelve días', () => {
    vi.setSystemTime(new Date(2026, 0, 8, 12, 0, 0));
    const iso = new Date(2026, 0, 4, 12, 0, 0).toISOString();
    expect(formatRelativeTime(iso)).toBe('hace 4d');
  });

  it('vuelve a fecha corta pasada una semana', () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    const iso = new Date(2026, 0, 1, 12, 0, 0).toISOString();
    const expected = new Date(2026, 0, 1, 12, 0, 0).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    expect(formatRelativeTime(iso)).toBe(expected);
  });

  it('maneja fechas inválidas', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('no-iso')).not.toBeNull();
  });
});

describe('getAssetUrl / getAvatarUrl', () => {
  it('convierte rutas del servidor en URLs absolutas', () => {
    expect(getAssetUrl('/uploads/foto.png')).toContain('uploads/foto.png');
  });

  it('deja intactas las URLs completas', () => {
    expect(getAssetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('devuelve null sin URL', () => {
    expect(getAssetUrl(null)).toBeNull();
    expect(getAssetUrl('')).toBeNull();
  });

  it('getAvatarUrl es un alias de getAssetUrl', () => {
    expect(getAvatarUrl('/uploads/avatar.png')).toContain('uploads/avatar.png');
    expect(getAvatarUrl(null)).toBeNull();
  });
});
