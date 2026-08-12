-- Comentarios en notas (discusión sobre el contenido de una nota).
-- Estructura que replica la entidad com.notitas.api.model.Comment:
--   id, note_id (FK notes), user_id (FK users), content (hasta 5000),
--   created_at, updated_at.
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
