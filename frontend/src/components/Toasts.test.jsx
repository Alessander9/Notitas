import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toasts from './Toasts';
import { useToastStore, toast } from '../store/toastStore';

describe('Toasts', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renderiza los toasts activos con su mensaje', () => {
    useToastStore.getState().push('Nota guardada');
    useToastStore.getState().push('Error al guardar', { severity: 'error' });

    render(<Toasts />);

    expect(screen.getByText('Nota guardada')).toBeInTheDocument();
    expect(screen.getByText('Error al guardar')).toBeInTheDocument();
  });

  it('se auto-descarta tras la duración configurada', () => {
    vi.useFakeTimers();
    toast.success('Temporal', { duration: 500 });

    render(<Toasts />);
    expect(screen.getByText('Temporal')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // El dismiss se ejecutó (el estado se limpia; AnimatePresence puede mantener
    // el nodo durante la animación de salida, así que se verifica el store)
    expect(useToastStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('el botón de acción ejecuta su callback y cierra el toast', () => {
    const onUndo = vi.fn();
    useToastStore.getState().push('Nota movida a la papelera', {
      action: { label: 'Deshacer', onClick: onUndo },
    });

    render(<Toasts />);

    fireEvent.click(screen.getByText('Deshacer'));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
