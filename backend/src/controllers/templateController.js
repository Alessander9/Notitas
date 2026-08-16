import { query } from '../config/db.js';

export const getCustomTemplates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT * FROM custom_templates 
       WHERE user_id = $1 
       ORDER BY updated_at DESC, created_at DESC`,
      [userId]
    );

    const templates = result.rows.map((t) => ({
      id: Number(t.id),
      title: t.title,
      description: t.description || '',
      icon: t.icon || '📝',
      category: t.category || 'Personalizadas',
      content: t.content,
      tags: t.tags || [],
      isCustom: true,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
};

export const createCustomTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, icon, category, content, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'El título de la plantilla es requerido' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'El contenido de la plantilla es requerido' });
    }

    const cleanCategory = category && category.trim() ? category.trim() : 'Personalizadas';
    const cleanIcon = icon && icon.trim() ? icon.trim() : '📝';
    const cleanTags = Array.isArray(tags) ? tags : [];

    const result = await query(
      `INSERT INTO custom_templates 
       (user_id, title, description, icon, category, content, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        title.trim(),
        description ? description.trim() : null,
        cleanIcon,
        cleanCategory,
        content.trim(),
        cleanTags,
      ]
    );

    const row = result.rows[0];
    return res.status(201).json({
      id: Number(row.id),
      title: row.title,
      description: row.description || '',
      icon: row.icon || '📝',
      category: row.category || 'Personalizadas',
      content: row.content,
      tags: row.tags || [],
      isCustom: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, icon, category, content, tags } = req.body;

    const checkRes = await query(
      'SELECT * FROM custom_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Plantilla no encontrada o sin permisos' });
    }

    const current = checkRes.rows[0];
    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDesc = description !== undefined ? description : current.description;
    const newIcon = icon !== undefined ? icon.trim() : current.icon;
    const newCategory = category !== undefined ? category.trim() : current.category;
    const newContent = content !== undefined ? content.trim() : current.content;
    const newTags = tags !== undefined ? (Array.isArray(tags) ? tags : []) : current.tags;

    const result = await query(
      `UPDATE custom_templates
       SET title = $1, description = $2, icon = $3, category = $4, content = $5, tags = $6, updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [newTitle, newDesc, newIcon, newCategory, newContent, newTags, id, userId]
    );

    const row = result.rows[0];
    return res.status(200).json({
      id: Number(row.id),
      title: row.title,
      description: row.description || '',
      icon: row.icon || '📝',
      category: row.category || 'Personalizadas',
      content: row.content,
      tags: row.tags || [],
      isCustom: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const checkRes = await query(
      'SELECT id FROM custom_templates WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Plantilla no encontrada o sin permisos' });
    }

    await query('DELETE FROM custom_templates WHERE id = $1 AND user_id = $2', [id, userId]);

    return res.status(200).json({ message: 'Plantilla personalizada eliminada exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const createTemplateFromNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;
    const { title, description, icon, category } = req.body;

    const noteRes = await query(
      `SELECT n.* FROM notes n
       JOIN projects p ON p.id = n.project_id
       WHERE n.id = $1 AND n.deleted = false
         AND (
           p.user_id = $2
           OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2)
           OR EXISTS (SELECT 1 FROM note_members nm WHERE nm.note_id = n.id AND nm.user_id = $2)
         )`,
      [noteId, userId]
    );

    if (noteRes.rows.length === 0) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    const note = noteRes.rows[0];
    const templateTitle = title && title.trim() ? title.trim() : (note.title || 'Plantilla de Nota');
    const templateDesc = description || `Plantilla creada a partir de la nota "${note.title || 'Sin título'}"`;
    const templateIcon = icon || note.icon || '📝';
    const templateCat = category || 'Personalizadas';

    const result = await query(
      `INSERT INTO custom_templates
       (user_id, title, description, icon, category, content, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        templateTitle,
        templateDesc,
        templateIcon,
        templateCat,
        note.content || '',
        note.tags || [],
      ]
    );

    const row = result.rows[0];
    return res.status(201).json({
      id: Number(row.id),
      title: row.title,
      description: row.description || '',
      icon: row.icon || '📝',
      category: row.category || 'Personalizadas',
      content: row.content,
      tags: row.tags || [],
      isCustom: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    next(error);
  }
};
