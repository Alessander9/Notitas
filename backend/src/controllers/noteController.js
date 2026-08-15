import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

// Helper para formatear notas en lote con solo 3 consultas a la BD (evita saturación del connection pool)
export const formatNotesBulk = async (notes) => {
  if (!notes || !Array.isArray(notes) || notes.length === 0) return [];
  const noteIds = notes.map((n) => Number(n.id)).filter((id) => !isNaN(id) && id > 0);
  if (noteIds.length === 0) return [];

  // 1 consulta para todos los tags
  let tagsByNote = {};
  try {
    const tagsRes = await query(
      'SELECT note_id, tag FROM note_tags WHERE note_id = ANY($1)',
      [noteIds]
    );
    tagsRes.rows.forEach((r) => {
      const nid = Number(r.note_id);
      if (!tagsByNote[nid]) tagsByNote[nid] = [];
      tagsByNote[nid].push(r.tag);
    });
  } catch (e) {
    console.error('Error fetching tags in bulk', e);
  }

  // 1 consulta para todos los attachments
  let attachByNote = {};
  try {
    const attachRes = await query(
      'SELECT id, note_id, url, type, name, tag FROM attachments WHERE note_id = ANY($1)',
      [noteIds]
    );
    attachRes.rows.forEach((a) => {
      const nid = Number(a.note_id);
      if (!attachByNote[nid]) attachByNote[nid] = [];
      attachByNote[nid].push({
        id: Number(a.id),
        url: a.url,
        type: a.type,
        name: a.name,
        tag: a.tag,
      });
    });
  } catch (e) {
    console.error('Error fetching attachments in bulk', e);
  }

  // 1 consulta para todos los miembros colaboradores
  let membersByNote = {};
  try {
    const membersRes = await query(`
      SELECT nm.note_id, u.id, u.name, u.email, u.avatar, nm.role 
      FROM note_members nm
      JOIN users u ON u.id = nm.user_id
      WHERE nm.note_id = ANY($1)
    `, [noteIds]);
    membersRes.rows.forEach((m) => {
      const nid = Number(m.note_id);
      if (!membersByNote[nid]) membersByNote[nid] = [];
      membersByNote[nid].push({
        id: Number(m.id),
        userId: Number(m.id),
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        role: m.role || 'EDITOR',
      });
    });
  } catch (e) {
    console.error('Error fetching note members in bulk', e);
  }

  return notes.map((note) => {
    const nid = Number(note.id);
    return {
      id: nid,
      projectId: Number(note.project_id),
      title: note.title || '',
      content: note.content || '',
      coverImage: note.cover_image,
      icon: note.icon || null,
      favorite: Boolean(note.favorite),
      archived: Boolean(note.archived),
      deleted: Boolean(note.deleted),
      shareToken: note.share_token,
      hasPin: Boolean(note.pin_hash),
      isLocked: Boolean(note.is_locked || note.pin_hash),
      tags: tagsByNote[nid] || [],
      attachments: attachByNote[nid] || [],
      noteMembers: membersByNote[nid] || [],
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      updatedBy: note.updated_by ? Number(note.updated_by) : null,
    };
  });
};

const formatNoteResponse = async (note) => {
  if (!note) return null;
  const list = await formatNotesBulk([note]);
  return list[0] || null;
};

const paginateResults = (items, pageParam, sizeParam) => {
  const page = Math.max(0, parseInt(pageParam, 10) || 0);
  const size = Math.max(1, parseInt(sizeParam, 10) || (pageParam !== undefined ? 40 : items.length || 40));
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / size) || 1;
  const start = page * size;
  const content = items.slice(start, start + size);
  return {
    content,
    totalElements,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  };
};

// Helper de validación de acceso a una nota
const checkNoteAccess = async (noteId, userId, requireEdit = false) => {
  const nId = Number(noteId);
  const uId = Number(userId);
  if (isNaN(nId) || isNaN(uId)) return null;

  const result = await query(`
    SELECT n.*, p.user_id as project_owner_id, pm.role as project_role, nm.role as note_role
    FROM notes n
    JOIN projects p ON p.id = n.project_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
    LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $2
    WHERE n.id = $1
  `, [nId, uId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const isOwner = Number(row.project_owner_id) === uId;
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
    const rawProjectId = req.params.projectId || req.params.id;
    const projectId = Number(rawProjectId);
    const userId = Number(req.user.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'ID de proyecto no válido' });
    }

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

    const formatted = await formatNotesBulk(result.rows);
    return res.status(200).json(paginateResults(formatted, req.query.page, req.query.size));
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $1
      WHERE (p.user_id = $1 OR pm.user_id = $1 OR nm.user_id = $1)
        AND n.favorite = true AND n.deleted = false
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await formatNotesBulk(result.rows);
    return res.status(200).json(paginateResults(formatted, req.query.page, req.query.size));
  } catch (error) {
    next(error);
  }
};

export const getArchived = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN note_members nm ON nm.note_id = n.id AND nm.user_id = $1
      WHERE (p.user_id = $1 OR pm.user_id = $1 OR nm.user_id = $1)
        AND n.archived = true AND n.deleted = false
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await formatNotesBulk(result.rows);
    return res.status(200).json(paginateResults(formatted, req.query.page, req.query.size));
  } catch (error) {
    next(error);
  }
};

export const getTrash = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);
    const result = await query(`
      SELECT DISTINCT n.* FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE p.user_id = $1 AND n.deleted = true
      ORDER BY n.updated_at DESC NULLS LAST, n.created_at DESC
    `, [userId]);

    const formatted = await formatNotesBulk(result.rows);
    return res.status(200).json(paginateResults(formatted, req.query.page, req.query.size));
  } catch (error) {
    next(error);
  }
};

export const searchNotes = async (req, res, next) => {
  try {
    const { query: searchTerm = '' } = req.query;
    const userId = Number(req.user.id);

    if (!searchTerm.trim()) {
      return res.status(200).json(paginateResults([], req.query.page, req.query.size));
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

    const formatted = await formatNotesBulk(result.rows);
    return res.status(200).json(paginateResults(formatted, req.query.page, req.query.size));
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);
    const userId = Number(req.user.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de nota no válido' });
    }

    const access = await checkNoteAccess(id, userId);
    if (!access || access === 'FORBIDDEN') {
      return res.status(access === 'FORBIDDEN' ? 403 : 404).json({ message: 'Nota no encontrada o sin permisos' });
    }

    const formatted = await formatNoteResponse(access);
    if (!formatted) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { projectId, title, content, coverImage, icon, favorite, archived, tags = [] } = req.body;
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
      INSERT INTO notes (project_id, title, content, cover_image, icon, favorite, archived, deleted, share_token, updated_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, $9, NOW(), NOW())
      RETURNING *
    `, [projectId, title || '', content || '', coverImage || null, icon || null, Boolean(favorite), Boolean(archived), shareToken, userId]);

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
    const { title, content, coverImage, icon, favorite, archived, tags } = req.body;
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
    const newIcon = icon !== undefined ? icon : access.icon;
    const newFav = favorite !== undefined ? Boolean(favorite) : access.favorite;
    const newArch = archived !== undefined ? Boolean(archived) : access.archived;

    const result = await query(`
      UPDATE notes 
      SET title = $1, content = $2, cover_image = $3, icon = $4, favorite = $5, archived = $6, updated_by = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [newTitle, newContent, newCover, newIcon, newFav, newArch, userId, id]);

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

export const uploadInlineImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ninguna imagen' });
    }

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'notitas/inline-images',
      resourceType: 'image',
    });

    return res.status(200).json({ url: uploadResult.secure_url });
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

export const duplicateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    // 1. Obtener la nota original
    const noteRes = await query('SELECT * FROM notes WHERE id = $1', [id]);
    if (noteRes.rows.length === 0) return res.status(404).json({ message: 'Nota no encontrada' });
    const original = noteRes.rows[0];

    // 2. Crear la nueva nota duplicada
    const newTitle = original.title ? `${original.title} (Copia)` : 'Nota sin título (Copia)';
    const insertRes = await query(`
      INSERT INTO notes (project_id, title, content, cover_image, favorite, archived, deleted, updated_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, false, false, false, $5, NOW(), NOW())
      RETURNING *
    `, [original.project_id, newTitle, original.content || '', original.cover_image || null, userId]);

    const newNote = insertRes.rows[0];
    const newNoteId = newNote.id;

    // 3. Copiar tags
    const tagsRes = await query('SELECT tag FROM note_tags WHERE note_id = $1', [id]);
    for (const row of tagsRes.rows) {
      await query('INSERT INTO note_tags (note_id, tag) VALUES ($1, $2)', [newNoteId, row.tag]);
    }

    // 4. Copiar attachments
    const attachRes = await query('SELECT url, type, name, tag FROM attachments WHERE note_id = $1', [id]);
    for (const row of attachRes.rows) {
      await query('INSERT INTO attachments (note_id, url, type, name, tag) VALUES ($1, $2, $3, $4, $5)', [
        newNoteId,
        row.url,
        row.type,
        row.name,
        row.tag,
      ]);
    }

    const formatted = await formatNoteResponse(newNote);
    return res.status(201).json(formatted);
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

export const deleteCoverImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Sin permisos' });

    if (access.cover_image && access.cover_image.includes('cloudinary.com')) {
      deleteFromCloudinary(access.cover_image);
    }
    const result = await query('UPDATE notes SET cover_image = NULL, updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const updateAttachmentTag = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const { tag } = req.query;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const result = await query(`
      UPDATE attachments SET tag = $1 WHERE id = $2 AND note_id = $3 RETURNING *
    `, [tag || null, attachmentId, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Adjunto no encontrado' });
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const generateShareToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    const token = crypto.randomBytes(16).toString('hex');
    await query('UPDATE notes SET share_token = $1 WHERE id = $2', [token, id]);

    return res.status(200).json({ shareToken: token });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const noteId = Number(id);
    const userId = Number(req.user.id);

    if (isNaN(noteId)) {
      return res.status(400).json({ message: 'ID de nota no válido' });
    }

    const access = await checkNoteAccess(noteId, userId);
    if (!access || access === 'FORBIDDEN') {
      return res.status(access === 'FORBIDDEN' ? 403 : 404).json({ message: 'Nota no encontrada o sin acceso' });
    }

    const result = await query(`
      SELECT c.id, c.note_id, c.user_id, c.content, c.created_at, c.updated_at,
             u.name as author_name, u.email as author_email, u.avatar as author_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.note_id = $1
      ORDER BY c.created_at ASC
    `, [noteId]);

    const formatted = result.rows.map((c) => ({
      id: Number(c.id),
      noteId: Number(c.note_id),
      userId: Number(c.user_id),
      authorName: c.author_name,
      authorEmail: c.author_email,
      authorAvatar: c.author_avatar,
      content: c.content,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const noteId = Number(id);
    const userId = Number(req.user.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El contenido del comentario es requerido' });
    }

    const access = await checkNoteAccess(noteId, userId);
    if (!access || access === 'FORBIDDEN') {
      return res.status(access === 'FORBIDDEN' ? 403 : 404).json({ message: 'Nota no encontrada o sin acceso' });
    }

    const result = await query(`
      INSERT INTO comments (note_id, user_id, content, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `, [noteId, userId, content.trim().slice(0, 5000)]);

    const newComment = result.rows[0];
    const userRes = await query('SELECT name, email, avatar FROM users WHERE id = $1', [userId]);
    const u = userRes.rows[0] || {};

    return res.status(201).json({
      id: Number(newComment.id),
      noteId: Number(newComment.note_id),
      userId: Number(newComment.user_id),
      authorName: u.name,
      authorEmail: u.email,
      authorAvatar: u.avatar,
      content: newComment.content,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const noteId = Number(id);
    const cId = Number(commentId);
    const userId = Number(req.user.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El contenido es requerido' });
    }

    const commRes = await query('SELECT * FROM comments WHERE id = $1 AND note_id = $2', [cId, noteId]);
    if (commRes.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    const comm = commRes.rows[0];
    if (Number(comm.user_id) !== userId) {
      return res.status(403).json({ message: 'Solo el autor puede editar el comentario' });
    }

    const updateRes = await query(`
      UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [content.trim().slice(0, 5000), cId]);

    const updated = updateRes.rows[0];
    const userRes = await query('SELECT name, email, avatar FROM users WHERE id = $1', [userId]);
    const u = userRes.rows[0] || {};

    return res.status(200).json({
      id: Number(updated.id),
      noteId: Number(updated.note_id),
      userId: Number(updated.user_id),
      authorName: u.name,
      authorEmail: u.email,
      authorAvatar: u.avatar,
      content: updated.content,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const noteId = Number(id);
    const cId = Number(commentId);
    const userId = Number(req.user.id);

    const commRes = await query(`
      SELECT c.*, p.user_id as project_owner_id
      FROM comments c
      JOIN notes n ON n.id = c.note_id
      JOIN projects p ON p.id = n.project_id
      WHERE c.id = $1 AND c.note_id = $2
    `, [cId, noteId]);

    if (commRes.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    const comm = commRes.rows[0];
    const isAuthor = Number(comm.user_id) === userId;
    const isProjectOwner = Number(comm.project_owner_id) === userId;

    if (!isAuthor && !isProjectOwner) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este comentario' });
    }

    await query('DELETE FROM comments WHERE id = $1', [cId]);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const revokeShareToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });

    await query('UPDATE notes SET share_token = NULL, updated_at = NOW() WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Enlace compartido revocado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const joinNote = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = Number(req.user.id);

    const noteRes = await query(`
      SELECT n.*, p.user_id as project_owner_id, p.name as project_name 
      FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE n.share_token = $1 AND n.deleted = false
    `, [token]);

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ message: 'El enlace de invitación a la nota es inválido o ha vencido' });
    }

    const note = noteRes.rows[0];

    // Si no es el creador ni miembro del proyecto, unirse a note_members
    if (Number(note.project_owner_id) !== userId) {
      await query(`
        INSERT INTO note_members (note_id, user_id, role, created_at)
        VALUES ($1, $2, 'EDITOR', NOW())
        ON CONFLICT (note_id, user_id) DO NOTHING
      `, [note.id, userId]);

      // Notificar al creador del proyecto
      await query(`
        INSERT INTO notifications (user_id, title, message, event_type, project_id, note_id, read, created_at)
        VALUES ($1, 'Nuevo Colaborador en Nota', $2, 'NOTE_JOINED', $3, $4, false, NOW())
      `, [
        note.project_owner_id,
        `${req.user.name} se unió como colaborador a tu nota "${note.title || 'Sin título'}"`,
        note.project_id,
        note.id,
      ]);
    }

    const formatted = await formatNoteResponse(note);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getNoteMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const noteId = Number(id);
    const userId = Number(req.user.id);

    if (isNaN(noteId)) {
      return res.status(400).json({ message: 'ID de nota no válido' });
    }

    const access = await checkNoteAccess(noteId, userId);
    if (!access || access === 'FORBIDDEN') {
      return res.status(access === 'FORBIDDEN' ? 403 : 404).json({ message: 'Nota no encontrada o sin acceso' });
    }

    const result = await query(`
      SELECT nm.id as membership_id, nm.user_id, nm.role, nm.created_at as joined_at,
             u.name, u.email, u.avatar
      FROM note_members nm
      JOIN users u ON u.id = nm.user_id
      WHERE nm.note_id = $1
      ORDER BY nm.created_at ASC
    `, [noteId]);

    const members = result.rows.map((m) => ({
      id: Number(m.membership_id),
      userId: Number(m.user_id),
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      role: m.role || 'EDITOR',
      joinedAt: m.joined_at,
    }));

    return res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

export const updateNoteMemberRole = async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const noteId = Number(id);
    const tUserId = Number(targetUserId);
    const currentUserId = Number(req.user.id);
    const { role } = req.body;

    const access = await checkNoteAccess(noteId, currentUserId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Permiso denegado' });

    await query(`
      UPDATE note_members SET role = $1 WHERE note_id = $2 AND user_id = $3
    `, [role || 'EDITOR', noteId, tUserId]);

    return res.status(200).json({ message: 'Rol actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const removeNoteMember = async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const noteId = Number(id);
    const tUserId = Number(targetUserId);
    const currentUserId = Number(req.user.id);

    const isSelf = tUserId === currentUserId;
    const access = await checkNoteAccess(noteId, currentUserId, !isSelf);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Permiso denegado' });

    await query('DELETE FROM note_members WHERE note_id = $1 AND user_id = $2', [noteId, tUserId]);

    // Regenerar share_token para revocar el enlace anterior
    const newToken = crypto.randomBytes(16).toString('hex');
    await query('UPDATE notes SET share_token = $1 WHERE id = $2', [newToken, noteId]);

    return res.status(200).json({ message: 'Colaborador eliminado y enlace regenerado', shareToken: newToken });
  } catch (error) {
    next(error);
  }
};

export const restoreAllTrashNotes = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);

    await query(`
      UPDATE notes 
      SET deleted = false, archived = false, updated_at = NOW() 
      WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1) AND deleted = true
    `, [userId]);

    return res.status(200).json({ message: 'Todas las notas han sido restauradas' });
  } catch (error) {
    next(error);
  }
};

export const emptyTrash = async (req, res, next) => {
  try {
    const userId = Number(req.user.id);

    const deletedNotesRes = await query(`
      SELECT n.id, n.cover_image 
      FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE p.user_id = $1 AND n.deleted = true
    `, [userId]);

    const noteIds = deletedNotesRes.rows.map((r) => Number(r.id));

    if (noteIds.length > 0) {
      // Eliminar portadas y adjuntos de Cloudinary
      for (const row of deletedNotesRes.rows) {
        if (row.cover_image && row.cover_image.includes('cloudinary.com')) {
          deleteFromCloudinary(row.cover_image);
        }
      }

      const attachRes = await query('SELECT url FROM attachments WHERE note_id = ANY($1)', [noteIds]);
      for (const att of attachRes.rows) {
        if (att.url && att.url.includes('cloudinary.com')) {
          deleteFromCloudinary(att.url);
        }
      }

      await query('DELETE FROM attachments WHERE note_id = ANY($1)', [noteIds]);
      await query('DELETE FROM note_tags WHERE note_id = ANY($1)', [noteIds]);
      await query('DELETE FROM comments WHERE note_id = ANY($1)', [noteIds]);
      await query('DELETE FROM note_members WHERE note_id = ANY($1)', [noteIds]);
      await query('DELETE FROM note_versions WHERE note_id = ANY($1)', [noteIds]);
      await query('DELETE FROM notes WHERE id = ANY($1)', [noteIds]);
    }

    return res.status(200).json({ message: 'Papelera vaciada exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const setNotePin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ message: 'El PIN debe tener al menos 4 dígitos' });
    }

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Sin permisos' });

    const pinHash = await bcrypt.hash(String(pin).trim(), 10);
    const result = await query(
      'UPDATE notes SET pin_hash = $1, is_locked = true, updated_at = NOW() WHERE id = $2 RETURNING *',
      [pinHash, id]
    );

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const verifyNotePin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, false);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Sin permisos' });

    if (!access.pin_hash) {
      return res.status(200).json({ verified: true, message: 'La nota no tiene PIN' });
    }

    const match = await bcrypt.compare(String(pin).trim(), access.pin_hash);
    if (!match) {
      return res.status(401).json({ verified: false, message: 'PIN incorrecto' });
    }

    return res.status(200).json({ verified: true, message: 'Nota desbloqueada' });
  } catch (error) {
    next(error);
  }
};

export const removeNotePin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.id;

    const access = await checkNoteAccess(id, userId, true);
    if (!access) return res.status(404).json({ message: 'Nota no encontrada' });
    if (access === 'FORBIDDEN') return res.status(403).json({ message: 'Sin permisos' });

    if (access.pin_hash && pin) {
      const match = await bcrypt.compare(String(pin).trim(), access.pin_hash);
      if (!match) {
        return res.status(401).json({ message: 'PIN actual incorrecto' });
      }
    }

    const result = await query(
      'UPDATE notes SET pin_hash = NULL, is_locked = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    const formatted = await formatNoteResponse(result.rows[0]);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};


