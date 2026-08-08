-- Tabla para gestionar la colaboración de usuarios en notas individuales de forma compartida
CREATE TABLE IF NOT EXISTS note_members (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(note_id, user_id)
);
