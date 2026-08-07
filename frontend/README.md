# 📝 Notitas — Frontend

SPA de **Notitas** construida con **React 19 + Vite 8** y **MUI v6**.

> 📚 **Documentación completa del proyecto (monorepo):** [`../README.md`](../README.md)
> · Guía de despliegue: [`../DEPLOY.md`](../DEPLOY.md)

## Stack

- React 19 + Vite 8 (JSX, sin TypeScript)
- MUI v6 + Emotion (tema claro/oscuro custom)
- TipTap 2.11 (editor enriquecido: tablas, checklists, imágenes flotantes/redimensionables)
- Zustand 5 (stores: auth, ui, toast, confirm)
- TanStack React Query 5 (caché del servidor)
- framer-motion 13 (animaciones)
- react-router-dom 7 (rutas con lazy loading)
- oxlint (lint)

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server en http://localhost:5173 (proxy `/api` y `/uploads` → `localhost:8080`) |
| `npm run build` | Build de producción a `dist/` |
| `npm run lint` | Lint con oxlint |
| `npm run preview` | Sirve el build |

## Estructura

```
src/
├── components/   ← ~22 componentes + skeletons/ (9)
├── hooks/        ← useProjectNotes.js
├── pages/        ← Login, Register, Workspace, JoinProject, SharedNote
├── services/     ← api.js (cliente axios con interceptor 401)
├── store/        ← authStore, uiStore, toastStore, confirmStore
└── utils/        ← text.js (getPlainText, formatShortDate, getAssetUrl, getAvatarUrl)
```

## Entorno

- `VITE_API_URL` — URL base de la API (sin `/api`). Si se omite, apunta a `http://localhost:8080` vía el proxy de Vite. Se incrusta en el build (cambiar requiere redeploy).
- Usuario demo local: `admin@notitas.com` / `password123` (lo siembra el backend con H2 en memoria).
