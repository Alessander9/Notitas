// Servicio para buscar y obtener GIFs animados con GIPHY y colecciones seleccionadas

// Colecciones de GIFs estéticos en bucle asegurados (Lofi, Anime, Cyberpunk, Pixel Art, Naturaleza, Minimal)
export const CURATED_GIF_COLLECTIONS = {
  Lofi: [
    { id: 'lofi-1', title: 'Lofi Room Rain', url: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0A/giphy.gif', preview: 'https://media.giphy.com/media/LmN8OYiY4m0X85al0A/giphy.gif' },
    { id: 'lofi-2', title: 'Cozy Coffee Reading', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', preview: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif' },
    { id: 'lofi-3', title: 'Sunset City Train', url: 'https://media.giphy.com/media/l41JRsph73VokN6ik/giphy.gif', preview: 'https://media.giphy.com/media/l41JRsph73VokN6ik/giphy.gif' },
    { id: 'lofi-4', title: 'Night Coding Cafe', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', preview: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
    { id: 'lofi-5', title: 'Cat on Window Rain', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif', preview: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
    { id: 'lofi-6', title: 'Retro Studio Vibes', url: 'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif', preview: 'https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif' },
  ],
  Cyberpunk: [
    { id: 'cp-1', title: 'Neon Tokyo Alley', url: 'https://media.giphy.com/media/3o7TKTDnUxE0gpn344/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKTDnUxE0gpn344/giphy.gif' },
    { id: 'cp-2', title: 'Futuristic Grid Synthwave', url: 'https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif', preview: 'https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif' },
    { id: 'cp-3', title: 'Hacker Terminal Data', url: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif', preview: 'https://media.giphy.com/media/ule4akeEDWA0WlfAOo/giphy.gif' },
    { id: 'cp-4', title: 'Neon Rain Drive', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', preview: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
  ],
  Aesthetic: [
    { id: 'aes-1', title: 'Pink Clouds Sunset', url: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif', preview: 'https://media.giphy.com/media/5wWf7H0qoWaNnkZBucU/giphy.gif' },
    { id: 'aes-2', title: 'Pastel Waves Ocean', url: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif', preview: 'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif' },
    { id: 'aes-3', title: 'Sparkle Vintage Stars', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', preview: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif' },
    { id: 'aes-4', title: 'Dreamy Moon Night', url: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif', preview: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif' },
  ],
  Anime: [
    { id: 'ani-1', title: 'Ghibli Cooking Food', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif' },
    { id: 'ani-2', title: 'Train Window Scenery', url: 'https://media.giphy.com/media/d2YWTOsVtuHgOHhC/giphy.gif', preview: 'https://media.giphy.com/media/d2YWTOsVtuHgOHhC/giphy.gif' },
    { id: 'ani-3', title: 'Stargazing Hills', url: 'https://media.giphy.com/media/10hzvF9FTQNxTO/giphy.gif', preview: 'https://media.giphy.com/media/10hzvF9FTQNxTO/giphy.gif' },
    { id: 'ani-4', title: 'Cherry Blossom Breeze', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
  ],
  PixelArt: [
    { id: 'pix-1', title: 'Pixel City Skyline', url: 'https://media.giphy.com/media/l3vR16pONsV8cK36w/giphy.gif', preview: 'https://media.giphy.com/media/l3vR16pONsV8cK36w/giphy.gif' },
    { id: 'pix-2', title: '8-bit Bonfire Night', url: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif' },
    { id: 'pix-3', title: 'Pixel Space Journey', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  ],
  Nature: [
    { id: 'nat-1', title: 'Forest Waterfall Loop', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', preview: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
    { id: 'nat-2', title: 'Calm Northern Lights Aurora', url: 'https://media.giphy.com/media/3o84sq21TxDH6PyYms/giphy.gif', preview: 'https://media.giphy.com/media/3o84sq21TxDH6PyYms/giphy.gif' },
    { id: 'nat-3', title: 'Ocean Waves Twilight', url: 'https://media.giphy.com/media/3o7rc0qU6b5dUmpkJ2/giphy.gif', preview: 'https://media.giphy.com/media/3o7rc0qU6b5dUmpkJ2/giphy.gif' },
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
 * Busca GIFs animados en GIPHY con fallback automático
 */
export const searchGifs = async (query = '', limit = 24) => {
  const trimmed = query.trim();

  try {
    const endpoint = trimmed
      ? `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(trimmed)}&limit=${limit}&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=${limit}&rating=g`;

    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item) => ({
          id: item.id,
          title: item.title || 'GIF animado',
          url: item.images?.original?.url || item.images?.downsized?.url || item.images?.fixed_height?.url,
          preview: item.images?.fixed_height?.url || item.images?.original?.url,
          width: item.images?.original?.width,
          height: item.images?.original?.height,
        }));
      }
    }
  } catch (err) {
    // Si la API remota falla o es bloqueada por el navegador/adblock, usar fallback local
  }

  // Fallback con colecciones curadas
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
