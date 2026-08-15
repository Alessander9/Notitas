import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector) => selector({ register: mockRegister }),
}));

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

const fillForm = (overrides = {}) => {
  // MUI añade el asterisco de "required" al label: se busca con regex
  fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: overrides.name ?? 'Ana' } });
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: overrides.email ?? 'ana@test.com' } });
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: overrides.password ?? 'secret123' } });
  fireEvent.change(screen.getByLabelText(/Confirmar contraseña/), { target: { value: overrides.confirm ?? 'secret123' } });
};

describe('Register', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('renderiza el formulario con todos los campos', () => {
    renderRegister();

    expect(screen.getByLabelText(/Nombre completo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar contraseña/)).toBeInTheDocument();
  });

  it('valida que las contraseñas coincidan sin llamar al store', () => {
    renderRegister();
    fillForm({ password: 'abc123', confirm: 'xyz789' });

    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }));

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registra con éxito y muestra el mensaje de redirección', async () => {
    // Sin fake timers: waitFor necesita timers reales para su polling
    mockRegister.mockResolvedValue({ success: true });
    renderRegister();
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith('Ana', 'ana@test.com', 'secret123'));
    expect(screen.getByText(/Registro exitoso/)).toBeInTheDocument();
  });

  it('muestra el error del servidor si el registro falla', async () => {
    mockRegister.mockResolvedValue({ success: false, message: 'El correo ya está registrado' });
    renderRegister();
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/i }));

    await waitFor(() => expect(screen.getByText('El correo ya está registrado')).toBeInTheDocument());
  });
});
