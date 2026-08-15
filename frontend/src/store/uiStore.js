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
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
  setZenMode: (val) => set({ zenMode: val }),
  toggleAiDrawer: () => set((state) => ({ aiDrawerOpen: !state.aiDrawerOpen })),
  setAiDrawerOpen: (open) => set({ aiDrawerOpen: open }),
  setCurrentProject: (id) => set({ currentProjectId: id, currentNoteId: null }),
  setCurrentNote: (id) => set({ currentNoteId: id }),
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
}));
