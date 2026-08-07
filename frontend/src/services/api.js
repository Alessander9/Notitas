import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE_URL}/api`;

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  // Timeout global para que una petición colgada no deje la UI bloqueada
  // para siempre. 120s porque el backend en Render free tarda ~60s en
  // despertar tras dormirse (un timeout menor fallaría justo el primer
  // request tras el idle, p. ej. el POST al crear un proyecto).
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
