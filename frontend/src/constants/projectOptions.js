export const COLOR_OPTIONS = [
  // Violetas
  '#845EC2', '#6a4aa3', '#B39CD0', '#A855F7', '#7C3AED',
  // Azules
  '#6366F1', '#296073', '#3596B5', '#3B82F6', '#0EA5E9', '#ADC5CF',
  // Verdes
  '#386c5f', '#6a968c', '#264e44', '#10B981', '#22C55E', '#84CC16',
  // Cálidos
  '#F59E0B', '#F97316', '#E63946', '#EC4899', '#F472B6',
  // Neutros
  '#92400E', '#6B7280', '#475569', '#0F172A',
];

export const ICON_OPTIONS = [
  { id: 'folder', label: 'Carpeta', icon: '📁' },
  { id: 'code', label: 'Código', icon: '💻' },
  { id: 'rocket', label: 'Proyecto', icon: '🚀' },
  { id: 'book', label: 'Estudios', icon: '📚' },
  { id: 'work', label: 'Trabajo', icon: '💼' },
  { id: 'palette', label: 'Diseño', icon: '🎨' },
  { id: 'bolt', label: 'Ideas', icon: '⚡' },
  { id: 'brain', label: 'IA / Mente', icon: '🧠' },
  { id: 'coffee', label: 'Personal', icon: '☕' },
  { id: 'science', label: 'Ciencia', icon: '🔬' },
  { id: 'game', label: 'Juegos', icon: '🎮' },
  { id: 'security', label: 'Seguridad', icon: '🔒' },
  { id: 'web', label: 'Web', icon: '🌐' },
  { id: 'globe', label: 'Mundo', icon: '🌎' },
  { id: 'star', label: 'Estrella', icon: '⭐' },
  { id: 'heart', label: 'Salud', icon: '❤️' },
  { id: 'music', label: 'Música', icon: '🎵' },
  { id: 'chart', label: 'Gráfico', icon: '📈' },
  { id: 'cloud', label: 'Nube', icon: '☁️' },
  { id: 'lightbulb', label: 'Ideas', icon: '💡' },
  { id: 'graduation', label: 'Educación', icon: '🎓' },
  { id: 'database', label: 'Base de Datos', icon: '🗄️' },
  { id: 'key', label: 'Claves', icon: '🔑' },
  { id: 'wrench', label: 'Herramientas', icon: '🛠️' },
  { id: 'home', label: 'Hogar', icon: '🏠' },
  { id: 'shopping', label: 'Compras', icon: '🛒' },
  { id: 'calendar', label: 'Calendario', icon: '📅' },
  { id: 'trophy', label: 'Logros', icon: '🏆' },
  { id: 'target', label: 'Objetivos', icon: '🎯' },
  { id: 'terminal', label: 'Consola', icon: '📟' },
  { id: 'weather', label: 'Clima', icon: '🌧️' },
  { id: 'pin', label: 'Fijados', icon: '📌' },
  { id: 'dollar', label: 'Finanzas', icon: '💵' },
  { id: 'meditation', label: 'Salud Mental', icon: '🧘' },
  { id: 'gift', label: 'Especial', icon: '🎁' },
];

export const getProjectIcon = (iconId) => {
  const found = ICON_OPTIONS.find((opt) => opt.id === iconId);
  return found ? found.icon : '📁';
};
