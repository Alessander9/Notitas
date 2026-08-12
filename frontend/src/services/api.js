import axios from 'axios';
import { useUiStore } from '../store/uiStore';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://notitas-api.onrender.com' : '');
const API_URL = `${API_BASE_URL}/api`;

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// ── Detección de backend lento / sin conexión ──────────────────────────
// El backend en Render free se duerme tras la inactividad y tarda ~60s en
// despertar (cold start): en vez de dejar al usuario sin feedback, si una
// petición tarda más de SLOW_THRESHOLD_MS se muestra el banner "Conectando
// con el servidor…". Si la petición falla sin respuesta (red caída / timeout)
// se muestra "Sin conexión". Al completarse todas las peticiones pendientes
// el estado vuelve a 'ok'.
const SLOW_THRESHOLD_MS = 4000;
const MAX_RENDER_WAKE_RETRIES = 2;

let pendingRequests = 0;
const slowTimers = new WeakMap();

const setServerStatus = (status) => useUiStore.getState().setServerStatus(status);

function settleRequest(config) {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (config) {
    const timer = slowTimers.get(config);
    if (timer) {
      clearTimeout(timer);
      slowTimers.delete(config);
    }
  }
  // Solo vuelve a 'ok' cuando NO queda ninguna petición colgada
  if (pendingRequests === 0) {
    setServerStatus('ok');
  }
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // Timeout global para que una petición colgada no deje la UI bloqueada
  // para siempre. 120s porque el backend en Render free tarda ~60s en
  // despertar tras dormirse (un timeout menor fallaría justo el primer
  // request tras el idle, p. ej. el POST al crear un proyecto).
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  pendingRequests += 1;
  // Las subidas de archivos pueden tardar legítimamente: no muestran el aviso
  // "Conectando con el servidor…" (solo se contabilizan para el contador).
  const headers = config.headers;
  const contentType =
    (typeof headers?.get === 'function' ? headers.get('Content-Type') : undefined) ||
    headers?.['Content-Type'] ||
    headers?.['content-type'] ||
    '';
  if (!String(contentType).includes('multipart/form-data')) {
    const timer = setTimeout(() => setServerStatus('slow'), SLOW_THRESHOLD_MS);
    slowTimers.set(config, timer);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    settleRequest(response.config);
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    settleRequest(error.config);
    const status = error.response?.status;
    const isRenderWakeResponse = status === 502 || status === 503 || status === 504;
    // Render puede responder 503/504 mientras despierta el contenedor. No lo
    // mostramos como una caída definitiva: el interceptor inferior reintentará
    // las consultas GET y el banner informa al usuario de lo que está pasando.
    if (isRenderWakeResponse) {
      setServerStatus('slow');
    }
    // Sin respuesta del servidor: red caída o timeout (backend inaccesible).
    // Las peticiones CANCELADAS (AbortController de React Query al cambiar de
    // vista) no son una desconexión real: no muestran el banner offline.
    if (!error.response && !axios.isCancel(error) && error.code !== 'ERR_CANCELED') {
      setServerStatus('offline');
    }
    return Promise.reject(error);
  }
);

// Axios no reintenta automáticamente para no duplicar mutaciones. Las
// consultas GET sí pueden reintentarse cuando Render todavía está despertando.
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  const isGet = config?.method?.toLowerCase() === 'get';
  const hasResponse = Boolean(error.response);
  const status = error.response?.status;
  const isTransient = !hasResponse || status === 502 || status === 503 || status === 504;

  if (!isGet || !isTransient || config.__wakeRetryCount >= MAX_RENDER_WAKE_RETRIES) {
    return Promise.reject(error);
  }

  config.__wakeRetryCount = (config.__wakeRetryCount || 0) + 1;
  await new Promise((resolve) => setTimeout(resolve, config.__wakeRetryCount * 2500));
  return api(config);
});

export default api;
