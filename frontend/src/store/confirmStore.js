import { create } from 'zustand';

/**
 * Estado global del diálogo de confirmación (reemplaza window.confirm).
 * state = { title, message, confirmLabel, cancelLabel, color, onConfirm }
 */
export const useConfirmStore = create((set) => ({
  state: null,
  open: (opts) => set({ state: opts }),
  close: () => set({ state: null }),
}));

export const confirm = (opts) => useConfirmStore.getState().open(opts);
