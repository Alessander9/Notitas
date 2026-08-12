# 📝 Notitas

**Organiza tus proyectos, notas y recursos en un solo lugar.**

Notitas es una aplicación web (SPA) para crear **proyectos**, escribir **notas con un editor enriquecido**, subir **portadas, adjuntos e imágenes**, marcar **favoritos**, enviar notas a la **papelera**, **archivar notas**, **compartir notas públicamente** mediante enlace y **colaborar** por invitación con roles (propietario / editor / visor) tanto a nivel de **proyecto** como de **nota individual** (quien se une por el enlace de invitación puede ser Editor o Visor). Incluye **comentarios en las notas**, **exportación** a PDF/PNG/Word/Markdown y **recuperación de contraseña** por email.

> 🚀 **Producción:** [https://notitas-cleo.vercel.app](https://notitas-cleo.vercel.app) · API: `https://notitas-api.onrender.com`

---

## 📑 Tabla de contenidos

1. [Características](#-características)
2. [Stack tecnológico](#-stack-tecnológico)
3. [Arquitectura](#-arquitectura)
4. [Estructura del monorepo](#-estructura-del-monorepo)
5. [Cómo ejecutar localmente](#-cómo-ejecutar-localmente)
6. [Configuración y variables de entorno](#-configuración-y-variables-de-entorno)
7. [Autenticación y sesión](#-autenticación-y-sesión)
8. [API REST (endpoints)](#-api-rest-endpoints)
9. [Modelo de datos](#-modelo-de-datos)
10. [Tests](#-tests)
11. [CI/CD](#-cicd)
12. [Despliegue](#-despliegue)
13. [Documentación relacionada](#-documentación-relacionada)

---

## ✨ Características

### Proyectos
- Dashboard con **vista de cuadrícula y lista** (persistida), filtro local por nombre/descripción.
- Tarjetas con **portada** (subida de imagen, soporta GIF), color de marca, icono (35 emojis), conteo de notas y avatares de creador + colaboradores.
- Sección **Destacados** con notas favoritas.
- CRUD completo con diálogo de **25 colores y 35 iconos**, vista previa de portada (JPG/PNG/GIF, máx 10 MB).
- **Invitación por enlace** (`/join/project/:token`) — el invitado entra como **EDITOR**.
- **Gestión de miembros**: el propietario puede cambiar roles (Editor/Visor) y expulsar colaboradores desde el chip de miembros.
- **Pin/Unpin proyectos**: fijar proyectos favoritas para acceso rápido (persistido en localStorage).

### Notas y editor
- **Editor enriquecido TipTap**: negrita, cursiva, tachado, código, títulos, listas, checklists, **tablas redimensionables**, undo/redo, placeholder.
- **Imágenes flotantes y redimensionables**: arrastra cualquier imagen a cualquier punto del lienzo y redimensiónala desde la esquina manteniendo proporciones. La posición/tamaño se persisten en el HTML de la nota.
- **Autoguardado** con debounce de 800 ms (título + contenido juntos) e indicador *Guardado / Guardando… / Sin guardar*.
- **Historial de versiones** con deduplicación (máx. 50 por nota), previsualización y **restauración reversible**.
- **Portadas, adjuntos** (con etiqueta editable) e **imágenes inline**.
- **Favoritos**, **papelera** (borrado en 2 pasos: soft delete → borrado definitivo) y **búsqueda global**.
- **Compartir públicamente** (`/shared/note/:token`) sin necesidad de cuenta.
- **Mover notas entre proyectos**, tags editables, contador de palabras y minutos de lectura, "último editor".
- **Roles**: los miembros **VIEWER** (de proyecto o de nota) ven el editor en modo solo lectura.
- **Colaboración por nota**: enlace de invitación a colaborar (`/join/note/:token`) → el invitado entra como **EDITOR**; el creador puede **cambiar el rol** (Editor/Visor) y **expulsar** colaboradores desde el diálogo de colaboradores; al expulsar se **regenera el enlace** para que el expulsado no pueda volver a unirse. Los avatares de las listas muestran también a los colaboradores por-nota.
- **Comentarios en las notas**: cualquier colaborador (incluidos VIEWER) puede comentar; el autor edita/borra sus comentarios; los demás colaboradores reciben notificación.
- **Archivado**: archivar/desarchivar notas con vista dedicada en el sidebar (las archivadas no aparecen en listas activas, favoritos ni búsqueda).
- **Exportación**: nota → **PDF** (paginado A4), **PNG** (alta resolución), **Word (.docx)** y **Markdown (.md)** con lazy-loading de librerías.
- **NoteList colapsable**: panel que se minimiza mostrando avatar del usuario + avatares circulares de notas con animaciones staggered.
- **Pin/Unpin notas**: fijar notas favoritas para acceso rápido.

### Experiencia y sesión
- UI en **español**, tema **claro/oscuro** con paleta de marca, fondos ambientales con glows y transiciones premium (framer-motion).
- **Command palette** (`Ctrl/Cmd+K`) estilo Linear/Spotlight: búsqueda global con resaltado + acciones rápidas, animaciones staggered.
- **Toasts** con acción (p. ej. botón *Deshacer* al mover una nota a la papelera) y diálogos de confirmación con ondas pulsantes.
- **Sesión robusta**: JWT en cookie `httpOnly`, renovación deslizante, validación al arrancar, **logout por inactividad** (60 min, configurable) y **revocación real de tokens**.
- **Responsive**: sidebar colapsable con logo animado, FAB móvil con menú personalizado y backdrop blur, skeletons de carga en todas las vistas.
- **Paginación con scroll infinito**: las listas de notas (proyecto, favoritos, papelera y búsqueda) cargan por páginas de 40 con carga automática al hacer scroll; contadores reales y sin límite fijo de notas.
- **Filtro local por texto y tags** dentro de un proyecto y **resaltado de coincidencias** en la vista de búsqueda.
- **Papelera con acciones en bloque**: restaurar todas las notas o vaciarla definitivamente.
- **Aviso de conectividad**: banner global que indica cuando el servidor tarda en responder (cold start de Render free) o está sin conexión.
- **Pin/Unpin**: fijar proyectos y notas favoritas para acceso rápido (persistido en localStorage).

---

## 🛠 Stack tecnológico

| Capa | Tecnología | Detalles |
|---|---|---|
| Frontend | **React 19** + **Vite 8** | JSX (no TypeScript), `type: module` |
| UI | **MUI v6** + **Emotion** | Tema claro/oscuro custom, iconos Material |
| Editor | **TipTap 2.11** | StarterKit + tablas, checklists, imágenes flotantes/redimensionables (NodeView), placeholder |
| Estado global | **Zustand 5** | 4 stores: auth, ui, toast, confirm |
| Datos de servidor | **TanStack React Query 5** | Caché por claves, mutaciones con invalidación |
| Animaciones | **framer-motion 13** | Transiciones de vistas, cards, pantallas, micro-interacciones |
| HTTP | **axios 1.7** | Cliente único con interceptor 401 |
| Rutas | **react-router-dom 7** | BrowserRouter + lazy loading |
| Backend | **Spring Boot 3.4.1** (Java 17, Maven) | `com.notitas.api` |
| Persistencia | **JPA/Hibernate** | **H2** (dev/tests) / **PostgreSQL** (prod, Supabase) |
| Seguridad | **Spring Security 6** + **JWT (jjwt 0.12.6)** + **BCrypt** | Token en header `Authorization` y/o cookie httpOnly `jwt` |
| Almacenamiento | Disco local (dev) / **Supabase Storage** (prod) | Bucket público `uploads` |
| Linting | **oxlint** | Reglas de React Hooks |
| Tests | JUnit 5 + Spring Boot Test (MockMvc) | Tests de integración con perfil `test` |
| CI | **GitHub Actions** | Backend `verify` + frontend build/lint |
| Deploy | **Vercel** (frontend SPA) + **Render** (backend Docker) + **Supabase** (PostgreSQL) | Ver [Despliegue](#-despliegue) |

---

## 🏗 Arquitectura

Monorepo con dos piezas desplegadas por separado:

```
┌─────────────────────┐        ┌──────────────────────────┐
│  Frontend (SPA)     │  HTTPS │  Backend (API REST)      │
│  React + Vite       │ ─────► │  Spring Boot (Docker)    │
│  Vercel             │  /api  │  Render                  │
│  notitas-cleo.vercel│        │  notitas-api.onrender.com│
└─────────────────────┘        └───────────┬──────────────┘
                                           │
                              ┌────────────┴─────────────┐
                              │  PostgreSQL (Supabase)    │
                              │  + Supabase Storage       │
                              └──────────────────────────┘
```

- **Frontend** → SPA estática en Vercel. El `VITE_API_URL` se incrusta en el build.
- **Backend** → contenedor Docker (JVM). No puede ejecutarse como función estática.
- **BD** → PostgreSQL (Supabase) con connection pooler. Esquema automático (`ddl-auto=update`) + migraciones Flyway.
- **Archivos** → en producción viven en Supabase Storage (el disco de Render free es efímero); `UploadsRedirectController` redirige `/uploads/**` al bucket público.

---

## 📁 Estructura del monorepo

```
/
├── README.md                    ← este documento
├── contexto.md                  ← contexto técnico detallado (decisiones, fixes, notas)
├── DEPLOY.md                    ← guía completa de despliegue paso a paso
├── backend/                     ← API Spring Boot (Maven)
│   ├── Dockerfile               ← imagen multi-stage (build + runtime JRE alpine, no-root)
│   ├── Dockerfile.vercel        ← variante para Vercel Docker
│   ├── render.yaml              ← Render Blueprint (plan free, CORS, health check)
│   ├── mvnw / pom.xml
│   └── src/
│       ├── main/java/com/notitas/api/
│       │   ├── ApiApplication.java
│       │   ├── DatabaseInitializer.java   ← seeds demo (solo perfiles ≠ prod)
│       │   ├── WebMvcConfig.java          ← sirve /uploads/** desde disco
│       │   ├── controller/                ← Auth, Note, Project, User, Health, Uploads
│       │   ├── exception/                 ← GlobalExceptionHandler + excepciones
│       │   ├── model/                     ← 7 entidades JPA
│       │   ├── payload/                   ← DTOs request/response
│       │   ├── repository/                ← 7 repos Spring Data JPA
│       │   ├── security/                  ← JWT, filters, rate limit, UserDetails
│       │   └── service/                   ← Note, Project, FileStorage, SupabaseStorage
│       ├── main/resources/               ← application(-dev/-prod).properties + Flyway V1/V2
│       └── test/                         ← tests de integración (MockMvc)
└── frontend/                    ← SPA React + Vite
    ├── index.html               ← lang="es", título "Notitas", favicon de marca
    ├── vercel.json              ← rewrites SPA + buildCommand
    ├── vite.config.js           ← proxy /api y /uploads → localhost:8080
    └── src/
        ├── main.jsx / App.jsx   ← tema MUI, QueryClient, rutas, boot/welcome screens
        ├── index.css            ← fuente Inter, scrollbars, estilos TipTap, animaciones
        ├── components/          ← ~22 componentes + carpeta skeletons/ (9)
        ├── hooks/
        │   ├── useProjectNotes.js
        │   └── useTiltHover.js      ← efecto micro-tilt 2.5D en cards
        ├── pages/               ← Login, Register, Workspace, JoinProject, SharedNote
        ├── services/api.js      ← cliente axios con interceptor 401
        ├── store/               ← authStore, uiStore, toastStore, confirmStore
        └── utils/text.js        ← getPlainText, formatShortDate, getAssetUrl, getAvatarUrl
```

---

## 🚀 Cómo ejecutar localmente

> Requisitos: **Java 17** y **Node.js 20+**.

```bash
# ─── 1. Backend (Spring Boot, H2 en memoria) ─────────────────────────────
cd backend
./mvnw spring-boot:run        # → http://localhost:8080

# ─── 2. Frontend (Vite dev server con HMR) ───────────────────────────────
cd frontend
npm install
npm run dev                   # → http://localhost:5173 (proxy /api → 8080)
```

Abre **http://localhost:5173** y entra con el usuario demo:

| Campo | Valor |
|---|---|
| Email | `admin@notitas.com` |
| Contraseña | `password123` |

> ℹ️ En local la BD es **H2 en memoria**: cada reinicio del backend arranca limpia con datos demo (2 proyectos, 3 notas de ejemplo, tags y versiones). Los archivos se guardan en `backend/uploads/`.

### Comandos útiles

| Comando | Descripción |
|---|---|
| `cd backend && ./mvnw test` | Tests de integración del backend |
| `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` | Backend con consola H2 (`/h2-console`) y SQL logging |
| `cd frontend && npm run lint` | Lint (oxlint) |
| `cd frontend && npm run build` | Build de producción |
| `cd frontend && npm run preview` | Sirve el build (por defecto en :4173) |

---

## ⚙️ Configuración y variables de entorno

### Frontend (`frontend/.env*`)

| Variable | Valor | Notas |
|---|---|---|
| `VITE_API_URL` | `https://notitas-api.onrender.com` (sin `/api`) | Si se omite, apunta a `http://localhost:8080` vía proxy de Vite. Se incrusta **en el build**: cambiar exige redeploy |

### Backend (env vars)

| Variable | Default | Descripción |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | — | `prod` en producción |
| `DB_URL` | H2 en memoria | Cadena JDBC de PostgreSQL (Supabase pooler) en prod |
| `DB_USER` / `DB_PASSWORD` | `sa` / vacío | Credenciales de BD |
| `NOTITAS_JWT_SECRET` | valor dev en el repo | **Obligatorio en prod** (sin fallback). Generar con `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` (dev) / `https://notitas-cleo.vercel.app` (prod) | Orígenes separados por coma |
| `APP_STORAGE_PROVIDER` | `local` | `supabase` en producción |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | — | Storage en prod (`bucket` default `uploads`) |
| `PORT` | `8080` | Puerto del servidor (Render lo inyecta) |
| `APP_RATE_LIMIT_ENABLED` | `true` | Desactiva el rate limit (el perfil test lo hace) |
| `COOKIE_SAMESITE` | `Lax` (dev) / `None` (prod) | `Lax`/`Strict` si algún día la cookie pasa a first-party |

### Perfiles del backend

| Perfil | BD | Notas |
|---|---|---|
| `default` | H2 en memoria | Sin secreto JWT en el repo (JwtUtils genera una clave aleatoria por arranque si falta `NOTITAS_JWT_SECRET`), storage local, datos demo sembrados por `DatabaseInitializer` si la BD está vacía |
| `dev` | H2 | Consola H2 + SQL logging |
| `prod` | PostgreSQL | JWT obligatorio, cookie secure, CORS solo `notitas-cleo`, storage Supabase |
| `test` | H2 | Rate limit desactivado |

---

## 🔐 Autenticación y sesión

- **JWT en cookie `httpOnly`** (`jwt`, Secure + SameSite=None en prod, 24 h) y, para clientes API, también en header `Authorization: Bearer`.
- **Renovación deslizante**: `POST /api/auth/refresh` re-emite la cookie si el JWT es válido. El frontend lo llama al arrancar, cada 6 h y al volver a la pestaña.
- **Validación al arrancar**: `GET /api/users/me`; si la cookie expiró o fue revocada, el frontend cierra sesión limpiamente.
- **Logout por inactividad**: `IdleSessionGuard` — 60 min sin actividad → diálogo de aviso → 60 s de gracia → cierra sesión. Configurable con `notitas-idle-timeout-minutes` en `localStorage`.
- **Revocación real**: campo `users.token_version` embebido en el JWT (claim `tv`); el logout lo incrementa e invalida todos los tokens anteriores en cualquier dispositivo.
- El JWT **no** se guarda en `localStorage` (solo el perfil y el flag de sesión).

---

## 🔌 API REST (endpoints)

Todos bajo `/api` salvo indicación. Respuestas de error: `{ "message": "..." }` con 400/401/403/404/500.

### Auth (`/api/auth` — público)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Autentica → `JwtResponse` + cookie httpOnly `jwt` |
| POST | `/register` | Registro (email único, password ≥ 6) |
| POST | `/refresh` | Renovación deslizante del token |
| POST | `/logout` | Borra cookie y revoca el token (`token_version++`) |
| POST | `/forgot-password` | Solicita recuperación: envía enlace con token de 1 h por email (Respuesta genérica contra enumeración de usuarios; el enlace NO se expone en la respuesta, ni en dev ni en prod) |
| POST | `/reset-password` | Cambia la contraseña con el token (single-use; revoca todas las sesiones) |

### Proyectos (`/api/projects`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Proyectos del usuario (propios + como miembro) |
| GET | `/{id}` | Detalle con creador, colaboradores y rol actual |
| POST | `/` | Crear proyecto (`name` requerido) |
| PUT | `/{id}` | Editar (owner o miembro) |
| DELETE | `/{id}` | Borrar (solo owner) |
| POST | `/{id}/invite-token` | Genera token de invitación |
| POST | `/join/{token}` | Unirse al proyecto (rol EDITOR) |
| PUT | `/{id}/members/{userId}` | Cambiar rol de un miembro (solo owner) |
| DELETE | `/{id}/members/{userId}` | Expulsar a un miembro (solo owner) |
| POST | `/{id}/cover` | Subir portada (multipart) |

### Notas (`/api`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/projects/{projectId}/notes` | Notas de un proyecto (no eliminadas) |
| GET | `/notes/{id}` | Nota por id |
| GET | `/notes/favorites` | Favoritas (propias + de proyectos como miembro) |
| GET | `/notes/deleted` | Papelera (solo proyectos propios) |
| GET | `/notes/archived` | Archivadas (propias + de proyectos como miembro) |
| GET | `/notes/search?query=` | Búsqueda global (excluye archivadas) |
| POST | `/projects/{projectId}/notes` | Crear nota (crea versión inicial) |
| PUT | `/notes/{id}` | Actualizar (título, contenido, tags, favorito, archivado, papelera, mover) |
| POST | `/notes/{id}/cover` | Subir/quitar portada |
| DELETE | `/notes/{id}/cover` | Quitar portada |
| POST | `/notes/{id}/attachment` | Subir adjunto (con tag opcional) |
| PUT | `/notes/{noteId}/attachments/{attachmentId}/tag` | Renombrar tag del adjunto |
| DELETE | `/notes/{id}` | Soft delete (1ª vez) / borrado físico (2ª vez) |
| DELETE | `/notes/deleted` | Vaciar papelera (borrado definitivo de todas) |
| POST | `/notes/deleted/restore-all` | Restaurar todas las notas de la papelera |
| POST | `/notes/{id}/share-token` | Genera enlace público |
| POST | `/notes/join/{token}` | Unirse como colaborador por-nota (rol EDITOR) |
| GET | `/public/notes/shared/{token}` | **Público** — leer nota compartida |
| GET | `/notes/{id}/members` | Colaboradores por-nota (quien pueda ver la nota) |
| PUT | `/notes/{id}/members/{userId}` | Cambiar rol de un colaborador por-nota (solo creador) |
| DELETE | `/notes/{id}/members/{userId}` | Expulsar colaborador por-nota (solo creador; regenera el enlace) |
| GET | `/notes/{id}/comments` | Comentarios de la nota |
| POST | `/notes/{id}/comments` | Crear comentario |
| PUT | `/notes/{id}/comments/{commentId}` | Editar comentario (solo autor) |
| DELETE | `/notes/{id}/comments/{commentId}` | Borrar comentario (solo autor) |
| GET | `/notes/{id}/versions` | Historial de versiones |
| POST | `/notes/{id}/versions/{versionId}/restore` | Restaurar versión (owner/EDITOR) |
| POST | `/notes/{id}/images` | Subir imagen inline del editor |

### Usuarios (`/api/users`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/me` | Perfil actual (valida la sesión) |
| PUT | `/profile` | Actualizar nombre/email (token nuevo si cambia email) |
| PUT | `/profile/password` | Cambiar contraseña (valida la actual) |
| POST | `/profile/avatar` | Subir avatar (borra el anterior) |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/public/health` | Health check (usado por Render) |
| GET | `/uploads/**` | Archivos estáticos (disco local o redirect a Supabase) |

---

## 🗄 Modelo de datos

```
User 1 ─── N Project 1 ─── N Note 1 ─── N NoteVersion
              │                │            ├─── N Tag
              │                │            ├─── N Attachment
              │                │            ├─── N Comment
              │                │            └─── N NoteMember N ─── 1 User (rol EDITOR/VIEWER)
              └─── N ProjectMember N ─── 1 User (rol EDITOR/VIEWER)

User 1 ─── N PasswordResetToken (single-use, 1 h)
```

| Entidad | Tabla | Campos principales |
|---|---|---|
| **User** | `users` | id, email (único), password (bcrypt), name, avatar, token_version |
| **Project** | `projects` | id, user_id (owner), name, icon, color, description, coverImage, inviteToken, createdAt, updatedAt |
| **ProjectMember** | `project_members` | project_id, user_id, role (`EDITOR`/`VIEWER`), joinedAt |
| **Note** | `notes` | id, project_id, title, content (LONGVARCHAR/CLOB portable), coverImage, favorite, archived, deleted, shareToken, updatedBy, timestamps |
| **NoteVersion** | `note_versions` | note_id, title, content, createdAt, updatedBy |
| **Tag** | `note_tags` | note_id, tag |
| **Attachment** | `attachments` | note_id, url, type, name, tag |

Detalles relevantes:
- `content` usa `@JdbcTypeCode(LONGVARCHAR)` para portabilidad H2 ↔ PostgreSQL (bug histórico con `CLOB`).
- Los builders de entidades están hechos a mano (sin Lombok).
- Migraciones Flyway: `V1__initial_schema.sql` (esquema) + `V2__add_token_version.sql`.

---

## 🧪 Tests

**Backend** (JUnit 5 + MockMvc, perfil `test`): `BaseIntegrationTest` levanta el contexto Spring completo (H2 + JWT real) con `@Transactional` (rollback por test) y helpers (`register`, `login`, `createProject`, `createNote`, `bearer`, `expectApiError`).

- `AuthControllerIntegrationTest` — registro, email duplicado, validación, login, endpoints protegidos.
- `NoteControllerIntegrationTest` — CRUD, favoritos (incluido como miembro), búsqueda, soft/hard delete, compartir, portadas/adjuntos/imágenes, versionado, permisos.
- `ProjectControllerIntegrationTest` — CRUD, invitaciones, join, permisos owner/miembro.
- `UserControllerIntegrationTest` — perfil, cambio de contraseña, token nuevo al cambiar email.
- `SupabaseStorageConfigIntegrationTest` — configuración de storage.

```bash
cd backend && ./mvnw test
```

> ⚠️ El frontend aún **no** tiene tests unitarios (pendiente conocido).

---

## 🔄 CI/CD

GitHub Actions (`.github/workflows/ci.yml`) en push a `main`/`develop` y PRs a `main`:

- **Backend**: JDK 17 (Temurin), `./mvnw verify -q`.
- **Frontend**: Node 20, `npm ci` → `npm run build` → `npm run lint`.

Los deploys de producción se hacen manualmente (Vercel + Render):

```bash
cd frontend && npx vercel --prod   # frontend
# Backend: push a main → Render redeploya automáticamente (Blueprint)
```

---

## 🚀 Despliegue

Resumen rápido (guía completa en [`DEPLOY.md`](DEPLOY.md)):

| Pieza | Servicio | Detalle |
|---|---|---|
| Frontend | **Vercel** (Hobby) | `notitas-cleo.vercel.app` — dominio único; `vercel.json` en `frontend/` con rewrites SPA |
| Backend | **Render** (free web service) | `render.yaml` Blueprint + `backend/Dockerfile`; se duerme a los ~15 min (despierta en ~1 min) |
| Base de datos | **Supabase** (free) | PostgreSQL con connection pooler (`aws-0-<región>.pooler.supabase.com:6543`) |
| Archivos | **Supabase Storage** (free) | Bucket público `uploads` (1 GB) |

**Producción actual:**
- Frontend: `https://notitas-cleo.vercel.app` (los alias `notitas-five` / `notitas-alessander` fueron eliminados).
- Backend: `https://notitas-api.onrender.com`
- CORS de producción: solo `https://notitas-cleo.vercel.app` (preflight 403 desde cualquier otro origen).

Pasos esenciales del primer deploy (detalle en `DEPLOY.md`):
1. **Supabase**: crear proyecto, bucket público `uploads`, copiar `DB_URL` (pooler), `DB_USER`, `DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Backend en Render**: New → Blueprint → conectar repo → rellenar secretos (`DB_*`, `SUPABASE_*`, `NOTITAS_JWT_SECRET`).
3. **Frontend en Vercel**: importar repo con Root Directory = `frontend`, añadir `VITE_API_URL=https://notitas-api.onrender.com` (Production), deploy.

---

## 📚 Documentación relacionada

| Documento | Contenido |
|---|---|
| [`contexto.md`](contexto.md) | Análisis técnico completo: decisiones de diseño, fixes de producción, notas técnicas |
| [`DEPLOY.md`](DEPLOY.md) | Guía paso a paso de despliegue (Vercel, Render, Supabase) |

---

## 🧭 Mejoras planificadas / pendientes

- **Dominio propio** (`app.tudominio.com` + `api.tudominio.com`): cookie first-party + `COOKIE_SAMESITE=Lax`.
- **Supabase Auth** para login social (OAuth).
- **Verificación de email** en el registro.
- **Colaboración en tiempo real** (hoy: autoguardado + versiones + notificaciones por polling).
- **Búsqueda insensible a acentos en BD** (hoy filtrado en SQL case-insensitive en la consulta).
- **Rate limit en Redis** (hoy en memoria, por instancia).
- **Error tracking** (Sentry o equivalente).
