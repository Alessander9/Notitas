import { query } from '../config/db.js';

const MAX_NOTES = 40;
const MAX_NOTE_CHARS = 1200;

const stripHtml = (html = '') =>
  String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Detecta si el texto menciona alguno de los proyectos del usuario.
 * Devuelve el proyecto con el nombre más largo que coincida (mejor match).
 */
export const findProjectByMessage = (text, userProjects = []) => {
  if (!text || !Array.isArray(userProjects) || userProjects.length === 0) return null;
  const haystack = String(text).toLowerCase();
  let best = null;
  for (const p of userProjects) {
    const name = String(p?.name || '').toLowerCase().trim();
    if (!name) continue;
    if (haystack.includes(name)) {
      if (!best || name.length > best.name.length) {
        best = { id: p.id, name: p.name };
      }
    }
  }
  return best;
};

/**
 * Construye un "dossier" legible del proyecto: datos generales, estadísticas
 * y el contenido (texto plano, truncado) de sus notas activas.
 * Devuelve null si el usuario no tiene acceso al proyecto.
 */
export const buildProjectDossier = async (projectId, userId) => {
  const pid = Number(projectId);
  const uid = Number(userId);
  if (isNaN(pid) || isNaN(uid)) return null;

  const projRes = await query(`
    SELECT p.id, p.name, p.description, p.icon, p.color, p.user_id
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
    WHERE p.id = $1 AND (p.user_id = $2 OR pm.user_id = $2)
  `, [pid, uid]);

  if (projRes.rows.length === 0) return null;
  const project = projRes.rows[0];

  const notesRes = await query(`
    SELECT n.id, n.title, n.content, n.archived, n.favorite, n.updated_at,
           COALESCE(array_agg(nt.tag ORDER BY nt.tag) FILTER (WHERE nt.tag IS NOT NULL), '{}') AS tags
    FROM notes n
    LEFT JOIN note_tags nt ON nt.note_id = n.id
    WHERE n.project_id = $1 AND n.deleted = false
    GROUP BY n.id
    ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    LIMIT $2
  `, [pid, MAX_NOTES]);

  const notes = notesRes.rows.map((n) => ({
    id: Number(n.id),
    title: n.title || 'Sin título',
    tags: Array.isArray(n.tags) ? n.tags : [],
    archived: Boolean(n.archived),
    favorite: Boolean(n.favorite),
    updatedAt: n.updated_at,
    content: stripHtml(n.content).slice(0, MAX_NOTE_CHARS),
  }));

  const activeNotes = notes.filter((n) => !n.archived);
  const totalWords = activeNotes.reduce((sum, n) => sum + n.content.split(/\s+/).filter(Boolean).length, 0);

  return {
    id: pid,
    name: project.name,
    description: project.description || '',
    icon: project.icon,
    color: project.color,
    isOwner: Number(project.user_id) === uid,
    stats: {
      noteCount: notes.length,
      activeCount: activeNotes.length,
      totalWords,
    },
    notes,
  };
};
