-- Índices para acelerar búsquedas, ordenamientos y joins en PostgreSQL / H2
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_filter ON notes(project_id, deleted, archived, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite, deleted);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_note_members_user_id ON note_members(user_id);
CREATE INDEX IF NOT EXISTS idx_note_members_note_id ON note_members(note_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_comments_note_id ON comments(note_id);
