# 📝 Notitas

**Organiza tus proyectos, notas y recursos en un solo lugar.**

Notitas es una aplicación web moderna (SPA) para crear **proyectos**, escribir **notas con un editor enriquecido (TipTap)**, dibujar en **pizarras interactivas**, usar **calculadoras y herramientas integradas**, organizar en vistas de **Kanban, Calendario y Timeline**, asociar notas con **enlaces bidireccionales (`[[wikilinks]]`)**, colaborar en tiempo real con **menciones `@usuario`** y **asistente virtual CleoBot (Multi-IA)**.

> 🚀 **Producción Web:** [https://notitas-cleo.vercel.app](https://notitas-cleo.vercel.app) · **Backend REST API:** Node.js Express en Vercel / PostgreSQL en Supabase.

---

## 📑 Tabla de contenidos

1. [✨ Características](#-características)
2. [🛠️ Stack tecnológico](#️-stack-tecnológico)
3. [⚡ Rendimiento y Arquitectura](#-rendimiento-y-arquitectura)
4. [📂 Estructura del repositorio](#-estructura-del-repositorio)
5. [🚀 Cómo ejecutar localmente](#-cómo-ejecutar-localmente)
6. [🔐 Configuración y variables de entorno](#-configuración-y-variables-de-entorno)
7. [📡 API REST (Endpoints principales)](#-api-rest-endpoints-principales)
8. [🧪 Tests y Calidad](#-tests-y-calidad)
9. [🚢 Despliegue](#-despliegue)

---

## ✨ Características

### 🚀 Asistente Inteligente CleoBot (Multi-IA)
- **Split-Pane Dockeable en Escritorio**: Panel lateral interactivo integrado al espacio de trabajo (no bloquea la pantalla). Modo Drawer para dispositivos móviles.
- **Conciencia del Proyecto Completo**: CleoBot analiza el contenido de todas las notas del proyecto activo para responder preguntas globales (ej. *"¿Qué acordamos en la reunión del martes?"*).
- **Multi-Proveedor**: Integración con Groq, OpenRouter y Google Gemini con streaming en tiempo real.

### 📝 Editor Enriquecido & Herramientas de Escritura
- **TipTap Core**: Negrita, cursiva, subrayado, tachado, encabezados H1-H3, listas ordenadas, viñetas, checklists interactivos, tablas dinámicas y bloques de código.
- **Toolbar Flotante de Selección**: Barra contextual que aparece automáticamente al seleccionar texto para formateo ágil.
- **Slash Commands (`/`)**: Menú rápido para insertar medios, tablas, plantillas, asistente IA, pizarra o calculadora.
- **Enlaces Bidireccionales (`[[wikilinks]]`) & Backlinks**: Escribe `[[` para enlazar notas del proyecto. Panel inferior de *Backlinks* que muestra qué notas mencionan a la nota actual.
- **Pizarra de Dibujo & Diagramas (`/canvas`)**: Dibuja bocetos vectoriales con lápiz, flechas, rectángulos, círculos y texto, e incrusta el resultado como imagen en la nota.
- **Calculadora Integrada (`/calc`)**: Evalúa operaciones matemáticas y pega el resultado o cálculo completo con 1 clic.
- **Imágenes Flotantes y Redimensionables**: Arrastra y redimensiona imágenes libremente en el lienzo.
- **Compresión WebP Automática**: Las imágenes pegadas o subidas se comprimen y optimizan en el navegador antes de enviarse al servidor.
- **Modo Zen (`Ctrl+Shift+F`)**: Oculta barras y elementos de distracción con focus trap accesible.
- **Protección por PIN**: Bloquea notas sensibles con contraseña de 4 dígitos.

### 📌 Bloc de Notas Adhesivo Flotante (*Scratchpad*)
- **Acceso Global (`Alt+S`)**: Botón adhesivo en la esquina inferior izquierda para ideas efímeras, enlaces rápidos o apuntes al vuelo.
- **Autoguardado Local**: Persistencia instantánea en `localStorage` con contador de caracteres y botón de copiado.
- **Convertir a Nota Formal**: Transforma el borrador del bloc en una nota de proyecto en 1 clic.

### ⚡ Creación Rápida de Notas (`Alt+N`)
- **Acceso Inmediato**: Botón con icono de rayo en el Navbar, Sidebar y menú móvil FAB para guardar notas seleccionando el proyecto de destino, título, etiquetas y favorito al instante.

### 📊 Vistas Múltiples de Notas
- **Galería / Tarjetas**: Visualización con portadas, extracción automática de imágenes y badges de autores.
- **Lista Compacta**: Vista tabular con fecha y orden personalizable.
- **Kanban por Checklists**: Clasificación automática en *To Do*, *In Progress* y *Done* según el estado de las tareas de cada nota.
- **Calendario & Timeline**:
  - **Vista Mensual**: Cuadrícula con notas mapeadas a días específicos.
  - **Vista Timeline**: Línea de tiempo cronológica filtrada por fecha de creación, última edición o recordatorios.
- **Reordenamiento Manual Drag & Drop**: Arrastra notas para ordenarlas a gusto con persistencia local por proyecto.
- **Vista Minimizada en Proyectos**: Al colapsar la lista de notas, muestra los avatares circulares del Creador (con insignia `★`), Colaboradores y miniaturas circulares de las notas.

### 👥 Colaboración, Equipos y Permisos
- **Roles Granulares**: Propietario (`OWNER`), Editor (`EDITOR`) y Visor (`VIEWER`) a nivel de proyecto y nota.
- **Invitaciones por Enlace**: Generación de tokens seguros para unirse a proyectos o colaborar en notas.
- **Comentarios con `@Menciones`**: Sección de comentarios con popover de autocompletado al escribir `@` y lista de miembros.
- **Indicador de Editores Activos**: Pulso verde y avatares de colaboradores que editaron la nota en los últimos 5 minutos.
- **Compartir Públicamente**: Vista pública de lectura (`/s/:token`) con **Tabla de Contenidos (TOC)** interactiva.

### 📁 Plantillas de Proyecto y Nota
- **Plantillas de Proyecto**: Creación con 1 clic de estructuras completas (ej. *Sprint de Desarrollo* con Backlog, Standup y Retrospectiva, o *Proyecto Editorial*).
- **Catálogo de Plantillas de Notas**: Insertables desde el editor o slash command `/template`.

### ⏰ Recordatorios y Notificaciones
- **Recordatorios Integrados**: Configura fecha y hora en cualquier nota (`remind_at`) con alertas automáticas.
- **Notificaciones Agrupadas**: Campana de notificaciones con conteo colapsable por proyecto y nota.

### 📤 Exportación Profesional
- Exportación directa a **PDF** (con estilos `@media print` de fondo blanco optimizado), **PNG**, **Word (`.docx`)** y **Markdown (`.md`)**.

---

## 🛠️ Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| **React 18** | Arquitectura modular de componentes y hooks |
| **Vite 6** | Bundler ultrarrápido con HMR y Rollup |
| **Material UI (MUI v5)** | Sistema de diseño, temas claro/oscuro y componentes base |
| **TipTap v2 (ProseMirror)** | Motor de edición de texto enriquecido |
| **TanStack React Query v5** | Gestión de caché asíncrona, paginación infinita y *Optimistic Updates* |
| **Zustand** | Gestión de estado global atómico (UI, Auth, Toasts, Confirm Dialogs) |
| **Framer Motion** | Animaciones fluidas, transiciones de slide y paneles dockeables |
| **Vitest & Testing Library** | Pruebas unitarias y de integración de componentes |

### Backend
| Tecnología | Uso |
|---|---|
| **Node.js (ES Modules)** | Entorno de ejecución en servidor |
| **Express 4** | API REST estructurada con middlewares |
| **PostgreSQL (Supabase)** | Base de datos relacional con extensiones `pg_trgm` y transacciones |
| **Compression (Gzip/Brotli)** | Middleware de compresión de respuestas HTTP |
| **JWT & Cookies HttpOnly** | Autenticación con renovación deslizante y control de `token_version` |
| **Cloudinary** | Almacenamiento y optimización de imágenes en la nube |
| **Bcryptjs** | Hasheo seguro de contraseñas y PINs |

---

## ⚡ Rendimiento y Arquitectura

1. **Code-Splitting y Manual Chunks (`vite.config.js`)**:
   - Chunks aislados para `@tiptap`, `@mui`, `react-dom`, `@tanstack/react-query`, `framer-motion` y librerías de exportación (`jspdf`, `docx`, `html2canvas`).
2. **Carga Perezosa de Modales (`React.lazy` + `Suspense`)**:
   - Diálogos pesados (`CanvasModal`, `CalculatorModal`, `NoteHistoryDialog`, `MediaPickerModal`, etc.) se descargan únicamente cuando el usuario los solicita.
3. **Compresión de Imágenes en Cliente a WebP (`imageCompression.js`)**:
   - Redimensionamiento y compresión en `<canvas>` antes de la subida, reduciendo el consumo de ancho de banda hasta un 70%.
4. **Virtualización CSS Nativa (`content-visibility: auto`)**:
   - Las tarjetas de notas fuera del viewport omiten su costo de layout hasta que el usuario hace scroll, manteniendo 60/120 FPS.
5. **Índices GIN Trigram en Base de Datos (`pg_trgm`)**:
   - Búsquedas de texto ultra-rápidas sobre títulos y contenidos sin escaneos secuenciales lentos.
6. **Service Worker con Stale-While-Revalidate (`sw.js`)**:
   - Cargas instantáneas (0 ms) en visitas recurrentes y soporte de PWA.
7. **Micro-Debouncing en TipTap**:
   - Detecciones de autocompletado y atajos diferidas con `requestAnimationFrame` para eliminar micro-stutter al escribir rápido.

---

## 📂 Estructura del repositorio

```
Notitas/
├── frontend/
│   ├── public/                ← Service Worker (sw.js), manifest, iconos PWA
│   ├── src/
│   │   ├── components/        ← NoteEditor, NoteList, Navbar, Sidebar,
│   │   │                        CanvasModal, CalculatorModal, Scratchpad,
│   │   │                        CalendarTimelineView, KanbanView, QuickNoteModal,
│   │   │                        FloatingSelectionToolbar, WikiLinkMenu, BacklinksPanel...
│   │   ├── hooks/             ← useProjectNotes, useNoteReminders, usePaginatedNotes...
│   │   ├── pages/             ← Workspace, SharedNote, Login, Register, JoinProject...
│   │   ├── services/          ← Cliente Axios centralizado (api.js)
│   │   ├── store/             ← uiStore, authStore, toastStore, confirmStore
│   │   ├── utils/             ← exportNote, imageCompression, text
│   │   └── index.css          ← Estilos globales, print styles y virtualización CSS
│   └── vite.config.js         ← Configuración de Vite, proxy y manualChunks
│
└── backend/
    ├── src/
    │   ├── config/            ← Conexión PostgreSQL (db.js) e inicialización de índices
    │   ├── controllers/       ← noteController, projectController, authController, aiController...
    │   ├── middleware/        ← auth, errorHandler, upload, rateLimiter
    │   ├── routes/            ← Enrutadores REST (/notes, /projects, /auth, /ai, /templates...)
    │   ├── services/          ← Integraciones con IA, Cloudinary y correos
    │   └── app.js             ← Inicialización de Express, CORS y compression
    └── server.js              ← Entry point del servidor HTTP
```

---

## 🚀 Cómo ejecutar localmente

### Requisitos
- **Node.js 20+**
- **PostgreSQL** (local o instancia de Supabase/Neon)

### 1. Clonar e Instalar Dependencias

```bash
git clone https://github.com/Alessander9/Notitas.git
cd Notitas

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### 2. Iniciar Servidores de Desarrollo

```bash
# Terminal 1 - Backend (http://localhost:8080)
cd backend
npm run dev

# Terminal 2 - Frontend con Vite (http://localhost:5173)
cd frontend
npm run dev
```

Abre **http://localhost:5173** en tu navegador.

---

## 🔐 Configuración y variables de entorno

### Backend (`backend/.env`)
```env
PORT=8080
DATABASE_URL=postgresql://usuario:password@host:5432/notitas
JWT_SECRET=tu_clave_secreta_jwt
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
GROQ_API_KEY=tu_api_key_groq
OPENROUTER_API_KEY=tu_api_key_openrouter
GEMINI_API_KEY=tu_api_key_gemini
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8080/api
```

---

## 📡 API REST (Endpoints principales)

| Módulo | Método | Ruta | Descripción |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Iniciar sesión (setea cookie HttpOnly) |
| | `POST` | `/api/auth/register` | Registro de usuario |
| | `POST` | `/api/auth/logout` | Cierre de sesión y revocación |
| **Proyectos** | `GET` | `/api/projects` | Listar proyectos del usuario |
| | `POST` | `/api/projects` | Crear nuevo proyecto |
| | `POST` | `/api/projects/:id/notes` | Crear nota dentro de un proyecto |
| **Notas** | `GET` | `/api/notes/:id` | Obtener detalle completo de una nota |
| | `PUT` | `/api/notes/:id` | Actualizar nota (título, contenido, tags, favoritos) |
| | `DELETE` | `/api/notes/:id` | Enviar a papelera / eliminación definitiva |
| | `GET` | `/api/notes/search?query=` | Búsqueda full-text en títulos y contenidos |
| | `POST` | `/api/notes/:id/images` | Subir imagen inline a Cloudinary |
| **IA** | `POST` | `/api/ai/chat` | Chat con streaming de CleoBot (con contexto del proyecto) |
| **Público** | `GET` | `/api/public/notes/:token` | Consulta de nota compartida sin autenticación |

---

## 🧪 Tests y Calidad

```bash
# Ejecutar linter ultrarrápido (Oxlint) en frontend
cd frontend
npm run lint

# Ejecutar suite de pruebas unitarias y de componentes (Vitest)
cd frontend
npm test

# Ejecutar tests de integración del backend
cd backend
npm test
```

---

## 🚢 Despliegue

La aplicación está lista para despliegue continuo en **Vercel**:
- **Frontend**: Compilación estática con `npm run build` apuntando a CDN global.
- **Backend Serverless**: Configurado en `backend/vercel.json` para ejecutar las rutas de Node.js en funciones serverless con pooling optimizado.

---

**Desarrollado con ❤️ para organizar ideas, código y proyectos.**
