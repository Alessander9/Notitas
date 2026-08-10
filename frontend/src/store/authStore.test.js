import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    useToastStore.setState({ toasts: [] });
    vi.clearAllMocks();
  });

  it('login exitoso guarda el usuario y pasa rememberMe', async () => {
    api.post.mockResolvedValue({ data: { id: 1, email: 'ana@test.com', name: 'Ana', avatar: null } });

    const result = await useAuthStore.getState().login('ana@test.com', 'secret123', true);

    expect(result.success).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'ana@test.com',
      password: 'secret123',
      rememberMe: true,
    });
    expect(useAuthStore.getState().user).toEqual({ id: 1, email: 'ana@test.com', name: 'Ana', avatar: null });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('login fallido devuelve el mensaje del servidor', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Credenciales inválidas' } } });

    const result = await useAuthStore.getState().login('ana@test.com', 'mala');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Credenciales inválidas');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login con error de red devuelve mensaje genérico', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));

    const result = await useAuthStore.getState().login('ana@test.com', 'x');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Error al iniciar sesión');
  });

  it('register envía los datos correctos', async () => {
    api.post.mockResolvedValue({ data: {} });

    const result = await useAuthStore.getState().register('Ana', 'ana@test.com', 'secret123');

    expect(result.success).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Ana',
      email: 'ana@test.com',
      password: 'secret123',
    });
  });

  it('logout limpia el estado aunque la API falle', async () => {
    useAuthStore.setState({ user: { id: 1 }, isAuthenticated: true });
    api.post.mockRejectedValue(new Error('offline'));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshSession exitoso sincroniza el perfil', async () => {
    api.post.mockResolvedValue({ data: { id: 2, email: 'bea@test.com', name: 'Bea', avatar: '/uploads/a.png' } });

    const result = await useAuthStore.getState().refreshSession();

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user).toEqual({ id: 2, email: 'bea@test.com', name: 'Bea', avatar: '/uploads/a.png' });
  });

  it('refreshSession con error de red muestra toast de conexión', async () => {
    api.post.mockRejectedValue(new Error('offline'));

    const result = await useAuthStore.getState().refreshSession();

    expect(result.success).toBe(false);
    const toasts = useToastStore.getState().toasts;
    expect(toasts.some((t) => t.severity === 'error' && t.message.includes('No se pudo conectar'))).toBe(true);
  });

  it('refreshSession con 401 no muestra toast (el interceptor fuerza logout)', async () => {
    api.post.mockRejectedValue({ response: { status: 401 } });

    const result = await useAuthStore.getState().refreshSession();

    expect(result.success).toBe(false);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('forceLogout limpia el estado inmediatamente', () => {
    useAuthStore.setState({ user: { id: 1 }, isAuthenticated: true });

    useAuthStore.getState().forceLogout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('updateProfile actualiza el usuario y devuelve mensaje', async () => {
    api.put.mockResolvedValue({ data: { id: 1, email: 'nuevo@test.com', name: 'Nuevo', avatar: null } });

    const result = await useAuthStore.getState().updateProfile('Nuevo', 'nuevo@test.com');

    expect(result.success).toBe(true);
    expect(useAuthStore.getState().user).toEqual({ id: 1, email: 'nuevo@test.com', name: 'Nuevo', avatar: null });
  });

  it('changePassword reenvía el payload correcto', async () => {
    api.put.mockResolvedValue({ data: {} });

    const result = await useAuthStore.getState().changePassword('vieja', 'nueva123');

    expect(result.success).toBe(true);
    expect(api.put).toHaveBeenCalledWith('/users/profile/password', {
      currentPassword: 'vieja',
      newPassword: 'nueva123',
    });
  });

  it('updateAvatar actualiza solo el avatar', () => {
    useAuthStore.setState({ user: { id: 1, email: 'a@b.com', name: 'A', avatar: null } });

    useAuthStore.getState().updateAvatar('/uploads/nuevo.png');

    expect(useAuthStore.getState().user.avatar).toBe('/uploads/nuevo.png');
    expect(useAuthStore.getState().user.name).toBe('A');
  });
});
