import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

const { mockLogin, mockSetShowWelcome } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSetShowWelcome: vi.fn(),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector) => selector({ login: mockLogin }),
}));

vi.mock('../store/uiStore', () => ({
  useUiStore: (selector) => selector({ setShowWelcome: mockSetShowWelcome }),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renderiza el formulario y el checkbox de recordarme marcado por defecto', () => {
    renderLogin();

    // MUI añade el asterisco de "required" al label: se busca con regex
    expect(screen.getByLabelText(/Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByText(/30 días/)).toBeInTheDocument();
  });

  it('envía email, contraseña y rememberMe al enviar', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('checkbox')); // desmarcar rememberMe
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('ana@test.com', 'secret123', false));
    expect(mockSetShowWelcome).toHaveBeenCalledWith(true);
  });

  it('muestra el error del servidor cuando el login falla', async () => {
    mockLogin.mockResolvedValue({ success: false, message: 'Credenciales inválidas' });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'mala' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument());
  });

  it('redirige a la invitación pendiente tras login exitoso', async () => {
    localStorage.setItem('pending-invite-token', 'tok-abc');
    localStorage.setItem('pending-invite-type', 'project');
    mockLogin.mockResolvedValue({ success: true });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(localStorage.getItem('pending-invite-token')).toBeNull();
  });
});
