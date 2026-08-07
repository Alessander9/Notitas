-- Versión de sesión del usuario: se incrementa al cerrar sesión para invalidar
-- (revocar) todos los JWT emitidos anteriormente. Los tokens antiguos sin el
-- claim 'tv' se tratan como versión 0, por lo que siguen siendo válidos si el
-- usuario nunca ha cerrado sesión.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
