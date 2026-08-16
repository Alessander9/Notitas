import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AiAssistantDrawer from './AiAssistantDrawer';
import { useUiStore } from '../store/uiStore';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({
      data: {
        message: 'Respuesta generada por CleoBot',
        provider: 'Groq',
        model: 'llama-3.3-70b-versatile',
      },
    }),
  },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AiAssistantDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({
      aiDrawerOpen: true,
      currentNoteId: null,
      currentProjectId: null,
    });
  });

  it('renderiza el header de CleoBot y mensaje de bienvenida', () => {
    renderWithClient(<AiAssistantDrawer />);

    expect(screen.getByRole('heading', { name: /CleoBot/ })).toBeInTheDocument();
    expect(screen.getByText(/Multi-IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Groq • OpenRouter • Google Gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/tu asistente virtual/i)).toBeInTheDocument();
  });

  it('muestra los chips de prompts sugeridos', () => {
    renderWithClient(<AiAssistantDrawer />);

    expect(screen.getByText('Atajos y funciones')).toBeInTheDocument();
    expect(screen.getByText('Modo Zen y Slash')).toBeInTheDocument();
    expect(screen.getByText('Ideas de proyecto')).toBeInTheDocument();
  });

  it('permite escribir un mensaje y enviarlo a la API de IA', async () => {
    renderWithClient(<AiAssistantDrawer />);

    const input = screen.getByPlaceholderText(/Pregunta algo a CleoBot/i);
    fireEvent.change(input, { target: { value: '¿Cómo funciona Notitas?' } });
    expect(input.value).toBe('¿Cómo funciona Notitas?');

    const sendBtn = screen.getByLabelText(/Enviar mensaje a CleoBot/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Respuesta generada por CleoBot')).toBeInTheDocument();
    });
  });
});
