import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore, toast } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('push añade un toast con valores por defecto', () => {
    const id = useToastStore.getState().push('Hola');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].message).toBe('Hola');
    expect(toasts[0].severity).toBe('success');
    expect(toasts[0].duration).toBe(3500);
    expect(toasts[0].action).toBeNull();
  });

  it('push respeta opciones y genera ids únicos', () => {
    const a = useToastStore.getState().push('A', { severity: 'error', duration: 1000 });
    const b = useToastStore.getState().push('B', { severity: 'warning' });

    expect(a).not.toBe(b);
    expect(useToastStore.getState().toasts.map((t) => t.severity)).toEqual(['error', 'warning']);
  });

  it('push admite una acción (p. ej. Deshacer)', () => {
    const onClick = () => {};
    useToastStore.getState().push('Nota movida', { action: { label: 'Deshacer', onClick } });

    expect(useToastStore.getState().toasts[0].action).toEqual({ label: 'Deshacer', onClick });
  });

  it('dismiss elimina solo el toast indicado', () => {
    const a = useToastStore.getState().push('A');
    const b = useToastStore.getState().push('B');

    useToastStore.getState().dismiss(a);

    expect(useToastStore.getState().toasts.map((t) => t.id)).toEqual([b]);
  });

  it('clear vacía la lista', () => {
    useToastStore.getState().push('A');
    useToastStore.getState().push('B');

    useToastStore.getState().clear();

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('helpers de toast usan la severidad correcta', () => {
    toast.success('s');
    toast.error('e');
    toast.info('i');
    toast.warning('w');

    expect(useToastStore.getState().toasts.map((t) => t.severity)).toEqual(['success', 'error', 'info', 'warning']);
  });
});
