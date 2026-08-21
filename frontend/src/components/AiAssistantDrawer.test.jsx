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

vi.mock('../hooks/useProjectNotes', () => ({
  useProjectNotes: () => ({ notes: [], isLoading: false }),
}));

vi.mock('../store/confirmStore', () => ({
  confirm: vi.fn().mockResolvedValue(true),
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
    renderWithClient(<AiAssistantDrawer forceRender />);

    expect(screen.getByRole('heading', { name: /CleoBot/ })).toBeInTheDocument();
    expect(screen.getByText(/Multi-IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Groq • OpenRouter • Google Gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/tu asistente virtual/i)).toBeInTheDocument();
  });

  it('muestra los chips de prompts sugeridos', () => {
    renderWithClient(<AiAssistantDrawer forceRender />);

    expect(screen.getByText('Atajos y funciones')).toBeInTheDocument();
    expect(screen.getByText('Modo Zen y Slash')).toBeInTheDocument();
    expect(screen.getByText('Ideas de proyecto')).toBeInTheDocument();
  });

  it('permite escribir un mensaje y enviarlo a la API de IA', async () => {
    renderWithClient(<AiAssistantDrawer forceRender />);

    const input = screen.getByPlaceholderText(/Pregunta algo a CleoBot/i);
    fireEvent.change(input, { target: { value: '¿Cómo funciona Notitas?' } });
    expect(input.value).toBe('¿Cómo funciona Notitas?');

    const sendBtn = screen.getByLabelText(/Enviar mensaje a CleoBot/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Respuesta generada por CleoBot')).toBeInTheDocument();
    });
  });

  it('permite abrir el menú de traspaso a la nota y disparar el evento de inserción', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    useUiStore.setState({
      aiDrawerOpen: true,
      currentNoteId: 123,
      currentProjectId: 1,
    });

    renderWithClient(<AiAssistantDrawer forceRender />);

    const input = screen.getByPlaceholderText(/Pregunta algo a CleoBot/i);
    fireEvent.change(input, { target: { value: 'Resume esta nota' } });
    const sendBtn = screen.getByLabelText(/Enviar mensaje a CleoBot/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Respuesta generada por CleoBot')).toBeInTheDocument();
    });

    const transferBtn = screen.getByRole('button', { name: /Traspasar/i });
    expect(transferBtn).toBeInTheDocument();
    fireEvent.click(transferBtn);

    // Debe abrirse el menú de opciones
    expect(screen.getByText('Insertar en el cursor')).toBeInTheDocument();
    expect(screen.getByText('Añadir al final')).toBeInTheDocument();
    expect(screen.getByText('Reemplazar contenido')).toBeInTheDocument();

    // Clic en "Insertar en el cursor"
    const insertItem = screen.getByText('Insertar en el cursor');
    fireEvent.click(insertItem);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notitas-ai-insert',
        detail: expect.objectContaining({
          content: expect.stringContaining('Respuesta generada por CleoBot'),
          mode: 'insert',
        }),
      })
    );
  });
});

