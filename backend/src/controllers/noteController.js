import crypto from 'crypto';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

// Helper para formatear una nota completa con tags, attachments y miembros
const formatNoteResponse = async (note) => {
  const noteId = note.id;

  // Obtener tags
  const tagsRes = await query('SELECT tag FROM note_tags WHERE note_id = $1', [noteId]);
  const tags = tagsRes.rows.map((r) => r.tag);

  // Obtener attachments
  const attachRes = await query('SELECT id, url, type, name, tag FROM attachments WHERE note_id = $1', [noteId]);
  const attachments = attachRes.rows.map((a) => ({
    id: Number(a.id),
    url: a.url,
    type: a.type,
    name: a.name,
    tag: a.tag,
  }));

  // Obtener note_members
  const membersRes = await query(`
    SELECT u.id, u.name, u.email, u.avatar, nm.role 
    FROM note_members nm
    JOIN users u ON u.id = nm.user_id
    WHERE nm.note_id = $1
  `, [noteId]);

  const noteMembers = membersRes.rows.map((m) => ({
    id: Number(m.id),
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    role: m.role || 'EDITOR',
  }));

  return {
    id: Number(note.id),
    projectId: Number(note.project_id),
    title: note.title || '',
    content: note.content || '',
    coverImage: note.cover_image,
    favorite: Boolean(note.favorite),
    archived: Boolean(note.archived),
    deleted: Boolean(note.deleted),
    shareToken: note.share_token,
    tags,
    attachments,
    noteMembers,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    updatedBy: note.updated_by ? Number(note.updated_by) : null,
  };
};

// Helper de validación de acceso a una nota
const checkNoteAccess = async (noteId, userId, requireEdit = false) => {
  const result = await query(`
    SELECT n.*, p.user_id as project_owner_id, pm.role as project_role, nm.role as note_role
    FROM notes n
    JOIN projects p ON p.id = n.project_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
    LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $2
    WHERE n.id = $1
  `, [noteId, userId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const isOwner = Number(row.project_owner_id) === Number(userId);
  const isProjectEditor = row.project_role === 'EDITOR' || row.project_role === 'OWNER';
  const isNoteEditor = row.note_role === 'EDITOR';
  const isViewer = row.project_role === 'VIEWER' || row.note_role === 'VIEWER';

  if (!isOwner && !isProjectEditor && !isNoteEditor && !isViewer) {
    return null; // Sin acceso
  }

  if (requireEdit && isViewer && !isOwner && !isProjectEditor && !isNoteEditor) {
    return 'FORBIDDEN';
  }

  return row;
};

export const getNotesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Validar acceso al proyecto
    const projCheck = await query(`
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1 AND (p.user_id = $2 OR pm.user_id = $2)
    `, [projectId, userId]);

    if (projCheck.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes acceso a este proyecto' });
    }

    const result = await query(`
      SELECT * FROM notes 
      WHERE project_id = $1 AND deleted = false AND archived = false
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    `, [projectId]);

    const formatted = await Promise.all(result.rows.map((n) => formatNoteResponse(n)));
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $1
      WHERE (p.user_id = $1 OR pm.user_id = $1 OR nm.user_id = $1)
        AND n.favorite = true AND n.deleted = false
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await Promise.all(result.rows.map((n) => formatNoteResponse(n)));
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getArchived = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $1
      WHERE (p.user_id = $1 OR pm.user_id = $1 OR nm.user_id = $1)
        AND n.archived = true AND n.deleted = false
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await Promise.all(result.rows.map((n) => formatNoteResponse(n)));
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getTrash = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE p.user_id = $1 AND n.deleted = true
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await Promise.all(result.rows.map((n) => formatNoteResponse(n)));
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const searchNotes = async (req, res, next) => {
  try {
    const { query: searchTerm = '' } = req.query;
    const userId = req.user.id;

    if (!searchTerm.trim()) {
      return res.status(200).json([]);
    }

    const pattern = `%${searchTerm.toLowerCase()}%`;
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $1
      LEFT JOIN note_tags nt ON nt.note_id = n.id
      WHERE (p.user_id = $1 OR pm.user_id = $1 OR nm.user_id = $1)
        AND n.deleted = false
        AND (
          LOWER(n.title) LIKE $2
          OR LOWER(n.content) LIKE $2
          OR LOWER(nt.tag) LIKE $2
        )
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId, pattern]);

    const formatted = await Promise.all(result.rows.map((n) => formatNoteResponse(n)));
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId);
    if (!access) {
      return res.status(404).json({ message: 'Nota no encontrada o sin permisos' });
    }

    const formatted = await formatNoteResponse(access);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { projectId, title, content, coverImage, favorite, archived, tags = [] } = req.body;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ message: 'El ID de proyecto es obligatorio' });
    }

    // Validar permiso de creación en el proyecto
    const projCheck = await query(`
      SELECT p.id FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1 AND (p.user_id = $2 OR (pm.user_id = $2 AND pm.role != 'VIEWER'))
    `, [projectId, userId]);

    if (projCheck.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes permisos para crear notas en este proyecto' });
    }

    const shareToken = crypto.randomBytes(16).toString('hex');
    const result = await query(`
      INSERT INTO notes (project_id, title, content, cover_image, favorite, archived, deleted, share_token, updated_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, NOW(), NOW())
      RETURNING *
    `, [projectId, title || '', content || '', coverImage || null, Boolean(favorite), Boolean(archived), shareToken, userId]);

    const newNote = result.rows[0];

    // Insertar tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        if (tag && tag.trim()) {
          await query('INSERT INTO note_tags (note_id, tag) VALUES ($1, $2)', [newNote.id, tag.trim()]);
        }
      }
    }

    // Guardar versión inicial
    await query(`
      INSERT INTO note_versions (note_id, title, content, updated_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [newNote.id, newNote.title, newNote.content, userId]);

    const formatted = await formatNoteResponse(newNote);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, coverImage, favorite, archived, tags } = req.body;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Permiso de edición denegado' });

    // Guardar versión anterior si cambió título o contenido
    if (
      (title !== undefined && title !== access.title) ||
      (content !== undefined && content !== access.content)
    ) {
      await query(`
        INSERT INTO note_versions (note_id, title, content, updated_by, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [id, access.title || '', access.content || '', access.updated_by || userId]);
    }

    const newTitle = title !== undefined ? title : access.title;
    const newContent = content !== undefined ? content : access.content;
    const newCover = coverImage !== undefined ? coverImage : access.cover_image;
    const newFav = favorite !== undefined ? Boolean(favorite) : access.favorite;
    const newArch = archived !== undefined ? Boolean(archived) : access.archived;

    const result = await query(`
      UPDATE notes 
      SET title = $1, content = $2, cover_image = $3, favorite = $4, archived = $5, updated_by = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [newTitle, newContent, newCover, newFav, newArch, userId, id]);

    // Actualizar tags si se enviaron
    if (Array.isArray(tags)) {
      await query('DELETE FROM note_tags WHERE note_id = $1', [id]);
      for (const tag of tags) {
        if (tag && tag.trim()) {
          await query('INSERT INTO note_tags (note_id, tag) VALUES ($1, $2)', [id, tag.trim()]);
        }
      }
    }

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Permiso denegado' });

    // Soft delete (mover a papelera)
    await query('UPDATE notes SET deleted = true, updated_at = NOW() WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Nota enviada a la papelera' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotePermanent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    // Eliminar portada y adjuntos de Cloudinary
    if (access.cover_image && access.cover_image.includes('cloudinary.com')) {
      deleteFromCloudinary(access.cover_image);
    }

    const attachRes = await query('SELECT url FROM attachments WHERE note_id = $1', [id]);
    for (const row of attachRes.rows) {
      if (row.url && row.url.includes('cloudinary.com')) {
        deleteFromCloudinary(row.url);
      }
    }

    await query('DELETE FROM attachments WHERE note_id = $1', [id]);
    await query('DELETE FROM note_tags WHERE note_id = $1', [id]);
    await query('DELETE FROM comments WHERE note_id = $1', [id]);
    await query('DELETE FROM note_members WHERE note_id = $1', [id]);
    await query('DELETE FROM note_versions WHERE note_id = $1', [id]);
    await query('DELETE FROM notes WHERE id = $1', [id]);

    return res.status(200).json({ message: 'Nota eliminada permanentemente' });
  } catch (error) {
    next(error);
  }
};

export const restoreNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const result = await query(`
      UPDATE notes SET deleted = false, archived = false, updated_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const result = await query(`
      UPDATE notes SET favorite = NOT favorite, updated_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const archiveNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const result = await query(`
      UPDATE notes SET archived = true, updated_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const uploadNoteCover = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const oldCover = access.cover_image;

    // Subida a Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'notitas/covers/notes',
      transformation: [
        { width: 1200, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    const newCoverUrl = uploadResult.secure_url;
    const result = await query('UPDATE notes SET cover_image = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [newCoverUrl, id]);

    if (oldCover && oldCover.includes('cloudinary.com')) {
      deleteFromCloudinary(oldCover);
    }

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const addAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, tag } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    // Subir a Cloudinary
    const isImage = req.file.mimetype.startsWith('image/');
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'notitas/attachments',
      resourceType: isImage ? 'image' : 'raw',
    });

    const fileUrl = uploadResult.secure_url;
    const fileName = name || req.file.originalname || 'Adjunto';
    const fileType = req.file.mimetype || 'application/octet-stream';

    const result = await query(`
      INSERT INTO attachments (note_id, url, type, name, tag)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, fileUrl, fileType, fileName, tag || null]);

    const attach = result.rows[0];
    return res.status(200).json({
      id: Number(attach.id),
      url: attach.url,
      type: attach.type,
      name: attach.name,
      tag: attach.tag,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const attachRes = await query('SELECT * FROM attachments WHERE id = $1 AND note_id = $2', [attachmentId, id]);
    if (attachRes.rows.length === 0) {
      return res.status(404).json({ message: 'Adjunto no encontrado' });
    }

    const attach = attachRes.rows[0];
    if (attach.url && attach.url.includes('cloudinary.com')) {
      deleteFromCloudinary(attach.url);
    }

    await query('DELETE FROM attachments WHERE id = $1', [attachmentId]);
    return res.status(200).json({ message: 'Adjunto eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const result = await query(`
      SELECT v.*, u.name as user_name, u.email as user_email
      FROM note_versions v
      LEFT JOIN users u ON u.id = v.updated_by
      WHERE v.note_id = $1
      ORDER BY v.created_at DESC
    `, [id]);

    const versions = result.rows.map((v) => ({
      id: Number(v.id),
      noteId: Number(v.note_id),
      title: v.title,
      content: v.content,
      updatedBy: v.updated_by ? Number(v.updated_by) : null,
      userName: v.user_name || 'Usuario',
      createdAt: v.created_at,
    }));

    return res.status(200).json(versions);
  } catch (error) {
    next(error);
  }
};

export const restoreVersion = async (req, res, next) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const verRes = await query('SELECT * FROM note_versions WHERE id = $1 AND note_id = $2', [versionId, id]);
    if (verRes.rows.length === 0) {
      return res.status(404).json({ message: 'Versión no encontrada' });
    }

    const version = verRes.rows[0];

    // Guardar versión actual antes de restaurar
    await query(`
      INSERT INTO note_versions (note_id, title, content, updated_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [id, access.title || '', access.content || '', userId]);

    // Aplicar versión
    const updateRes = await query(`
      UPDATE notes SET title = $1, content = $2, updated_by = $3, updated_at = NOW() WHERE id = $4 RETURNING *
    `, [version.title || '', version.content || '', userId, id]);

    const formatted = await formatNoteResponse(updateRes.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getPublicSharedNote = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await query('SELECT * FROM notes WHERE share_token = $1 AND deleted = false', [token]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nota compartida no encontrada o enlace revocado' });
    }

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};
