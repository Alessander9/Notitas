import JSZip from 'jszip';
import api from '../services/api';
import { htmlToMarkdown } from './exportNote';

/**
 * Generates and downloads a complete .zip backup of all user projects and notes formatted in Markdown.
 */
export async function exportWorkspaceBackup() {
  const zip = new JSZip();

  // 1. Obtener todos los proyectos
  const projectsRes = await api.get('/projects');
  const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];

  // 2. Iterar cada proyecto y obtener sus notas
  for (const project of projects) {
    const cleanProjectName = (project.name || `Proyecto_${project.id}`).replace(/[/\\?%*:|"<>]/g, '-');
    const projectFolder = zip.folder(cleanProjectName);

    try {
      const notesRes = await api.get(`/notes/project/${project.id}`);
      const notes = Array.isArray(notesRes.data) ? notesRes.data : [];

      for (const note of notes) {
        const cleanNoteTitle = (note.title || `Nota_${note.id}`).replace(/[/\\?%*:|"<>]/g, '-');
        const mdContent = `# ${note.title || 'Sin título'}\n\n**Fecha:** ${new Date(note.updatedAt || note.createdAt).toLocaleDateString()}\n**Etiquetas:** ${(note.tags || []).join(', ')}\n\n---\n\n${htmlToMarkdown(note.content || '')}`;
        projectFolder.file(`${cleanNoteTitle}.md`, mdContent);
      }
    } catch (err) {
      console.error(`Error exporting notes for project ${project.id}:`, err);
    }
  }

  // 3. Obtener notas favoritas / generales
  try {
    const favRes = await api.get('/notes/favorites');
    const favNotes = Array.isArray(favRes.data) ? favRes.data : [];
    const favFolder = zip.folder('Favoritas');

    for (const note of favNotes) {
      const cleanNoteTitle = (note.title || `Nota_${note.id}`).replace(/[/\\?%*:|"<>]/g, '-');
      const mdContent = `# ${note.title || 'Sin título'}\n\n**Fecha:** ${new Date(note.updatedAt || note.createdAt).toLocaleDateString()}\n**Etiquetas:** ${(note.tags || []).join(', ')}\n\n---\n\n${htmlToMarkdown(note.content || '')}`;
      favFolder.file(`${cleanNoteTitle}.md`, mdContent);
    }
  } catch {
    // Si no hay favoritas o falla, continuar
  }

  // 4. Generar archivo .zip y disparar descarga en el navegador
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Notitas_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
