# 🚀 Deploy de Notitas

Guía para el **primer despliegue en producción**. La arquitectura es:

| Pieza | Tecnología | Dónde vive |
|---|---|---|
| Frontend (React + Vite) | SPA estática | **Vercel** → `notitas.vercel.app` |
| Backend (Spring Boot) | API REST en contenedor | Vercel (Docker), Railway, Render o Fly.io |
| Base de datos | PostgreSQL | **Supabase** |

> El backend **no** puede ejecutarse como función estática en Vercel: es una JVM.
> El `Dockerfile` incluido en `backend/` permite desplegarlo como **Docker** en
> Vercel u otro host. La configuración de BD ya está lista para Supabase.

---

## ⭐ Deploy a costo cero (recomendado)

Combinación 100 % gratuita (sin tarjeta de crédito):

| Pieza | Servicio gratis | Detalle |
|---|---|---|
| Frontend (React + Vite) | **Vercel** (Hobby) | `notitas.vercel.app` — ya configurado en `vercel.json` |
| Backend (Spring Boot) | **Render** (free web service) | Usa `backend/Dockerfile` vía `render.yaml`. Se duerme a los ~15 min sin tráfico (tarda ~1 min en despertar). 750 h/mes: suficiente para 24/7 |
| Base de datos | **Supabase** (free) | PostgreSQL con pooler; 500 MB gratis |
| Archivos (portadas, adjuntos, avatares, imágenes) | **Supabase Storage** (free) | Bucket público `uploads` (1 GB). El backend ya lo soporta con `APP_STORAGE_PROVIDER=supabase` |

> ⚠️ Los archivos **no** pueden vivir en el disco del backend en Render free
> (es efímero: se borra en cada reinicio/redeploy). Por eso el proyecto ya
> incluye la migración a Supabase Storage: `SupabaseStorageService` sube/borra
> en la nube y `UploadsRedirectController` redirige `/uploads/**` al bucket
> público, así el frontend no cambia nada.

### Pasos

1. **Base de datos + Storage en Supabase** (15 min):
   1. Crea un proyecto en [supabase.com](https://supabase.com).
   2. En **Project Settings → Database → Connection string** copia la del
      **pooler** (`aws-0-<region>.pooler.supabase.com:6543`).
      `DB_URL` = esa cadena, `DB_USER` = `postgres.<project-ref>`, `DB_PASSWORD` = contraseña.
   3. Crea el **bucket público** `uploads` (SQL Editor):
      ```sql
      insert into storage.buckets (id, name, public)
      values ('uploads', 'uploads', true);
      ```
   4. Copia `SUPABASE_URL` (Settings → API → Project URL) y
      `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role).
      > 🔒 La service_role key es un secreto potente: solo va en el backend
      > (env var de Render), **nunca** en el frontend.

2. **Backend en Render** (5 min):
   1. Sube el repo a GitHub.
   2. render.com → **New → Blueprint** → conecta el repo. Detecta `render.yaml`.
   3. Rellena los secretos: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `SUPABASE_URL`,
      `SUPABASE_SERVICE_ROLE_KEY`, `NOTITAS_JWT_SECRET` (genera uno con
      `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`).
   4. Deploy. Tu URL será algo como `https://notitas-api.onrender.com`.

3. **Frontend en Vercel** (5 min, ver sección 1):
   - Añade la env var `VITE_API_URL=https://notitas-api.onrender.com`
     (sin `/api`) en Vercel → Project → Settings → Environment Variables → Production.
   - Redeploy (`npx vercel --prod`).

4. **Checklist:** login/registro, crear proyecto + portada, nota + adjunto,
   compartir nota pública (`/shared/note/:token`), invitación (`/join/project/:token`).

---

## 0. Requisitos previos

- Node.js 20+ (el proyecto usa Vite 8 y React 19).
- Cuenta en [vercel.com](https://vercel.com) y en [supabase.com](https://supabase.com).
- (Opcional) Repositorio Git: solo es imprescindible si quieres el flujo
  "Import Project from GitHub". Con la CLI no hace falta.

---

## 1. Frontend → Vercel (`notitas.vercel.app`)

El `vercel.json` vive en `frontend/` y activa los rewrites de SPA (rutas como
`/login`, `/shared/note/:token` funcionan).

> ⚠️ **Importante (CLI Vercel ≥ v56):** `rootDirectory` ya NO es válido dentro
de `vercel.json`. Ahora es una **configuración del proyecto**: en el dashboard
(Project → Settings → General → Root Directory = `frontend`) o vía API. Sin
esto, Vercel intentará buildear desde la raíz del repo y fallará.

### Opción A — CLI (rápida)

```bash
# 1. Login (abre el navegador para autenticarte)
npx vercel login

# 2. Desde la raíz del proyecto: crea el proyecto y vincula el directorio
npx vercel link --yes --project notitas   # nombre en minúsculas

# 3. Fija Root Directory = frontend (configuración del proyecto):
#    dashboard → Project → Settings → General → Root Directory → frontend
#    (o vía API: PATCH /v9/projects/notitas con {"rootDirectory":"frontend"})

# 4. Variable de entorno VITE_API_URL (producción y preview)
echo 'https://<tu-backend>' | vercel env add VITE_API_URL production
echo 'https://<tu-backend>' | vercel env add VITE_API_URL preview

# 5. Deploy de previsualización (opcional, genera una URL de test)
npx vercel

# 6. Deploy a producción
npx vercel --prod
```

Al finalizar verás la URL. El alias por defecto es `notitas-XXXX.vercel.app`;
si consigues el alias libre `notitas.vercel.app`, resérvalo en el dashboard
(Project → Settings → Domains).

### Opción B — Dashboard + GitHub

1. Sube el proyecto a GitHub (la raíz es un monorepo: `frontend/` + `backend/`).
2. En vercel.com: **Add New → Project → Import** tu repo.
3. En **Root Directory** elige `frontend`.
4. Framework Preset: **Vite** (lo detecta solo).
5. **Deploy**.

> Cualquiera de las dos opciones usa el `vercel.json` de la raíz; no hace
> falta tocar nada más para el build.

### Variables de entorno del frontend

| Variable | Valor | Dónde |
|---|---|---|
| `VITE_API_URL` | `https://<tu-backend>/` (sin `/api`) | Vercel → Project → Settings → Environment Variables (Production) |

**Importante:** Vite incrusta las variables **en tiempo de build**. Si cambias
la URL, hay que redeployar (`npx vercel --prod`). Si la dejas vacía, el frontend
apuntará a `http://localhost:8080` (inútil en producción).

---

## 2. Base de datos → Supabase (PostgreSQL)

1. En Supabase crea un proyecto nuevo.
2. Ve a **Project Settings → Database → Connection string**.
3. Para la API (driver JDBC) usa la cadena del **connection pooler**:

```
jdbc:postgresql://aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

- `DB_USER` → `postgres.<project-ref>`
- `DB_PASSWORD` → la contraseña de la base (o la de service_role si usas el pooler transaccional con el usuario correcto).

> En el primer arranque el backend crea el esquema automáticamente
> (`ddl-auto=update`). Para producción madura conviene migrar a
> Flyway/Liquibase (ver sección 4).

---

## 3. Backend → API en contenedor

El backend ya trae el **perfil `prod`** (`application-prod.properties`) que usa
PostgreSQL/Supabase y desactiva datos demo y la consola H2.

### Opción A — Vercel (Docker)

Vercel soporta builds con Dockerfile. Crea un **segundo proyecto** de Vercel
con la API:

1. ⚠️ **Importante:** en el dashboard del nuevo proyecto fija **Root Directory =
   `backend`**. Si lo dejas en la raíz, el `vercel.json` de la raíz (que apunta
   a `frontend`) hará que se despliegue el frontend otra vez en vez de la API.
2. Vercel detecta el `backend/Dockerfile` y lo construye.
3. Variables de entorno del backend:
   `DB_URL`, `DB_USER`, `DB_PASSWORD`,
   `CORS_ALLOWED_ORIGINS=https://notitas.vercel.app`, `NOTITAS_JWT_SECRET`
   (el `Dockerfile` ya activa `SPRING_PROFILES_ACTIVE=prod` y escucha en `$PORT`).

### Opción B — Railway / Render / Fly.io (recomendada)

Más simple que Vercel para una JVM: no usan `vercel.json`, solo el Dockerfile.
Cualquiera de estos acepta el Dockerfile directamente:

```bash
cd backend
docker build -t notitas-api .
docker run --rm -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_URL='jdbc:postgresql://aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require' \
  -e DB_USER='postgres.<ref>' \
  -e DB_PASSWORD='<password>' \
  -e CORS_ALLOWED_ORIGINS='https://notitas.vercel.app' \
  -e NOTITAS_JWT_SECRET='<secreto propio — generarlo: ver "Secreto JWT" en la sección 4>' \
  notitas-api
```

Render/Railway permiten "Deploy from Dockerfile" apuntando al repo con
root directory `backend`.

### Verificación local contra Supabase

```bash
cd backend
SPRING_PROFILES_ACTIVE=prod \
DB_URL='jdbc:postgresql://aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require' \
DB_USER='postgres.<ref>' DB_PASSWORD='<password>' \
./mvnw spring-boot:run
```

---

## 4. Checklist post-deploy

- [ ] Abre `https://notitas.vercel.app` → redirige a `/login`.
- [ ] Regístrate un usuario nuevo (en prod **no** hay datos demo).
- [ ] Crea un proyecto, una nota, sube una portada y un adjunto.
- [ ] Prueba un enlace compartido `/shared/note/:token` (funciona por los rewrites SPA).
- [ ] Prueba una invitación `/join/project/:token`.
- [ ] Revisa la consola del navegador (sin errores CORS: el backend debe permitir
      el origen `https://notitas.vercel.app` — ya configurado vía `CORS_ALLOWED_ORIGINS`).

## Notas y pendientes conocidos

- **Archivos subidos (portadas, adjuntos, avatares):** en el flujo a costo cero
  se guardan en **Supabase Storage** (por defecto en prod). Si quieres disco
  local en un host con disco persistente, fija `APP_STORAGE_PROVIDER=local`
  (`app.upload.dir=uploads`).
- **`ddl-auto=update`:** práctico para el primer deploy; migrar a Flyway
  antes de crecer.
- **Secreto JWT:** el valor por defecto es público en el repo; en producción
  fija `NOTITAS_JWT_SECRET` propio. Genera uno con:
  `openssl rand -base64 48` (en Windows:
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`).
- **Almacenamiento de sesión:** los tokens JWT viven en `localStorage`; si
  quieres máxima seguridad, migra a cookies `httpOnly` (pendiente).

## Redeploy

```bash
npx vercel --prod          # frontend (reconstruye con las env vars actuales)
```

---

Para cualquier duda durante el deploy, pega aquí la salida de `npx vercel` y
la reviso contigo.
