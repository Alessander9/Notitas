import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NoteTemplatesDialog from './NoteTemplatesDialog';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { id: 999, title: 'Plantilla Test', content: '<p>Test</p>' } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
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

describe('NoteTemplatesDialog', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente el catálogo de plantillas con el total de plantillas', () => {
    renderWithClient(
      <NoteTemplatesDialog open={true} onClose={vi.fn()} onSelectTemplate={vi.fn()} />
    );

    expect(screen.getByText('Catálogo de Plantillas')).toBeInTheDocument();
    expect(screen.getByText(/plantillas disponibles/i)).toBeInTheDocument();
    expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument();
  });

  it('contiene las categorías principales en los chips de filtro', () => {
    renderWithClient(
      <NoteTemplatesDialog open={true} onClose={vi.fn()} onSelectTemplate={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⭐ Mis Plantillas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vida Diaria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Productividad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salud' })).toBeInTheDocument();
  });

  it('filtra plantillas cuando el usuario escribe en el buscador', async () => {
    renderWithClient(
      <NoteTemplatesDialog open={true} onClose={vi.fn()} onSelectTemplate={vi.fn()} />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar plantilla/i);
    fireEvent.change(searchInput, { target: { value: 'Medicamentos' } });

    await waitFor(() => {
      const results = screen.getAllByText(/Medicamentos y Salud/i);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  it('llama a onSelectTemplate cuando el usuario selecciona y aplica una plantilla', async () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    renderWithClient(
      <NoteTemplatesDialog open={true} onClose={handleClose} onSelectTemplate={handleSelect} />
    );

    const applyButton = screen.getByText('Usar esta plantilla');
    fireEvent.click(applyButton);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('abre el diálogo para crear una nueva plantilla personalizada', async () => {
    renderWithClient(
      <NoteTemplatesDialog open={true} onClose={vi.fn()} onSelectTemplate={vi.fn()} />
    );

    const newBtn = screen.getByText('Nueva Plantilla');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Plantilla Personalizada')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ej: Mi Rutina de Mañana...')).toBeInTheDocument();
    });
  });
});
