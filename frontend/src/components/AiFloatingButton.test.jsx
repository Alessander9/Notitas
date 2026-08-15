import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiFloatingButton from './AiFloatingButton';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

vi.mock('../store/authStore');
vi.mock('../store/uiStore');

describe('AiFloatingButton', () => {
  const toggleAiDrawer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: { id: 1, name: 'Alessander', email: 'test@example.com' },
    });
    useUiStore.mockReturnValue({
      aiDrawerOpen: false,
      toggleAiDrawer,
    });
  });

  it('renderiza el botón flotante con texto e icono de Notitas AI cuando el usuario está autenticado', () => {
    render(<AiFloatingButton />);
    expect(screen.getByText('Notitas AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir asistente de ia notitas/i })).toBeInTheDocument();
  });

  it('ejecuta toggleAiDrawer al hacer click en el botón flotante', () => {
    render(<AiFloatingButton />);
    const button = screen.getByRole('button', { name: /abrir asistente de ia notitas/i });
    fireEvent.click(button);
    expect(toggleAiDrawer).toHaveBeenCalledTimes(1);
  });

  it('no renderiza nada si el usuario no está autenticado', () => {
    useAuthStore.mockReturnValue({ user: null });
    const { container } = render(<AiFloatingButton />);
    expect(container.firstChild).toBeNull();
  });
});
