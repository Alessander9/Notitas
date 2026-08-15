import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      darkMode: true,
      currentProjectId: null,
      currentNoteId: null,
      searchQuery: '',
      showWelcome: false,
      welcomeKind: 'login',
      welcomeUser: null,
      sidebarMobileOpen: false,
    });
  });

  it('toggleDarkMode alterna el tema', () => {
    expect(useUiStore.getState().darkMode).toBe(true);
    useUiStore.getState().toggleDarkMode();
    expect(useUiStore.getState().darkMode).toBe(false);
    useUiStore.getState().toggleDarkMode();
    expect(useUiStore.getState().darkMode).toBe(true);
  });

  it('setCurrentProject fija el proyecto y limpia la nota actual', () => {
    useUiStore.getState().setCurrentNote(42);
    useUiStore.getState().setCurrentProject(7);
    expect(useUiStore.getState().currentProjectId).toBe(7);
    expect(useUiStore.getState().currentNoteId).toBeNull();
  });

  it('setCurrentNote fija la nota actual', () => {
    useUiStore.getState().setCurrentNote(42);
    expect(useUiStore.getState().currentNoteId).toBe(42);
  });

  it('setSearchQuery guarda la consulta', () => {
    useUiStore.getState().setSearchQuery('spring');
    expect(useUiStore.getState().searchQuery).toBe('spring');
  });

  it('setShowWelcome guarda el tipo de bienvenida', () => {
    useUiStore.getState().setShowWelcome(true, 'logout');
    expect(useUiStore.getState().showWelcome).toBe(true);
    expect(useUiStore.getState().welcomeKind).toBe('logout');
  });

  it('setWelcomeUser guarda el usuario de la despedida', () => {
    const user = { name: 'Ana' };
    useUiStore.getState().setWelcomeUser(user);
    expect(useUiStore.getState().welcomeUser).toEqual(user);
  });

  it('setSidebarMobileOpen controla el drawer móvil', () => {
    useUiStore.getState().setSidebarMobileOpen(true);
    expect(useUiStore.getState().sidebarMobileOpen).toBe(true);
  });

  it('toggleZenMode y setZenMode alternan el modo concentración', () => {
    expect(useUiStore.getState().zenMode).toBe(false);
    useUiStore.getState().toggleZenMode();
    expect(useUiStore.getState().zenMode).toBe(true);
    useUiStore.getState().setZenMode(false);
    expect(useUiStore.getState().zenMode).toBe(false);
  });

  it('toggleAiDrawer y setAiDrawerOpen alternan el panel de IA', () => {
    expect(useUiStore.getState().aiDrawerOpen).toBe(false);
    useUiStore.getState().toggleAiDrawer();
    expect(useUiStore.getState().aiDrawerOpen).toBe(true);
    useUiStore.getState().setAiDrawerOpen(false);
    expect(useUiStore.getState().aiDrawerOpen).toBe(false);
  });
});
