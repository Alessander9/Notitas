// Generative Mesh Gradient Utility
// Produces aesthetic, multi-layered mesh gradients based on any seed string (title, id, emoji, etc.)

const PALETTES = [
  // 0. Emerald Aurora (Brand Signature)
  {
    c1: '#064e3b',
    c2: '#047857',
    c3: '#10b981',
    c4: '#34d399',
    accent: '#6ee7b7',
  },
  // 1. Velvet Violet & Indigo
  {
    c1: '#1e1b4b',
    c2: '#4338ca',
    c3: '#7c3aed',
    c4: '#8b5cf6',
    accent: '#c084fc',
  },
  // 2. Oceanic Azure
  {
    c1: '#082f49',
    c2: '#0369a1',
    c3: '#0ea5e9',
    c4: '#14b8a6',
    accent: '#38bdf8',
  },
  // 3. Sunset Amber & Rose
  {
    c1: '#431407',
    c2: '#c2410c',
    c3: '#ea580c',
    c4: '#f59e0b',
    accent: '#fde047',
  },
  // 4. Midnight Ruby & Coral
  {
    c1: '#4c0519',
    c2: '#9f1239',
    c3: '#e11d48',
    c4: '#f43f5e',
    accent: '#fda4af',
  },
  // 5. Cyber Cyan & Cobalt
  {
    c1: '#083344',
    c2: '#0e7490',
    c3: '#06b6d4',
    c4: '#3b82f6',
    accent: '#67e8f9',
  },
  // 6. Amethyst & Twilight
  {
    c1: '#3b0764',
    c2: '#6b21a8',
    c3: '#a855f7',
    c4: '#ec4899',
    accent: '#f472b6',
  },
  // 7. Forest Jade
  {
    c1: '#022c22',
    c2: '#115e59',
    c3: '#0d9488',
    c4: '#2dd4bf',
    accent: '#5eead4',
  },
];

function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a CSS style object or background string with a rich multi-stop generative mesh gradient.
 */
export function getGenerativeGradient(seed = 'notitas') {
  const hash = hashString(String(seed));
  const palette = PALETTES[hash % PALETTES.length];
  const angle = 110 + (hash % 140);
  const orbX1 = 15 + ((hash * 7) % 50);
  const orbY1 = 20 + ((hash * 13) % 40);
  const orbX2 = 60 + ((hash * 19) % 35);
  const orbY2 = 65 + ((hash * 23) % 30);

  const background = `radial-gradient(circle at ${orbX1}% ${orbY1}%, ${palette.c3}cc 0%, transparent 60%), radial-gradient(circle at ${orbX2}% ${orbY2}%, ${palette.c4}b3 0%, transparent 55%), radial-gradient(circle at 50% 100%, ${palette.accent}40 0%, transparent 45%), linear-gradient(${angle}deg, ${palette.c1} 0%, ${palette.c2} 55%, ${palette.c1} 100%)`;

  return {
    background,
    palette,
  };
}
