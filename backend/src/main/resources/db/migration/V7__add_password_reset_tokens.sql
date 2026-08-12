-- Tokens de recuperación de contraseña (flujo "¿Olvidaste tu contraseña?").
-- Estructura que replica la entidad com.notitas.api.model.PasswordResetToken:
--   id, user_id (FK users), token (único), expires_at, used, created_at.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
