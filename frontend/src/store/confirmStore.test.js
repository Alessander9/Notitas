import { describe, it, expect, beforeEach } from 'vitest';
import { useConfirmStore, confirm } from './confirmStore';

describe('confirmStore', () => {
  beforeEach(() => {
    useConfirmStore.setState({ state: null });
  });

  it('open guarda el estado del diálogo', () => {
    confirm({ title: 'Borrar', message: '¿Seguro?', onConfirm: () => {} });

    const state = useConfirmStore.getState().state;
    expect(state.title).toBe('Borrar');
    expect(state.message).toBe('¿Seguro?');
  });

  it('close vacía el estado', () => {
    confirm({ title: 'X' });

    useConfirmStore.getState().close();

    expect(useConfirmStore.getState().state).toBeNull();
  });
});
