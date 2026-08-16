// Servicio para buscar y obtener GIFs animados oficiales con GIPHY y Fotos con Openverse

const DEFAULT_GIPHY_KEY = 'UuW7Yg2V0fPCFZAsBafI3fjroXK2ifOP';

// Colección verificada de GIFs animados con URLs directas de alta disponibilidad
export const CURATED_GIF_COLLECTIONS = {
  Lofi: [
    { id: 'lofi-1', title: 'Lofi Room Rain Study', url: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0A/giphy.gif', preview: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0A/giphy.gif' },
    { id: 'lofi-2', title: 'Cozy Reading Night', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', preview: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif' },
    { id: 'lofi-3', title: 'Sunset Train Ride', url: 'https://media.giphy.com/media/l41JRsph73VokN6ik/giphy.gif', preview: 'https://media.giphy.com/media/l41JRsph73VokN6ik/giphy.gif' },
    { id: 'lofi-4', title: 'Night Coding Chill', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', preview: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
  ],
  Gatos: [
    { id: 'cat-1', title: 'Gato tierno durmiendo', url: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif', preview: 'https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif' },
    { id: 'cat-2', title: 'Gato tecleando rápido', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', preview: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
    { id: 'cat-3', title: 'Gato concentrado en pantalla', url: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif', preview: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif' },
    { id: 'cat-4', title: 'Gatito curioso', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', preview: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif' },
  ],
  Anime: [
    { id: 'ani-1', title: 'Ghibli Cocina Deliciosa', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif' },
    { id: 'ani-2', title: 'Ventana de Tren Anime', url: 'https://media.giphy.com/media/d2YWTOsVtuHgOHhC/giphy.gif', preview: 'https://media.giphy.com/media/d2YWTOsVtuHgOHhC/giphy.gif' },
    { id: 'ani-3', title: 'Cielo Estrellado Anime', url: 'https://media.giphy.com/media/10hzvF9FTQNxTO/giphy.gif', preview: 'https://media.giphy.com/media/10hzvF9FTQNxTO/giphy.gif' },
    { id: 'ani-4', title: 'Cerezos en Flor', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  ],
  Cyberpunk: [
    { id: 'cp-1', title: 'Tokyo Neon City', url: 'https://media.giphy.com/media/3o7TKTDnUxE0gpn344/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKTDnUxE0gpn344/giphy.gif' },
    { id: 'cp-2', title: 'Synthwave Grid Sunset', url: 'https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif', preview: 'https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif' },
    { id: 'cp-3', title: 'Cyber Matrix Terminal', url: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif', preview: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif' },
    { id: 'cp-4', title: 'Neon Rain Lofi', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', preview: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
  ],
  Coding: [
    { id: 'code-1', title: 'Programando en Terminal', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif', preview: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
    { id: 'code-2', title: 'Código Matrix en Pantalla', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', preview: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
    { id: 'code-3', title: 'Desarrollador enfocado', url: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif', preview: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif' },
  ],
  Aesthetic: [
    { id: 'aes-1', title: 'Nubes Rosas Atardecer', url: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif', preview: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif' },
    { id: 'aes-2', title: 'Olas de Mar Pastel', url: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif', preview: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif' },
    { id: 'aes-3', title: 'Destellos y Estrellas', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', preview: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif' },
    { id: 'aes-4', title: 'Luna de Ensueño', url: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif', preview: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif' },
  ],
  PixelArt: [
    { id: 'pix-1', title: 'Pixel City Skyline', url: 'https://media.giphy.com/media/l3vR16pONsV8cK36w/giphy.gif', preview: 'https://media.giphy.com/media/l3vR16pONsV8cK36w/giphy.gif' },
    { id: 'pix-2', title: 'Fogata 8-bit Noche', url: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif' },
    { id: 'pix-3', title: 'Viaje Espacial Pixel', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  ],
  Nature: [
    { id: 'nat-1', title: 'Cascada en el Bosque', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', preview: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
    { id: 'nat-2', title: 'Aurora Boreal Nórdica', url: 'https://media.giphy.com/media/3o84sq21TxDH6PyYms/giphy.gif', preview: 'https://media.giphy.com/media/3o84sq21TxDH6PyYms/giphy.gif' },
    { id: 'nat-3', title: 'Olas del Océano Anochecer', url: 'https://media.giphy.com/media/3o7rc0qU6b5dUmpkJ2/giphy.gif', preview: 'https://media.giphy.com/media/3o7rc0qU6b5dUmpkJ2/giphy.gif' },
  ],
};

// Gradientes de color Mesh y Aurora
export const GRADIENT_COLLECTIONS = [
  { id: 'grad-1', name: 'Sunset Aurora', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80' },
  { id: 'grad-2', name: 'Cosmic Nebula', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80' },
  { id: 'grad-3', name: 'Cyber Grid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&q=80' },
  { id: 'grad-4', name: 'Emerald Wave', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&q=80' },
  { id: 'grad-5', name: 'Warm Prism', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300&q=80' },
  { id: 'grad-6', name: 'Minimal Dark Sand', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', preview: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80' },
];

/**
 * Busca GIFs animados oficiales con GIPHY en tiempo real
 */
export const searchGifs = async (query = '', limit = 24) => {
  const trimmed = query.trim();
  const apiKey = import.meta.env?.VITE_GIPHY_API_KEY || DEFAULT_GIPHY_KEY;

  // 1. Consulta en vivo a la API oficial de GIPHY
  try {
    const endpoint = trimmed
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(trimmed)}&limit=${limit}&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`;

    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item) => ({
          id: item.id,
          title: item.title || 'GIF animado',
          url: item.images?.original?.url || item.images?.downsized_medium?.url || item.images?.fixed_height?.url,
          preview: item.images?.fixed_height?.url || item.images?.downsized_small?.url || item.images?.original?.url,
          width: item.images?.original?.width,
          height: item.images?.original?.height,
        }));
      }
    }
  } catch (err) {
    console.warn('GIPHY API request failed, falling back to curated list:', err);
  }

  // 2. Filtrado en colecciones curadas
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    const matches = [];
    Object.entries(CURATED_GIF_COLLECTIONS).forEach(([category, list]) => {
      list.forEach((item) => {
        if (item.title.toLowerCase().includes(lower) || category.toLowerCase().includes(lower)) {
          matches.push(item);
        }
      });
    });
    if (matches.length > 0) return matches;
  }

  return Object.values(CURATED_GIF_COLLECTIONS).flat();
};

/**
 * Busca fotos y fondos en tiempo real con Openverse API (millones de imágenes reales para cualquier término)
 */
export const searchPhotos = async (query = 'aesthetic wallpaper', limit = 24) => {
  const trimmed = query.trim() || 'aesthetic wallpaper';

  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(trimmed)}&page_size=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item) => ({
          id: item.id,
          title: item.title || 'Foto de portada',
          url: item.url,
          preview: item.thumbnail || item.url,
        }));
      }
    }
  } catch (err) {
    console.warn('Openverse live photo search failed:', err);
  }

  return GRADIENT_COLLECTIONS;
};
