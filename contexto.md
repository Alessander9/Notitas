# 📋 Contexto del Proyecto — Notitas

> Documento generado tras un análisis completo del repositorio (frontend + backend + despliegue).

---

## 1. Resumen general

**Notitas** es una aplicación web (SPA) para **organizar proyectos, notas y recursos**. Permite crear proyectos, escribir notas con un editor enriquecido (TipTap), subir portadas/adjuntos/imágenes inline, marcar favoritos, mover notas a la papelera, compartir notas públicamente mediante enlace y colaborar en proyectos por invitación con roles (propietario / editor / lector).

- **Idioma de la UI:** español (casi todos los textos y mensajes de la API están en español).
- **Arquitectura:** monorepo con `frontend/` (React SPA) y `backend/` (API REST Spring Boot), desplegados por separado.
- **Modelo de datos:** usuarios → proyectos (con colaboradores) → notas (con tags, adjuntos, versiones, portadas).

---

## 2. Stack tecnológico

| Capa | Tecnología | Detalles |
|---|---|---|
| Frontend | **React 19** + **Vite 8** | JSX (no TypeScript), `type: module` |
| UI | **MUI v6** (`@mui/material`, `@mui/icons-material`) + **Emotion** | Tema claro/oscuro custom |
| Editor | **TipTap 2.11** (StarterKit + tablas, checklists, imágenes flotantes/redimensionables con NodeView, placeholder) | Contenido guardado como **HTML** (posición/tamaño de imagen en `style` + `data-*`) |
| Estado global | **Zustand 5** | 4 stores: auth, ui, toast, confirm |
| Datos del servidor | **TanStack React Query 5** | Cache por claves; mutaciones con invalidación |
| Animaciones | **framer-motion 13** | Transiciones de vistas, cards, pantallas de bienvenida |
| HTTP | **axios 1.7** | Cliente único con interceptor 401 |
| Rutas | **react-router-dom 7** | BrowserRouter |
| Backend | **Spring Boot 3.4.1** (Java 17, Maven) | `com.notitas.api` |
| Persistencia | **JPA/Hibernate** + **H2** (dev/tests) / **PostgreSQL** (prod, Supabase) | `ddl-auto=update` |
| Seguridad | **Spring Security 6** + **JWT (jjwt 0.12.6)** + **BCrypt** | Token en header `Authorization` y/o cookie httpOnly `jwt` |
| Linting | **oxlint** (`frontend/.oxlintrc.json`) | Reglas de React Hooks |
| Tests | JUnit 5 + Spring Boot Test (MockMvc) — **tests de integración** | Perfil `test` |
| Deploy | **Vercel** (frontend SPA) + contenedor Docker (backend) + **Supabase** (PostgreSQL) | Ver `DEPLOY.md` |

---

## 3. Estructura del monorepo

```
/
├── contexto.md                  ← este documento
├── DEPLOY.md                    ← guía completa de despliegue
├── vercel.json                  ← build del frontend en Vercel (rootDirectory: frontend)
├── backend/                     ← API Spring Boot (Maven)
│   ├── Dockerfile               ← imagen multi-stage (build + runtime JRE alpine)
│   ├── mvnw / pom.xml
│   └── src/
│       ├── main/java/com/notitas/api/
│       │   ├── ApiApplication.java
│       │   ├── DatabaseInitializer.java   ← seeds demo (solo perfil != prod)
│       │   ├── WebMvcConfig.java          ← sirve /uploads/** desde disco
│       │   ├── controller/                ← Auth, Note, Project, User
│       │   ├── exception/                 ← GlobalExceptionHandler + 2 excepciones
│       │   ├── model/                     ← 7 entidades JPA
│       │   ├── payload/                   ← DTOs request/response
│       │   ├── repository/                ← 7 repos Spring Data JPA
│       │   ├── security/                  ← JWT, filters, rate limit, UserDetails
│       │   └── service/                   ← Note, Project, FileStorage
│       ├── main/resources/               ← application(-dev/-prod).properties
│       └── test/                         ← tests de integración (MockMvc)
└── frontend/                    ← SPA React + Vite
    ├── index.html               ← lang="es", título "Notitas"
    ├── vite.config.js           ← proxy /api y /uploads → localhost:8080
    └── src/
        ├── main.jsx / App.jsx   ← tema MUI, QueryClient, rutas, boot/welcome screens
        ├── index.css            ← fuente Inter, scrollbars, estilos TipTap, animaciones
        ├── components/          ← ~22 componentes + carpeta skeletons/ (9)
        ├── hooks/useProjectNotes.js
        ├── pages/               ← Login, Register, Workspace, JoinProject, SharedNote
        ├── services/api.js      ← cliente axios
        ├── store/               ← authStore, uiStore, toastStore, confirmStore
        └── utils/text.js        ← getPlainText, formatShortDate, getAssetUrl, getAvatarUrl
```

---

## 4. Backend (API REST Spring Boot)

### 4.1 Modelo de datos (entidades JPA)

| Entidad | Tabla | Campos principales | Relaciones |
|---|---|---|---|
| **User** | `users` | id, email (único), password (bcrypt), name, avatar, createdAt | 1:N Projects (owner) |
| **Project** | `projects` | id, user_id (owner), name, icon, color, description, coverImage, inviteToken (único), createdAt, updatedAt | N:1 User; 1:N Notes; 1:N ProjectMembers |
| **ProjectMember** | `project_members` | id, project_id, user_id, role (`EDITOR`/`VIEWER`, default EDITOR), joinedAt | N:1 Project; N:1 User |
| **Note** | `notes` | id, project_id, title, content (**LONGVARCHAR** → CLOB/text), coverImage, favorite, archived, deleted, shareToken (único), createdAt, updatedAt, updatedBy (userId último editor) | N:1 Project; 1:N Tags; 1:N Attachments; 1:N NoteVersions |
| **NoteVersion** | `note_versions` | id, note_id, title, content (LONGVARCHAR), createdAt, updatedBy | N:1 Note |
| **Tag** | `note_tags` | id, note_id, tag | N:1 Note (`@JsonIgnore`) |
| **Attachment** | `attachments` | id, note_id, url (`/uploads/...`), type (MIME), name, tag (etiqueta editable) | N:1 Note (`@JsonIgnore`) |

**Detalles importantes del mapeo:**
- `content` usa `@JdbcTypeCode(SqlTypes.LONGVARCHAR)` para ser portable entre H2 (CLOB) y PostgreSQL (text). Antes usaba `columnDefinition="CLOB"` que **rompía el DDL en Postgres** (fix documentado en el código).
- `createdAt`/`updatedAt` se rellenan con `@PrePersist`/`@PreUpdate`.
- Los builders de las entidades están **hechos a mano** (patrón builder simple, no Lombok).

### 4.2 Repositorios

- **UserRepository** — `findByEmail`, `existsByEmail`
- **ProjectRepository** — `findByUserIdOrderByCreatedAtDesc`, `findByIdAndUserId`, `findByInviteToken`
- **ProjectMemberRepository** — `findByUserId`, `findByProjectId`, `existsByProjectIdAndUserId`, `findByProjectIdAndUserId`
- **NoteRepository** — `findByProjectIdAndDeletedFalseOrderByUpdatedAtDesc`, `findByProjectId`, `findByProjectUserIdAndDeletedTrue` (papelera), `findFavoriteNotesForUser` (JPQL con `EXISTS` para incluir proyectos como miembro sin duplicados), `findByShareToken`, `findSearchableNotesForUser` (JPQL, filtro de texto en Java)
- **NoteVersionRepository** — `findTopByNoteIdOrderByIdDesc`, `findByNoteIdOrderByNewestFirst`, `findOldestFirst(pageable)`, `countByNoteId`, `deleteByNoteId`
- **TagRepository** / **AttachmentRepository** — `findByNoteId`

### 4.3 Servicios

**NoteServiceImpl** — lógica de negocio principal:
- **Control de acceso** en 3 niveles: `checkProjectAccess` (owner o miembro), `checkNoteAccess` (mismo criterio sobre la nota), `checkNoteEditAccess` (owner o miembro **no VIEWER** — los lectores no editan ni restauran).
- **Versiones de notas:** cada vez que cambian *realmente* título o contenido se guarda una instantánea con **deduplicación** contra la última versión (los autoguardados repetidos no duplican) y **poda** a `MAX_VERSIONS_PER_NOTE = 50` (se eliminan las más antiguas). Cambiar favorito/tags/papelera/mover de proyecto **no** crea versión. Restaurar una versión primero guarda el estado actual (la restauración es reversible).
- **Borrado en 2 pasos:** `DELETE` sobre una nota activa la marca `deleted=true` (papelera); un segundo `DELETE` la elimina físicamente junto a portada, adjuntos, imágenes inline embebidas en el contenido (`deleteContentImages`) y sus versiones (`deleteByNoteId`).
- **Búsqueda global** (`searchNotes`): consulta única con `EXISTS` para proyectos propios + como miembro; filtrado en Java con `toLowerCase().contains()` consistente para título y contenido (fix de un bug donde el título se buscaba con LOWER en SQL pero el contenido no).
- **Compartir nota:** genera `shareToken` UUID persistido; lectura pública vía `GET /api/public/notes/shared/{token}` sin autenticación.

**ProjectServiceImpl:**
- `getProjectsByUser` combina proyectos propios + proyectos donde es miembro (sin duplicados), y `mapToResponse` calcula el rol actual (`OWNER`/`EDITOR`/`VIEWER`) + creator + colaboradores.
- **Borrar proyecto** borra primero notas (con sus archivos en disco), luego miembros y luego el proyecto (fix: antes fallaba con 500 por violación de FK).
- **Invitaciones:** `inviteToken` UUID persistido; `joinProject` añade el miembro con rol `EDITOR` (o devuelve el proyecto si ya es owner/miembro).

**FileStorageServiceImpl:**
- Guarda archivos en `app.upload.dir` (por defecto `uploads/`) con nombre `UUID + extensión original`, saneado contra `..` (path traversal).
- `deleteContentImages(html)` usa regex `/uploads/[^"'()\s<>]+` para borrar imágenes inline referenciadas en el HTML del contenido.
- Servido estáticamente por `WebMvcConfig` en `/uploads/**`.

### 4.4 Controladores y endpoints (todos bajo `/api`)

**AuthController** (`/api/auth` — público):
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Autentica, devuelve `JwtResponse` + cookie httpOnly `jwt` (24h) |
| POST | `/register` | Crea usuario (valida email único, password ≥ 6) |
| POST | `/refresh` | Renovación deslizante: re-emite la cookie si el JWT es válido y la versión coincide |
| POST | `/logout` | Borra la cookie **y revoca el token**: incrementa `users.token_version` (invalida todos los JWT anteriores, en cualquier dispositivo) |

**ProjectController** (`/api/projects`):
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Proyectos del usuario (propios + como miembro) |
| GET | `/{id}` | Detalle con creator, colaboradores y rol actual |
| POST | `/` | Crear proyecto (name requerido, @NotBlank) |
| PUT | `/{id}` | Editar (owner o miembro) |
| DELETE | `/{id}` | Borrar (**solo owner** vía `findByIdAndUserId`) |
| POST | `/{id}/invite-token` | Genera token de invitación |
| POST | `/join/{token}` | Unirse a un proyecto (rol EDITOR) |
| POST | `/{id}/cover` | Subir portada (multipart → `/uploads/...`) |

**NoteController** (`/api`):
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/projects/{projectId}/notes` | Notas de un proyecto (no eliminadas, por updatedAt desc) |
| GET | `/notes/{id}` | Nota por id (con control de acceso) |
| GET | `/notes/favorites` | Favoritas (propias + de proyectos como miembro) |
| GET | `/notes/deleted` | Papelera (solo notas de proyectos propios) |
| GET | `/notes/search?query=` | Búsqueda global por título/contenido |
| POST | `/projects/{projectId}/notes` | Crear nota (crea versión inicial) |
| PUT | `/notes/{id}` | Actualizar (título, contenido, tags, favorito, archivado, deleted, projectId para mover) |
| POST | `/notes/{id}/cover` | Subir/quitar portada |
| DELETE | `/notes/{id}/cover` | Quitar portada |
| POST | `/notes/{id}/attachment` | Subir adjunto (con tag opcional) |
| PUT | `/notes/{noteId}/attachments/{attachmentId}/tag` | Renombrar tag del adjunto |
| DELETE | `/notes/{id}` | Soft delete (1ª vez) / borrado físico (2ª vez) |
| POST | `/notes/{id}/share-token` | Genera enlace público |
| GET | `/public/notes/shared/{token}` | **Público**: leer nota compartida |
| GET | `/notes/{id}/versions` | Historial de versiones |
| POST | `/notes/{id}/versions/{versionId}/restore` | Restaurar versión (solo owner/EDITOR) |
| POST | `/notes/{id}/images` | Subir imagen inline del editor (devuelve `{"url": "/uploads/..."}`) |

**UserController** (`/api/users`):
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/me` | Perfil del usuario actual (valida la sesión; lo usa el frontend al arrancar) |
| PUT | `/profile` | Actualizar nombre/email (devuelve **token nuevo** si cambió el email, porque el JWT lleva el email como subject) |
| PUT | `/profile/password` | Cambiar contraseña (valida la actual) |
| POST | `/profile/avatar` | Subir avatar (borra el anterior si era local) |

### 4.5 Seguridad

- **`WebSecurityConfig`**: CSRF desactivado, sesiones **stateless**, CORS configurable por env var (`app.cors.allowed-origins`, separados por coma). Rutas públicas: `/api/auth/**`, `/api/public/**`, `/uploads/**`, `/h2-console/**`; el resto requiere autenticación. H2 console con `frameOptions: sameOrigin`.
- **`AuthTokenFilter`**: extrae el JWT primero del header `Authorization: Bearer ...` y luego de la cookie httpOnly `jwt`; valida que el claim `tv` (token_version) coincida con el del usuario en BD (revocación).
- **`JwtUtils`**: jjwt 0.12.6, secreto desde `app.jwt.secret` (env `NOTITAS_JWT_SECRET`), expiración `app.jwt.expiration-ms` (24h por defecto). El JWT lleva el claim `tv` = `users.token_version`.
- **Revocación real**: `POST /api/auth/logout` incrementa `token_version`; los JWT anteriores dejan de ser válidos al instante.
- **Cookie SameSite configurable**: `app.cookie.samesite` (env `COOKIE_SAMESITE`) — listo para cuando la cookie pase a first-party con dominio propio.
- **Migraciones Flyway**: `V1__initial_schema.sql` (esquema base) + `V2__add_token_version.sql` (columna `token_version`), aplicadas automáticamente al arrancar.
- **`RateLimitFilter`**: limita login/register a **10 peticiones por IP en 60s** (ventana en memoria con `ConcurrentHashMap`; respeta `X-Forwarded-For`). Desactivable con `app.rate-limit.enabled=false` (el perfil test lo hace).
- **`AuthEntryPointJwt`**: respuestas 401 JSON.
- Passwords con **BCrypt** (`BCryptPasswordEncoder`).

### 4.6 Manejo de errores (`GlobalExceptionHandler`)

- `ResourceNotFoundException` → **404** `{"message": ...}`
- `AccessDeniedException` → **403** `{"message": ...}`
- `IllegalArgumentException` → **400**
- `MethodArgumentNotValidException` → **400** con el mapa de errores de campo
- Cualquier otra → **500** `{"message": "Error interno del servidor"}` (no filtra detalles)

### 4.7 Perfiles y configuración

| Perfil | BD | Notas |
|---|---|---|
| default (dev) | **H2 en memoria** (`jdbc:h2:mem:notitasdb`) | Consola H2 apagada; subida de archivos `uploads/`; JWT default en el repo (⚠️ cambiar en prod) |
| `dev` | H2 | Habilita consola H2 + SQL logging |
| `prod` | **PostgreSQL** (`DB_URL`, `DB_USER`, `DB_PASSWORD` desde env) | Puerto `PORT` (env), CORS por defecto con los 4 dominios de producción (`CORS_ALLOWED_ORIGINS`), JWT **obligatorio** (sin fallback), cookie secure, consola H2 apagada |
| `test` | H2 | Rate limit desactivado |

**`DatabaseInitializer`** (solo perfiles ≠ prod): si la BD está vacía siembra el usuario demo **`admin@notitas.com` / `password123`**, 2 proyectos (Backend Spring Boot, Frontend React) con 3 notas HTML de ejemplo, tags y versiones iniciales.

### 4.8 Tests de integración (JUnit 5 + MockMvc)

`BaseIntegrationTest` levanta el contexto Spring completo (H2 + JWT real) con `@Transactional` (rollback por test) y helpers: `register`, `login`, `createProject`, `createNote`, `bearer`, `expectApiError`.

- **AuthControllerIntegrationTest**: registro, email duplicado, validación, login ok/fallido, endpoints protegidos.
- **NoteControllerIntegrationTest**: CRUD, favoritos (incluido como miembro), búsqueda, soft/hard delete, compartir, portadas/adjuntos/imágenes (limpia archivos en `@AfterAll`), versionado (crea/deduplica/restaura/permisos).
- **ProjectControllerIntegrationTest**: CRUD, invitaciones, join, permisos owner/miembro (miembro no borra, miembro puede editar).
- **UserControllerIntegrationTest**: actualizar perfil (con nuevo token y login con el email nuevo), cambio de contraseña.

---

## 5. Frontend (React SPA)

### 5.1 Bootstrap y rutas (`App.jsx`)

- `QueryClient` global (sin refetch al focus, retry: 1).
- **Tema MUI custom**: paleta clara (primario esmeralda `#386c5f`, secundario violeta `#845EC2`, fondo `#f5f5f5`) y oscura (fondo `#0f0f23`, papel `#1a1a35`). Tipografía Inter, border radius 12, overrides de Botón (hover elevado), Card (blur/backdrop), Tooltip, inputs, etc. El tema se recrea con `useMemo` según `darkMode`.
- **Pantalla de boot** (`LoadingPage`) durante ~1.6s la primera vez (sesión), y **WelcomeScreen** animada al hacer login/logout (3.4s, con cap de seguridad de 6s; el logout guarda una "foto" del usuario para la despedida).
- **Validación de sesión al arrancar** (`refreshSession` → `/api/auth/refresh` + `/api/users/me`): si la cookie expiró o fue revocada, logout limpio. Renovación deslizante cada 6 h y al volver a la pestaña.
- **Fix prod (2026-08): tokens con firma inválida → 401, no 500.** `validateJwtToken` no capturaba `SignatureException` (firma JWT que no coincide), así que un token corrupto o re-firmado hacía explotar `/api/auth/refresh` con 500 "Error interno" (el síntoma era la sesión cerrada con error al volver). Ahora `SignatureException` devuelve 401 limpio. Cubierto con test de regresión (`refresh_withWellFormedButWrongSignature_returnsUnauthorizedNot500`).
- **Logout por inactividad** (`IdleSessionGuard`): 60 min sin actividad → diálogo "¿Sigues ahí?" → 60 s de gracia → cierra sesión (configurable con `notitas-idle-timeout-minutes`).
- **Command palette** (`Ctrl/Cmd+K`): búsqueda global de notas/proyectos + acciones rápidas (nueva nota/proyecto, tema, favoritos, papelera) con navegación por teclado.
- **UI premium**: fondo ambiental con glows de marca (theme-aware), transición suave al cambiar de tema, favicon/logo de marca (verde `#386c5f→#00C9A7`), zoom en portadas al hover, entrada en cascada del grid, FAB móvil (SpeedDial) y toasts con botón **Deshacer**.
- **Rutas** (con lazy loading):
  - `/login`, `/register` → AuthLayout
  - `/join/project/:token` → JoinProject (público)
  - `/shared/note/:token` → SharedNote (público, sin sesión)
  - `/` → Workspace (protegido: redirige a `/login`)
  - `*` → redirige a `/`

### 5.2 Stores (Zustand)

| Store | Estado clave | Notas |
|---|---|---|
| `authStore` | `user`, `isAuthenticated` | Persistido en localStorage (`auth-storage`, solo user + flag). Acciones: `login`, `register`, `logout`, `forceLogout` (invocado por interceptor 401), `updateAvatar`, `updateProfile`, `changePassword`. El JWT **no** se guarda en el store: vive en la cookie httpOnly. |
| `uiStore` | `darkMode`, `currentProjectId`, `currentNoteId`, `searchQuery`, `showWelcome`/`welcomeKind`/`welcomeUser`, `sidebarMobileOpen` | `currentProjectId` usa valores especiales: `null` = dashboard, `'favorites'`, `'trash'`, `'search'`. |
| `toastStore` | lista de toasts | Helper global `toast.success/error/info/warning`. |
| `confirmStore` | `state` del diálogo | Reemplaza `window.confirm`; helper `confirm({...})`. |

### 5.3 Cliente API (`services/api.js`)

- `API_BASE_URL = import.meta.env.VITE_API_URL || ''` → base `.../api`. `withCredentials: true` (para la cookie jwt).
- Interceptor de respuesta: en **401** llama al handler de logout forzado registrado desde `App.jsx` (`setUnauthorizedHandler`).
- El proxy de Vite reenvía `/api` y `/uploads` a `http://localhost:8080` en dev.

### 5.4 Claves de caché de React Query (convención compartida)

- `['projects']` — lista de proyectos (sidebar, dashboard, NoteList, NoteEditor, FavoritesView).
- `['notes', 'project', projectId]` — notas de un proyecto (hook `useProjectNotes`, sidebar + dashboard + NoteList).
- `['notes', 'favorites']` — favoritas (FavoritesSection, FavoritesView, NoteList) con `staleTime: 60_000`.
- `['notes', 'trash']` — papelera.
- `['notes', 'search', query]` — búsqueda.
- `['note', noteId]` — detalle de nota (editor).
- `['noteVersions', noteId]` — historial.

Las mutaciones invalidan con `invalidateQueries({ queryKey: ['notes'] })` (prefijo) para refrescar todas las vistas relacionadas.

### 5.5 Páginas y componentes principales

- **Workspace**: layout de 3 paneles — Navbar arriba; Sidebar (fija en escritorio, `Drawer` temporal en móvil); contenido con `AnimatePresence` que alterna Dashboard / Trash / Favorites / Search (NoteList+NoteEditor) / NoteEditor. NoteList y NoteEditor se cargan con `lazy()` (el editor TipTap es el chunk más pesado).
- **Navbar**: búsqueda global (al escribir → `currentProjectId = 'search'`), toggle de tema, avatar con menú (cambiar foto, editar perfil, logout). El logout limpia la caché de React Query y el estado de UI (para no filtrar datos entre usuarios).
- **Sidebar**: colapsable (72px, persistido en `localStorage`), modo acordeón/múltiple de expansión de proyectos (persistido), navegación Dashboard/Favoritos/Papelera, lista de proyectos con notas expandibles (máx. 50), CRUD de proyectos, diálogo de invitación con copiar enlace.
- **ProjectsDashboard**: vista grid (cards con portada/gradiente, conteo de notas, avatares de creador+colaboradores, acciones hover compartir/editar/borrar) y vista lista (toggle persistido), filtro local por nombre/descripción, sección **Destacados** (`FavoritesSection`) arriba, estado vacío ilustrado.
- **NoteList**: cards de notas con portada, extracto de texto plano (`getPlainText`), tags (2 máx + contador), estrella de favorito, acciones hover (papelera / restaurar / borrar definitivo), "último editor" resuelto desde los miembros del proyecto.
- **NoteEditor**: el corazón de la app.
  - TipTap con **StarterKit + Image custom con NodeView (`FloatingImageNodeView`): arrastrar la imagen con total libertad (posición absoluta en el lienzo, el alto crece solo) + redimensionar desde la esquina manteniendo proporciones; los botones de alineación devuelven la imagen al flujo del texto + Table (resizable) + TaskList/TaskItem + Placeholder**.
  - **Autoguardado con un único debounce de 800ms** para título + contenido juntos (los valores se capturan en el cierre para no perder ediciones; se cancelan pendientes al cambiar de nota/desmontar). Indicador de estado: `Guardado / Guardando... / Sin guardar` (chip en la barra de formato sticky).
  - **Pegar/arrastrar imágenes** sube el archivo a `/notes/{id}/images` e inserta la URL.
  - Barra de formato sticky: negrita, cursiva, tachado, código, H1, listas, checklist, **menú de tablas** (insertar 3x3, filas, columnas, borrar), alineación de imagen, subir imagen, undo/redo.
  - Cabecera con breadcrumbs (Proyectos › Proyecto › Nota), portada (subir/cambiar/borrar), adjuntar archivo, **mover nota a otro proyecto**, compartir enlace público, historial de versiones, favorito, papelera/restaurar.
  - Meta-fila: tags editables, avatares, último editor, fecha, **contador de palabras y minutos de lectura**.
  - **Modo solo lectura** para roles VIEWER (editor deshabilitado, chip "Sólo Lectura").
  - Estado vacío ("Selecciona una nota") con botón crear.
- **NoteHistoryDialog**: lista de versiones (fecha, autor, extracto) + previsualización HTML + restaurar (con confirmación; cancela autoguardados pendientes).
- **FavoritesView / TrashView**: grids de cards con acciones directas (quitar favorito, papelera, restaurar, borrar definitivo).
- **JoinProject**: si no hay sesión guarda el token en `localStorage` (`pending-invite-token`) y tras login en Login.jsx se redirige de vuelta a unirse. Si hay sesión, une directamente.
- **SharedNote**: página pública con tema propio (sigue `prefers-color-scheme`), renderiza el HTML de la nota con estilos completos (imágenes alineadas, tablas, checklists, código), botón "Crear mi cuenta".
- **ProfileDialog**: pestañas Perfil (nombre/email, aviso si cambia el email) y Contraseña (con mostrar/ocultar, validaciones).
- **ProjectFormDialog**: formulario de proyecto con 25 colores, **35 iconos emoji**, portada con vista previa (JPG/PNG/GIF, máx 10MB), cabecera degradada con el color elegido.
- **MemberProfileDialog**: perfil del miembro al hacer clic en un avatar.
- **Toasts / ConfirmDialog**: notificaciones y confirmación global (con framer-motion); los toasts admiten una **acción** (p. ej. botón "Deshacer" al mover una nota a la papelera, con 6 s para deshacer).
- **CommandPalette**: paleta Ctrl+K estilo Linear/Spotlight (búsqueda + acciones rápidas, navegación ↑↓/Enter/Esc).
- **MobileFab**: SpeedDial flotante en móvil (nueva nota, nuevo proyecto, cambiar tema).
- **IdleSessionGuard**: logout por inactividad con diálogo de aviso (seguro con varias pestañas).
- **FloatingImageNodeView**: NodeView de TipTap para imágenes arrastrables y redimensionables.
- **CoverImage**: imagen con fallback de color + icono (soporta GIF); prop `zoomOnHover` para zoom suave al pasar el cursor.
- **Navbar**: logo con icono de marca; `Ctrl/Cmd+K` ahora abre la command palette (antes enfocaba la búsqueda).
- **AuthorAvatars / CollaboratorsChip**: avatares apilados y chip de nº de colaboradores.
- **skeletons/**: 9 componentes de carga (AuthForm, CardsGrid, JoinProject, NoteEditor, NoteList, ProjectsDashboard, Rows, SharedNote, Sidebar) para una UX sin parpadeos.

### 5.6 Utilidades (`utils/text.js`)

- `getPlainText(html, fallback)` — extrae texto plano (DOMParser).
- `formatShortDate(iso)` — "12 mar".
- `getAssetUrl(url)` — convierte `/uploads/x` en URL absoluta con `API_BASE_URL` (reemplaza el patrón hardcodeado `http://localhost:8080` que se repetía).
- `getAvatarUrl(avatar)` — alias de `getAssetUrl`.

---

## 6. Funcionalidades y flujos clave

1. **Registro/Login** → cookie httpOnly JWT + estado en localStorage → pantalla de bienvenida animada.
2. **Proyectos** → dashboard grid/lista → dentro, notas expandibles en el sidebar → editor.
3. **Notas ricas** → TipTap (markdown al pegar, tablas, checklists, código, imágenes con alineación) con **autoguardado + historial de versiones restaurable**.
4. **Archivos** → portadas (proyectos y notas), adjuntos con tag, imágenes inline; todo en disco local `uploads/`.
5. **Favoritos** → estrella desde card o editor → vista Favoritos + sección Destacados en el dashboard.
6. **Papelera** → soft delete → restaurar o borrar definitivamente (borra también archivos e imágenes inline).
7. **Búsqueda global** → desde la navbar, resultados + editor en la misma vista.
8. **Colaboración** → enlace de invitación por proyecto (`/join/project/:token`) → el invitado entra como **EDITOR**; los VIEWER solo leen. Nota: **no hay gestión de roles en la UI** (cambiar rol, expulsar miembro) — solo se crean como EDITOR al unirse.
9. **Compartir público** → enlace `/shared/note/:token` visible sin cuenta.
10. **Imágenes flotantes** → arrastra cualquier imagen de una nota a cualquier punto del lienzo; redimensiónala desde la esquina (mantiene proporciones). La posición/tamaño se guarda en el HTML de la nota; en vistas públicas/historial se muestran centradas.
11. **Command palette** → `Ctrl/Cmd+K` para buscar notas/proyectos o ejecutar acciones sin tocar el ratón.
12. **Sesión robusta** → validación al arrancar + renovación deslizante + logout por inactividad + revocación real de tokens (`token_version`).

---

## 7. Despliegue (resumen de `DEPLOY.md`)

- **Frontend** → Vercel (`notitas.vercel.app`): `vercel.json` en la raíz apunta a `frontend/`, framework Vite, rewrites SPA. Env var `VITE_API_URL=https://<backend>/` (en build).
- **Backend** → contenedor Docker (`backend/Dockerfile`, JRE 17 alpine, usuario no-root, `SPRING_PROFILES_ACTIVE=prod`): Vercel (Docker), Railway, Render o Fly.io. Env vars: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `NOTITAS_JWT_SECRET`.
- **BD** → Supabase PostgreSQL con connection pooler (`...pooler.supabase.com:6543`). El esquema se crea solo con `ddl-auto=update`.
- **CORS de producción**: los 4 dominios (`notitas.vercel.app`, `notitas-five`, `notitas-alessander`, `notitas-cleo`) en `render.yaml` (`CORS_ALLOWED_ORIGINS`) y en el default de `application-prod.properties`.
- **Migraciones Flyway**: V1 (esquema) + V2 (token_version) se ejecutan automáticamente al arrancar en prod. En prod los archivos viven en **Supabase Storage** (no en disco local).
- ⚠️ Pendientes: fijar secreto JWT propio en prod (obligatorio, sin fallback) y dominio propio para la cookie first-party.

---

## 8. Decisiones de diseño / notas técnicas destacadas (aprendidas de los comentarios del código)

- El contenido de las notas se guarda como **HTML de TipTap** y se renderiza con `dangerouslySetInnerHTML` en las vistas públicas/preview (con estilos CSS dedicados para img alineadas, tablas y taskLists).
- **Versiones con deduplicación y límite 50** por nota; el autoguardado envía título+contenido juntos en un único debounce para evitar versiones dobles.
- `@JdbcTypeCode(LONGVARCHAR)` para portabilidad H2/Postgres (bug histórico con CLOB).
- Búsqueda y favoritos con **una sola consulta JPQL + EXISTS** (fix de problemas N+1 y de duplicados).
- Borrado de proyectos/notas **limpia archivos en disco** para no dejar huérfanos (incluidas imágenes inline vía regex).
- El frontend **comparte claves de caché** entre sidebar, dashboard y vistas para evitar refetches duplicados.
- `getAssetUrl` centraliza la construcción de URLs de assets (antes hardcodeado por componente).
- La app usa **cookies httpOnly + header Bearer** simultáneamente (API-first y web).
- Rate limit en memoria (no Redis): suficiente para el alcance actual, se pierde en multi-instancia.

---

## 9. Cómo ejecutar localmente

```bash
# Backend (Java 17)
cd backend
./mvnw spring-boot:run        # → http://localhost:8080  (usuario demo: admin@notitas.com / password123)

# Frontend
cd frontend
npm install
npm run dev                   # → http://localhost:5173 (proxy /api → 8080)

# Tests del backend
cd backend
./mvnw test

# Lint del frontend
cd frontend
npm run lint
```

---

## 10. Posibles mejoras / extensiones (observaciones del análisis)

- **Gestión de miembros en la UI**: cambiar roles (EDITOR/VIEWER), expulsar colaboradores (el backend ya soporta roles, pero no hay endpoints de gestión de miembros).
- **Dominio propio** (`app.tudominio.com` + `api.tudominio.com`): cookie first-party + `COOKIE_SAMESITE=Lax` (documentado en DEPLOY.md).
- **Supabase Auth** para login social (OAuth) si algún día se quiere.
- **Paginación/infinite scroll** para listas largas de notas (hoy `MAX_NOTES=50` en el sidebar como mitigación).
- **Tests de frontend** — hoy solo hay tests de backend.
- **Búsqueda con acentos/insensibilidad real en BD** (hoy filtrado en Java).
- **Autocompletado de invitaciones por email** (hoy el enlace es el único mecanismo).
