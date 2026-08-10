-- Evita la duplicación de miembros por joins concurrentes (doble pestaña,
-- doble clic o doble efecto de React en dev): dos peticiones podían pasar el
-- check "no es miembro" a la vez e insertar dos filas para el mismo
-- (project_id, user_id). Las filas duplicadas rompían findByProjectIdAndUserId
-- (Optional con >1 resultado → 500 en GET /api/projects).
--
-- 1) Elimina duplicados previos (se queda con el id más bajo).
-- 2) Añade la constraint UNIQUE para que la carrera no pueda volver a ocurrir
--    (el segundo INSERT falla y ProjectServiceImpl.joinProject lo trata como
--    "ya unido").
DELETE FROM project_members a USING project_members b
WHERE a.id > b.id
  AND a.project_id = b.project_id
  AND a.user_id = b.user_id;

ALTER TABLE project_members
    ADD CONSTRAINT uk_project_members_project_user UNIQUE (project_id, user_id);
