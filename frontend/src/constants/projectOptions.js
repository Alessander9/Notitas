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

export const PROJECT_TEMPLATES = [
  { id: 'none', label: 'Sin plantilla', notes: [] },
  {
    id: 'sprint',
    label: 'Sprint de desarrollo',
    notes: [
      { title: 'Backlog del Sprint', content: '<h2>Objetivos del Sprint</h2><ul><li>Definir objetivos</li></ul><p></p>' },
      { title: 'Daily Standup', content: '<h2>Que hice ayer?</h2><p></p><h2>Que hare hoy?</h2><p></p><h2>Hay bloqueos?</h2><p></p>' },
      { title: 'Retrospectiva', content: '<h2>Que salio bien?</h2><p></p><h2>Que mejorar?</h2><p></p><h2>Acciones</h2><ul><li>Accion 1</li></ul>' },
    ],
  },
  {
    id: 'editorial',
    label: 'Proyecto Editorial',
    notes: [
      { title: 'Ideas de contenido', content: '<h2>Ideas</h2><ul><li>Idea 1</li><li>Idea 2</li></ul>' },
      { title: 'Borrador', content: '<h2>Titulo tentativo</h2><p>Introduce el tema aqui...</p>' },
      { title: 'Calendario editorial', content: '<h2>Publicaciones planificadas</h2><ul><li>Semana 1</li><li>Semana 2</li></ul>' },
    ],
  },
];
