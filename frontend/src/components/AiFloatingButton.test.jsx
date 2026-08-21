import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiFloatingButton from './AiFloatingButton';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

vi.mock('../store/uiStore');
vi.mock('../store/authStore');

describe('AiFloatingButton', () => {
  const toggleAiDrawer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockReturnValue({
      isAuthenticated: true,
    });
    useUiStore.mockReturnValue({
      aiDrawerOpen: false,
      currentNoteId: 1,
      toggleAiDrawer,
    });
  });

  it('renderiza el botón flotante con texto e icono de CleoBot', () => {
    render(<AiFloatingButton />);
    expect(screen.getByText('CleoBot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir asistente de ia notitas/i })).toBeInTheDocument();
  });

  it('ejecuta toggleAiDrawer al hacer click en el botón flotante', () => {
    render(<AiFloatingButton />);
    const button = screen.getByRole('button', { name: /abrir asistente de ia notitas/i });
    fireEvent.click(button);
    expect(toggleAiDrawer).toHaveBeenCalledTimes(1);
  });

  it('se oculta cuando el drawer de IA está abierto (aiDrawerOpen: true)', () => {
    useUiStore.mockReturnValue({
      aiDrawerOpen: true,
      toggleAiDrawer,
    });
    const { container } = render(<AiFloatingButton />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('se oculta cuando el usuario no está autenticado (isAuthenticated: false)', () => {
    useAuthStore.mockReturnValue({
      isAuthenticated: false,
    });
    const { container } = render(<AiFloatingButton />);
    expect(container.querySelector('button')).toBeNull();
  });
});
