import crypto from 'crypto';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

// Helper para armar la respuesta enriquecida de un proyecto
const formatProjectResponse = async (project, currentUserId) => {
  const isOwner = Number(project.user_id) === Number(currentUserId);

  // Obtener creador
  const creatorRes = await query('SELECT id, name, email, avatar FROM users WHERE id = $1', [project.user_id]);
  const creator = creatorRes.rows[0] ? {
    id: Number(creatorRes.rows[0].id),
    name: creatorRes.rows[0].name,
    email: creatorRes.rows[0].email,
    avatar: creatorRes.rows[0].avatar,
  } : null;

  // Obtener colaboradores con sus roles
  const membersRes = await query(`
    SELECT u.id, u.name, u.email, u.avatar, pm.role 
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = $1
  `, [project.id]);

  const collaborators = membersRes.rows.map((m) => ({
    id: Number(m.id),
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    role: m.role || 'EDITOR',
  }));

  // Rol del usuario actual
  let currentUserRole = isOwner ? 'OWNER' : null;
  if (!currentUserRole) {
    const userRole = collaborators.find((c) => c.id === Number(currentUserId));
    currentUserRole = userRole ? userRole.role : 'VIEWER';
  }

  return {
    id: Number(project.id),
    name: project.name,
    icon: project.icon,
    color: project.color,
    description: project.description,
    coverImage: project.cover_image,
    currentUserRole,
    creator,
    collaborators,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
};

// Helper para formatear proyectos en lote con solo 2 consultas a la BD (evita saturación N+1)
export const formatProjectsBulk = async (projects, currentUserId) => {
  if (!projects || !Array.isArray(projects) || projects.length === 0) return [];
  const projectIds = projects.map((p) => Number(p.id)).filter((id) => !isNaN(id) && id > 0);
  const userIds = [...new Set(projects.map((p) => Number(p.user_id)).filter((id) => !isNaN(id) && id > 0))];

  // 1 consulta para todos los creadores
  let creatorsById = {};
  if (userIds.length > 0) {
    try {
      const creatorRes = await query('SELECT id, name, email, avatar FROM users WHERE id = ANY($1)', [userIds]);
      creatorRes.rows.forEach((u) => {
        creatorsById[Number(u.id)] = {
          id: Number(u.id),
          name: u.name,
          email: u.email,
          avatar: u.avatar,
        };
      });
    } catch (e) {
      console.error('Error fetching project creators in bulk', e);
    }
  }

  // 1 consulta para todos los colaboradores
  let membersByProject = {};
  if (projectIds.length > 0) {
    try {
      const membersRes = await query(`
        SELECT pm.project_id, u.id, u.name, u.email, u.avatar, pm.role 
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ANY($1)
      `, [projectIds]);
      membersRes.rows.forEach((m) => {
        const pid = Number(m.project_id);
        if (!membersByProject[pid]) membersByProject[pid] = [];
        membersByProject[pid].push({
          id: Number(m.id),
          name: m.name,
          email: m.email,
          avatar: m.avatar,
          role: m.role || 'EDITOR',
        });
      });
    } catch (e) {
      console.error('Error fetching project members in bulk', e);
    }
  }

  return projects.map((p) => {
    const pid = Number(p.id);
    const isOwner = Number(p.user_id) === Number(currentUserId);
    const creator = creatorsById[Number(p.user_id)] || null;
    const collaborators = membersByProject[pid] || [];

    let currentUserRole = isOwner ? 'OWNER' : null;
    if (!currentUserRole) {
      const userRole = collaborators.find((c) => c.id === Number(currentUserId));
      currentUserRole = userRole ? userRole.role : 'VIEWER';
    }

    return {
      id: pid,
      name: p.name,
      icon: p.icon,
      color: p.color,
      description: p.description,
      coverImage: p.cover_image,
      currentUserRole,
      creator,
      collaborators,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
};

export const getAllProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT DISTINCT p.* FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.user_id = $1 OR pm.user_id = $1
      ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
    `, [userId]);

    const formatted = await formatProjectsBulk(result.rows, userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(`
      SELECT p.* FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = $1 AND (p.user_id = $2 OR pm.user_id = $2)
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado o sin permisos' });
    }

    const formatted = await formatProjectResponse(result.rows[0], userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { name, description, color, icon, coverImage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre del proyecto es requerido' });
    }

    const userId = req.user.id;
    const inviteToken = crypto.randomBytes(16).toString('hex');

    const result = await query(`
      INSERT INTO projects (user_id, name, description, color, icon, cover_image, invite_token, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [userId, name.trim(), description || null, color || '#386c5f', icon || 'folder', coverImage || null, inviteToken]);

    const formatted = await formatProjectResponse(result.rows[0], userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, coverImage } = req.body;
    const userId = req.user.id;

    // Verificar permisos (solo dueño o colaborador EDITOR)
    const checkRes = await query(`
      SELECT p.*, pm.role FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1 AND (p.user_id = $2 OR (pm.user_id = $2 AND pm.role != 'VIEWER'))
    `, [id, userId]);

    if (checkRes.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes permisos para editar este proyecto' });
    }

    const current = checkRes.rows[0];
    const newName = name !== undefined ? name.trim() : current.name;
    const newDesc = description !== undefined ? description : current.description;
    const newColor = color !== undefined ? color : current.color;
    const newIcon = icon !== undefined ? icon : current.icon;
    const newCover = coverImage !== undefined ? coverImage : current.cover_image;

    const result = await query(`
      UPDATE projects 
      SET name = $1, description = $2, color = $3, icon = $4, cover_image = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [newName, newDesc, newColor, newIcon, newCover, id]);

    const formatted = await formatProjectResponse(result.rows[0], userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Solo el dueño puede eliminar el proyecto
    const checkRes = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
    if (checkRes.rows.length === 0) {
      return res.status(403).json({ message: 'Solo el creador puede eliminar el proyecto' });
    }

    const project = checkRes.rows[0];

    // Eliminar portada de Cloudinary si existe
    if (project.cover_image && project.cover_image.includes('cloudinary.com')) {
      deleteFromCloudinary(project.cover_image);
    }

    // Eliminar dependencias en cascada (attachments, tags, comments, members, versions, notes)
    await query('DELETE FROM attachments WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)', [id]);
    await query('DELETE FROM note_tags WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)', [id]);
    await query('DELETE FROM comments WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)', [id]);
    await query('DELETE FROM note_members WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)', [id]);
    await query('DELETE FROM note_versions WHERE note_id IN (SELECT id FROM notes WHERE project_id = $1)', [id]);
    await query('DELETE FROM notes WHERE project_id = $1', [id]);
    await query('DELETE FROM project_members WHERE project_id = $1', [id]);
    await query('DELETE FROM projects WHERE id = $1', [id]);

    return res.status(200).json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const uploadProjectCover = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    // Verificar permisos
    const checkRes = await query(`
      SELECT p.*, pm.role FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1 AND (p.user_id = $2 OR (pm.user_id = $2 AND pm.role != 'VIEWER'))
    `, [id, userId]);

    if (checkRes.rows.length === 0) {
      return res.status(403).json({ message: 'Sin permisos para modificar el proyecto' });
    }

    const oldCover = checkRes.rows[0].cover_image;

    // Subir a Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'notitas/covers/projects',
      transformation: [
        { width: 1200, height: 400, crop: 'fill' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    const newCoverUrl = uploadResult.secure_url;

    const result = await query(`
      UPDATE projects SET cover_image = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [newCoverUrl, id]);

    if (oldCover && oldCover.includes('cloudinary.com')) {
      deleteFromCloudinary(oldCover);
    }

    const formatted = await formatProjectResponse(result.rows[0], userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getInviteToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const checkRes = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
    if (checkRes.rows.length === 0) {
      return res.status(403).json({ message: 'Solo el dueño puede generar enlaces de invitación' });
    }

    let token = checkRes.rows[0].invite_token;
    if (!token) {
      token = crypto.randomBytes(16).toString('hex');
      await query('UPDATE projects SET invite_token = $1 WHERE id = $2', [token, id]);
    }

    return res.status(200).json({ inviteToken: token });
  } catch (error) {
    next(error);
  }
};

export const joinProject = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const projectRes = await query('SELECT * FROM projects WHERE invite_token = $1', [token]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Enlace de invitación inválido o expirado' });
    }

    const project = projectRes.rows[0];

    // Si ya es el dueño
    if (Number(project.user_id) === Number(userId)) {
      const formatted = await formatProjectResponse(project, userId);
      return res.status(200).json(formatted);
    }

    // Agregar a project_members si no existe
    await query(`
      INSERT INTO project_members (project_id, user_id, role, joined_at)
      VALUES ($1, $2, 'EDITOR', NOW())
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [project.id, userId]);

    // Notificar al dueño del proyecto
    await query(`
      INSERT INTO notifications (user_id, title, message, event_type, project_id, read, created_at)
      VALUES ($1, 'Nuevo Colaborador', $2, 'PROJECT_JOINED', $3, false, NOW())
    `, [project.user_id, `${req.user.name} se unió a tu proyecto "${project.name}"`, project.id]);

    const formatted = await formatProjectResponse(project, userId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const changeMemberRole = async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    // Solo el dueño puede cambiar roles
    const checkRes = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, currentUserId]);
    if (checkRes.rows.length === 0) {
      return res.status(403).json({ message: 'Solo el creador puede gestionar roles' });
    }

    await query('UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3', [role || 'EDITOR', id, targetUserId]);

    const project = checkRes.rows[0];
    const formatted = await formatProjectResponse(project, currentUserId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user.id;

    // Dueño eliminando colaborador, o colaborador saliéndose a sí mismo
    const isSelf = Number(targetUserId) === Number(currentUserId);
    const checkRes = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [id, currentUserId]);
    const isOwner = checkRes.rows.length > 0;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ message: 'No tienes permisos para remover este miembro' });
    }

    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, targetUserId]);

    const projectRes = await query('SELECT * FROM projects WHERE id = $1', [id]);
    const formatted = await formatProjectResponse(projectRes.rows[0], currentUserId);
    return res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};
