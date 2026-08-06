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
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setCurrentProject: (id) => set({ currentProjectId: id, currentNoteId: null }),
  setCurrentNote: (id) => set({ currentNoteId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowWelcome: (show, kind = 'login') => set({ showWelcome: show, welcomeKind: kind }),
  setWelcomeUser: (user) => set({ welcomeUser: user }),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
}));
