import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NoteEditor from './NoteEditor';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

vi.mock('../services/api', () => {
  const note = {
    id: 5,
    title: 'Nota de prueba',
    content: '<p>hola</p>',
    tags: [],
    projectId: 1,
    hasPin: false,
  };
  const emptyNote = {
    id: 6,
    title: '',
    content: '',
    tags: [],
    projectId: 1,
    hasPin: false,
  };
  return {
    default: {
      get: vi.fn((url) => {
        const path = String(url);
        if (path === '/projects') return Promise.resolve({ data: [] });
        if (path.includes('/notes') && path.includes('/projects/')) return Promise.resolve({ data: [] });
        if (path.includes('/comments')) return Promise.resolve({ data: [] });
        if (path.includes('/attachments')) return Promise.resolve({ data: [] });
        if (path.includes('/versions')) return Promise.resolve({ data: [] });
        if (path === '/notes/5') return Promise.resolve({ data: note });
        if (path === '/notes/6') return Promise.resolve({ data: emptyNote });
        return Promise.resolve({ data: {} });
      }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
});

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('NoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({
      currentNoteId: 5,
      currentProjectId: 1,
      zenMode: false,
      aiDrawerOpen: false,
    });
    useAuthStore.setState({
      user: { id: 1, name: 'Test', email: 'test@test.com', avatar: null },
    });
  });

  it('renderiza el editor sin lanzar errores de inicialización (regresión TDZ)', async () => {
    expect(() => renderWithClient(<NoteEditor />)).not.toThrow();
    // El título de la nota aparece en el breadcrumb tras cargar la nota;
    // confirma que el editor renderizó completo sin errores de TDZ.
    expect(await screen.findByText('Nota de prueba', {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('al cambiar de nota sincroniza el editor con la nueva nota (regresión cambio de nota)', async () => {
    renderWithClient(<NoteEditor />);
    expect(await screen.findByText('Nota de prueba', {}, { timeout: 8000 })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('Título de la nota');
    expect(titleInput.value).toBe('Nota de prueba');

    // Seleccionar otra nota (vacía): el editor debe dejar de mostrar la anterior
    act(() => {
      useUiStore.setState({ currentNoteId: 6 });
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Título de la nota').value).toBe('');
    }, { timeout: 8000 });
  });
});
