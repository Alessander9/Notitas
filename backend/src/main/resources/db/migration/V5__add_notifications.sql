-- Tabla de notificaciones del centro de notificaciones (campana del navbar).
-- La entidad Notification se añadió en código, pero ninguna migración la creaba:
-- en dev/tests H2 (ddl-auto=update) la crea Hibernate al arrancar, por eso los
-- tests pasaban; en producción (ddl-auto=none + Flyway) la tabla NO existía y
-- GET /api/notifications devolvía 500 "Error interno del servidor".
--
-- La estructura replica exactamente la entidad com.notitas.api.model.Notification:
--   id, user_id (FK users), title, message (hasta 1000), read, created_at.
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
