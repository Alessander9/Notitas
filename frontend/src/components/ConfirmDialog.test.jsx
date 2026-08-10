import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';
import { useConfirmStore, confirm } from '../store/confirmStore';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    useConfirmStore.setState({ state: null });
  });

  it('no renderiza nada cuando no hay confirmación abierta', () => {
    render(<ConfirmDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra título, mensaje y botones personalizados', () => {
    confirm({ title: 'Borrar proyecto', message: 'Se perderán todas las notas', confirmLabel: 'Sí, borrar' });
    render(<ConfirmDialog />);

    expect(screen.getByText('Borrar proyecto')).toBeInTheDocument();
    expect(screen.getByText('Se perderán todas las notas')).toBeInTheDocument();
    expect(screen.getByText('Sí, borrar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('confirmar ejecuta onConfirm y cierra el diálogo', () => {
    const onConfirm = vi.fn();
    confirm({ title: '¿Seguro?', onConfirm });
    render(<ConfirmDialog />);

    fireEvent.click(screen.getByText('Confirmar'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(useConfirmStore.getState().state).toBeNull();
  });

  it('cancelar cierra sin ejecutar onConfirm', () => {
    const onConfirm = vi.fn();
    confirm({ title: '¿Seguro?', onConfirm });
    render(<ConfirmDialog />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(useConfirmStore.getState().state).toBeNull();
  });

  it('usa valores por defecto cuando no se pasan', () => {
    confirm({});
    render(<ConfirmDialog />);

    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });
});
