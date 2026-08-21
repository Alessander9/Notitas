import { create } from 'zustand';

export const useUiStore = create((set) => ({
  darkMode: true,
  currentProjectId: null,
  currentNoteId: null,
  searchQuery: '',
  showWelcome: false,
  welcomeKind: 'login',
  welcomeUser: null,
  sidebarMobileOpen: false,
  notesViewMode: (() => {
    try {
      return localStorage.getItem('notitas-view-mode') || 'masonry';
    } catch {
      return 'masonry';
    }
  })(),
  // Estado de conectividad con el backend: 'ok' | 'slow' | 'offline'
  // ('slow' = petición tardando más de lo normal, p. ej. cold start en Render)
  serverStatus: 'ok',
  zenMode: false,
  aiDrawerOpen: false,
  scratchpadOpen: false,
  // Interlineado del editor (persisted in localStorage)
  editorLineHeight: (() => {
    try {
      const stored = parseFloat(localStorage.getItem('notitas-line-height'));
      return isNaN(stored) ? 1.6 : stored;
    } catch {
      return 1.6;
    }
  })(),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
  setZenMode: (val) => set({ zenMode: val }),
  toggleAiDrawer: () => set((state) => ({ aiDrawerOpen: !state.aiDrawerOpen })),
  setAiDrawerOpen: (open) => set({ aiDrawerOpen: open }),
  toggleScratchpad: () => set((state) => ({ scratchpadOpen: !state.scratchpadOpen })),
  mobileNavbarHidden: false,
  setMobileNavbarHidden: (val) => set({ mobileNavbarHidden: val }),
  setCurrentProject: (id) => set({ currentProjectId: id, currentNoteId: null, mobileNavbarHidden: false }),
  setCurrentNote: (id) => set({ currentNoteId: id, mobileNavbarHidden: false }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowWelcome: (show, kind = 'login') => set({ showWelcome: show, welcomeKind: kind }),
  setWelcomeUser: (user) => set({ welcomeUser: user }),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  setServerStatus: (status) => set({ serverStatus: status }),
  setNotesViewMode: (mode) => {
    try {
      localStorage.setItem('notitas-view-mode', mode);
    } catch {}
    set({ notesViewMode: mode });
  },
  setEditorLineHeight: (value) => {
    try {
      localStorage.setItem('notitas-line-height', String(value));
    } catch {}
    set({ editorLineHeight: value });
  },
}));
