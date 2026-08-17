import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Extraer connection string desde DATABASE_URL o DB_URL
const connectionString = process.env.DATABASE_URL || process.env.DB_URL || '';

// Si la URL viene en formato jdbc:postgresql://, convertir a postgresql://
const sanitizedConnectionString = connectionString.replace(/^jdbc:/, '');

// Preparar configuración de conexión para PostgreSQL / Supabase
let finalConnectionString = sanitizedConnectionString;

if (finalConnectionString && !finalConnectionString.includes('@') && process.env.DB_USER) {
  const urlWithoutProto = finalConnectionString.replace(/^postgresql:\/\//, '');
  const user = encodeURIComponent(process.env.DB_USER || '');
  const pass = encodeURIComponent(process.env.DB_PASSWORD || '');
  const auth = user && pass ? `${user}:${pass}@` : user ? `${user}@` : '';
  finalConnectionString = `postgresql://${auth}${urlWithoutProto}`;
}

// Quitar parámetros sslmode de la URL para que pg respete ssl: { rejectUnauthorized: false }
const isProd = process.env.NODE_ENV === 'production';
const requiresSsl = (finalConnectionString && finalConnectionString.includes('sslmode=require')) || isProd;

const cleanedConnectionString = finalConnectionString
  ? finalConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
  : '';

export const pool = new Pool({
  connectionString: cleanedConnectionString || undefined,
  user: cleanedConnectionString ? undefined : process.env.DB_USER,
  password: cleanedConnectionString ? undefined : process.env.DB_PASSWORD,
  host: cleanedConnectionString ? undefined : process.env.DB_HOST,
  port: cleanedConnectionString ? undefined : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432),
  database: cleanedConnectionString ? undefined : (process.env.DB_NAME || 'postgres'),
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text, params) => pool.query(text, params);

// Auto-inicialización idempotente del esquema de base de datos en Supabase
export const initDbSchema = async () => {
  try {
    // 1. Comments table
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGSERIAL PRIMARY KEY,
        note_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        content VARCHAR(5000) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);

    // 2. Note members & roles
    await query(`
      CREATE TABLE IF NOT EXISTS note_members (
        id BIGSERIAL PRIMARY KEY,
        note_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'EDITOR',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (note_id, user_id)
      )
    `);
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'note_members' AND column_name = 'role') THEN 
          ALTER TABLE note_members ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'EDITOR'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'note_members' AND column_name = 'created_at') THEN 
          ALTER TABLE note_members ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP; 
        END IF; 
      END $$;
    `);

    // 3. Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        actor_id BIGINT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        event_type VARCHAR(80),
        type VARCHAR(50),
        project_id BIGINT,
        note_id BIGINT,
        target_type VARCHAR(50),
        target_id BIGINT
      )
    `);
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'event_type') THEN 
          ALTER TABLE notifications ADD COLUMN event_type VARCHAR(80); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'project_id') THEN 
          ALTER TABLE notifications ADD COLUMN project_id BIGINT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'note_id') THEN 
          ALTER TABLE notifications ADD COLUMN note_id BIGINT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'actor_id') THEN 
          ALTER TABLE notifications ADD COLUMN actor_id BIGINT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_type') THEN 
          ALTER TABLE notifications ADD COLUMN target_type VARCHAR(50); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_id') THEN 
          ALTER TABLE notifications ADD COLUMN target_id BIGINT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN 
          ALTER TABLE notifications ADD COLUMN type VARCHAR(50); 
        END IF; 
      END $$;
    `);

    // 4. Note versions table
    await query(`
      CREATE TABLE IF NOT EXISTS note_versions (
        id BIGSERIAL PRIMARY KEY,
        note_id BIGINT NOT NULL,
        title VARCHAR(255),
        content TEXT,
        updated_by BIGINT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Password reset tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        token VARCHAR(100) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Custom user templates table
    await query(`
      CREATE TABLE IF NOT EXISTS custom_templates (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT '📝',
        category VARCHAR(100) DEFAULT 'Personalizadas',
        content TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Users & notes & projects columns
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'token_version') THEN 
          ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'share_token') THEN 
          ALTER TABLE notes ADD COLUMN share_token VARCHAR(255); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'updated_by') THEN 
          ALTER TABLE notes ADD COLUMN updated_by BIGINT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'invite_token') THEN 
          ALTER TABLE projects ADD COLUMN invite_token VARCHAR(255); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'cover_image') THEN 
          ALTER TABLE projects ADD COLUMN cover_image VARCHAR(500); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'icon') THEN 
          ALTER TABLE notes ADD COLUMN icon VARCHAR(50); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'pin_hash') THEN 
          ALTER TABLE notes ADD COLUMN pin_hash VARCHAR(255); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'is_locked') THEN 
          ALTER TABLE notes ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE; 
        END IF;
      END $$;
    `);

    // 7. Índices de rendimiento para claves foráneas y consultas frecuentes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
      CREATE INDEX IF NOT EXISTS idx_notes_share_token ON notes(share_token) WHERE share_token IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);
      CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(favorite);
      CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_note_members_note_user ON note_members(note_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_note_members_user ON note_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON project_members(project_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);
      CREATE INDEX IF NOT EXISTS idx_custom_templates_user ON custom_templates(user_id);

      -- Índices de alto rendimiento para búsqueda y listado de notas
      CREATE INDEX IF NOT EXISTS idx_notes_project_deleted ON notes(project_id, deleted);
      CREATE INDEX IF NOT EXISTS idx_notes_updated_at_desc ON notes(updated_at DESC NULLS LAST);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note_tag ON note_tags(note_id, tag);
    `);

    // Intentar habilitar extensión pg_trgm e índices GIN si los permisos de la base de datos lo permiten
    try {
      await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes USING gin (title gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_notes_content_trgm ON notes USING gin (content gin_trgm_ops);
      `);
    } catch (_trgmErr) {
      // Ignorar si el usuario de la BD no tiene permisos de superusuario para CREATE EXTENSION
    }

    console.log('PostgreSQL schema auto-verified and up-to-date.');
  } catch (err) {
    console.error('Error during auto-migration in initDbSchema:', err);
  }
};

// Disparar la verificación inicial
initDbSchema().catch((err) => console.error('Init schema caught error:', err));
