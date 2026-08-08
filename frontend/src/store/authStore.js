import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { toast } from './toastStore';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { id, name, avatar } = response.data;
          set({
            user: { id, email, name, avatar },
            isAuthenticated: true,
          });
          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Error al iniciar sesión',
          };
        }
      },
      register: async (name, email, password) => {
        try {
          await api.post('/auth/register', { name, email, password });
          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Error al registrarse',
          };
        }
      },
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignorar errores — limpiamos el estado local de todas formas
        }
        set({ user: null, isAuthenticated: false });
      },
      /**
       * Renueva la cookie JWT (POST /api/auth/refresh) y sincroniza el perfil.
       * Se llama al arrancar la app y periódicamente mientras haya sesión.
       * Devuelve { success: false } si el token expiró o fue revocado; en ese
       * caso el interceptor 401 ya habrá forzado el logout.
       */
      refreshSession: async () => {
        try {
          const response = await api.post('/auth/refresh');
          const { id, email, name, avatar } = response.data;
          set({ user: { id, email, name, avatar }, isAuthenticated: true });
          return { success: true };
        } catch (error) {
          // 401 → el interceptor ya fuerza el logout; los fallos de red (sin
          // respuesta del servidor) se avisan para que la pantalla de carga
          // no parezca un cuelgue silencioso.
          if (!error.response) {
            toast.error('No se pudo conectar con el servidor. Inténtalo de nuevo en unos segundos.');
          }
          return { success: false };
        }
      },
      forceLogout: () => {
        set({ user: null, isAuthenticated: false });
      },
      updateAvatar: (avatarUrl) => {
        set((state) => ({
          user: state.user ? { ...state.user, avatar: avatarUrl } : null
        }));
      },
      updateProfile: async (name, email) => {
        try {
          const response = await api.put('/users/profile', { name, email });
          const { id, name: newName, email: newEmail, avatar } = response.data;
          set({
            user: { id, email: newEmail, name: newName, avatar },
            isAuthenticated: true,
          });
          return { success: true, message: 'Perfil actualizado correctamente' };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Error al actualizar el perfil',
          };
        }
      },
      changePassword: async (currentPassword, newPassword) => {
        try {
          await api.put('/users/profile/password', { currentPassword, newPassword });
          return { success: true, message: 'Contraseña actualizada correctamente' };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Error al cambiar la contraseña',
          };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
