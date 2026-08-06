import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, options = {}) => {
    const id = ++idCounter;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          message,
          severity: options.severity || 'success',
          duration: options.duration || 3500,
        },
      ],
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// Convenience helpers usable from anywhere (mutations, event handlers…)
export const toast = {
  success: (message, options) => useToastStore.getState().push(message, { severity: 'success', ...options }),
  error: (message, options) => useToastStore.getState().push(message, { severity: 'error', ...options }),
  info: (message, options) => useToastStore.getState().push(message, { severity: 'info', ...options }),
  warning: (message, options) => useToastStore.getState().push(message, { severity: 'warning', ...options }),
};
