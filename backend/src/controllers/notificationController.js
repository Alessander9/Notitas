import { query } from '../config/db.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

    const notifications = result.rows.map((n) => ({
      id: Number(n.id),
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      eventType: n.event_type,
      projectId: n.project_id ? Number(n.project_id) : null,
      noteId: n.note_id ? Number(n.note_id) : null,
      createdAt: n.created_at,
    }));

    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false
    `, [userId]);

    const count = parseInt(result.rows[0]?.count || '0', 10);
    return res.status(200).json({ count, unreadCount: count });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [id, userId]);
    return res.status(200).json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await query('UPDATE notifications SET read = true WHERE user_id = $1', [userId]);
    return res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};

export const clearNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    return res.status(200).json({ message: 'Historial de notificaciones eliminado' });
  } catch (error) {
    next(error);
  }
};
