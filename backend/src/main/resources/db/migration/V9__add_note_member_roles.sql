-- Rol de los colaboradores por-nota: EDITOR (edita, por defecto) o VIEWER (solo lectura)
ALTER TABLE note_members ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'EDITOR';
