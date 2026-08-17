import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Scratchpad from './Scratchpad';

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Scratchpad', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza el botón flotante minimizado y permite abrir el bloc', () => {
    renderWithClient(<Scratchpad />);

    const button = screen.getByText(/Bloc Rápido/i);
    expect(button).toBeInTheDocument();

    // Abrir el scratchpad
    fireEvent.click(button);

    expect(screen.getByPlaceholderText(/Escribe ideas rápidas/i)).toBeInTheDocument();
    expect(screen.getByText(/Bloc Efímero/i)).toBeInTheDocument();
  });

  it('guarda el contenido en localStorage y permite limpiarlo', () => {
    renderWithClient(<Scratchpad />);

    // Abrir
    fireEvent.click(screen.getByText(/Bloc Rápido/i));

    const textarea = screen.getByPlaceholderText(/Escribe ideas rápidas/i);
    fireEvent.change(textarea, { target: { value: 'Idea para sprint 4' } });

    expect(localStorage.getItem('notitas-scratchpad-content')).toBe('Idea para sprint 4');

    // Botón de limpiar
    const clearBtn = screen.getByRole('button', { name: /Limpiar bloc/i });
    fireEvent.click(clearBtn);

    expect(textarea.value).toBe('');
    expect(localStorage.getItem('notitas-scratchpad-content')).toBe('');
  });
});
