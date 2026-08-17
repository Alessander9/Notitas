import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuickNoteModal from './QuickNoteModal';
import { useUiStore } from '../store/uiStore';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/projects') {
        return Promise.resolve({
          data: [
            { id: 1, name: 'Proyecto Alpha', currentUserRole: 'OWNER', color: '#386c5f', icon: 'rocket' },
            { id: 2, name: 'Proyecto Beta', currentUserRole: 'EDITOR', color: '#845EC2', icon: 'folder' },
            { id: 3, name: 'Solo Lectura', currentUserRole: 'VIEWER', color: '#999999', icon: 'book' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    }),
    post: vi.fn().mockResolvedValue({
      data: { id: 101, title: 'Nota rápida creada', content: '<p>Contenido</p>' },
    }),
  },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('QuickNoteModal', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({
      currentProjectId: null,
      currentNoteId: null,
    });
  });

  it('renderiza el modal con los proyectos donde el usuario puede escribir', async () => {
    const onClose = vi.fn();
    renderWithClient(<QuickNoteModal open={true} onClose={onClose} defaultProjectId={1} />);

    expect(screen.getByText(/Creación rápida de nota/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Título de la nota/i)).toBeInTheDocument();
  });

  it('permite añadir etiquetas y escribir contenido', async () => {
    const onClose = vi.fn();
    renderWithClient(<QuickNoteModal open={true} onClose={onClose} defaultProjectId={1} />);

    const tagInput = screen.getByPlaceholderText(/Agregar etiqueta/i);
    fireEvent.change(tagInput, { target: { value: 'urgente' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    expect(await screen.findByText('#urgente')).toBeInTheDocument();
  });
});
