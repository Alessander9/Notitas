# 🚀 Deploy de Notitas

Guía para el **primer despliegue en producción**. La arquitectura es:

| Pieza | Tecnología | Dónde vive |
|---|---|---|
| Frontend (React + Vite) | SPA estática | **Vercel** → `notitas-cleo.vercel.app` (dominio único) |
| Backend (Node.js + Express) | API REST en contenedor | **Render** / **Koyeb** (arranque instantáneo) |
| Base de datos | PostgreSQL | **Supabase** |
| Archivos & Multimedia | **Cloudinary CDN** | Optimización automática de imágenes, portadas y adjuntos |

> El backend **no** puede ejecutarse como función estática en Vercel: es una JVM.
> El `Dockerfile` incluido en `backend/` permite desplegarlo como **Docker** en
> Koyeb, Render, Railway o cualquier host de contenedores. La configuración de BD ya está lista para Supabase.

---

## ⭐ Deploy a costo cero 24/7 (Koyeb + Supabase + Vercel)

Combinación 100 % gratuita sin apagar el backend (sin tarjeta de crédito):

| Pieza | Servicio gratis | Detalle |
|---|---|---|
| Frontend (React + Vite) | **Vercel** (Hobby) | `notitas-cleo.vercel.app` — dominio único de producción |
| Backend (Spring Boot) | **Koyeb** (free Nano) | Usa `backend/Dockerfile` o `koyeb.yaml`. **No se duerme (24/7)** |
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

## 1. Frontend → Vercel (`notitas-cleo.vercel.app`)

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

Al finalizar verás la URL. **El dominio de producción es `notitas-cleo.vercel.app`**
(único): configura los dominios del proyecto en el dashboard
(Project → Settings → Domains → `notitas-cleo.vercel.app`).

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
   `CORS_ALLOWED_ORIGINS=https://notitas-cleo.vercel.app`, `NOTITAS_JWT_SECRET`
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
  -e CORS_ALLOWED_ORIGINS='https://notitas-cleo.vercel.app' \
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

- [ ] Abre `https://notitas-cleo.vercel.app` → redirige a `/login`.
- [ ] Regístrate un usuario nuevo (en prod **no** hay datos demo).
- [ ] Crea un proyecto, una nota, sube una portada y un adjunto.
- [ ] Prueba un enlace compartido `/shared/note/:token` (funciona por los rewrites SPA).
- [ ] Prueba una invitación `/join/project/:token`.
- [ ] Revisa la consola del navegador (sin errores CORS: el backend debe permitir
      el origen `https://notitas-cleo.vercel.app` — ya configurado vía `CORS_ALLOWED_ORIGINS`).

## 5. Estabilidad y monitoreo en producción (recomendado)

El plan free de Render se duerme a los ~15 min sin tráfico y tarda ~1 min en
**despertar**. El frontend ya aguanta ese retraso (timeout de 120 s en axios,
tope de 12 s en la pantalla de verificación de sesión y toast si el servidor
no responde), pero para que el backend esté **siempre despierto** y te avise
si cae:

1. **UptimeRobot** (gratis): crea un monitor HTTP(S) apuntando a
   `https://notitas-api.onrender.com/api/public/health`, con intervalo de
   **5 min** y alertas por email. Los pings cada 5 min evitan que Render
   duerma la instancia (el idle es a los ~15 min) y recibes un correo si
   el servicio se cae.
   - El endpoint devuelve `200` con `{"status":"ok","database":"up"}`
     cuando todo funciona, y `503` con
     `{"status":"degraded","database":"unreachable"}` si la base de datos
     no responde. En ese caso Render marca el contenedor como unhealthy y lo
     **reinicia solo** (auto-recuperación).

2. **Recuperación manual si el backend cae** (como cuando se quedó sin
   responder): Render → servicio `notitas-api` → pestaña **Logs**. Causas
   típicas de que no arranque:
   - `NOTITAS_JWT_SECRET` vacío → en prod la app **no arranca sin él**.
   - `DB_URL` / `DB_USER` / `DB_PASSWORD` incorrectos o Supabase caído.
   - Sin memoria en el plan free (OOM): se ve en los logs del servicio.
   Revisa las env vars, pulsa **Restart** (o lanza un redeploy) y verifica que
   el health check devuelva 200 antes de seguir.

## Notas y pendientes conocidos

- **Archivos subidos (portadas, adjuntos, avatares):** en el flujo a costo cero
  se guardan en **Supabase Storage** (por defecto en prod). Si quieres disco
  local en un host con disco persistente, fija `APP_STORAGE_PROVIDER=local`
  (`app.upload.dir=uploads`).
- **`ddl-auto=update`:** práctico para el primer deploy; migrar a Flyway
  antes de crecer.
- **Secreto JWT:** el repo **no** contiene ningún secreto por defecto. En
  desarrollo (H2 en memoria) `JwtUtils` genera una clave aleatoria por arranque
  si falta `NOTITAS_JWT_SECRET`. En producción es **obligatorio** fijarlo
  (la app no arranca sin él). Genera uno con:
  `openssl rand -base64 48` (en Windows:
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`).
- **Sesión:** el JWT vive en una cookie `httpOnly` (no en localStorage);
  `localStorage` solo guarda el perfil y el flag de sesión.

## Sesión y autenticación (implementado + recomendaciones)

Lo implementado en el backend y el frontend:

- **JWT en cookie httpOnly** (`jwt`, Secure + SameSite=None en prod, 24 h) y,
  para clientes API, en header `Authorization: Bearer`.
- **Renovación deslizante:** `POST /api/auth/refresh` re-emite la cookie si el
  JWT es válido. El frontend lo llama al arrancar, cada 6 h y al volver a la
  pestaña: la sesión ya no se corta a las 24 h mientras la app está en uso.
- **Validación al arrancar:** `GET /api/users/me`; si la cookie expiró o fue
  revocada, el frontend cierra sesión limpiamente (adiós al "se cierra" por
  sesión vencida).
- **Logout por inactividad:** componente `IdleSessionGuard` — tras 60 min sin
  actividad avisa con un diálogo y cierra la sesión en 60 s si no hay
  interacción. Configurable con `notitas-idle-timeout-minutes` en localStorage.
- **Revocación real de sesiones:** campo `users.token_version` (migración `V2`)
  embebido en el JWT (claim `tv`); el logout lo incrementa e invalida todos los
  tokens emitidos antes, en cualquier dispositivo.

Recomendaciones pendientes (Nivel 2):

- **Dominio propio** (p. ej. `app.tudominio.com` + `api.tudominio.com`): la
  cookie pasaría a ser first-party y dejaría de depender del permiso de
  third-party cookies de cada navegador (Safari ITP, bloqueos en Chrome). Al
  hacerlo, fija `COOKIE_SAMESITE=Lax` (o `Strict`) — la propiedad
  `app.cookie.samesite` ya es configurable por env var.
- **Supabase Auth** como alternativa gestionada si algún día se quiere login
  social (OAuth); ya se usa Supabase para la BD y el storage.

## Redeploy

```bash
npx vercel --prod          # frontend (reconstruye con las env vars actuales)
```

---

Para cualquier duda durante el deploy, pega aquí la salida de `npx vercel` y
la reviso contigo.
