import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportWorkspaceBackup } from './exportWorkspace';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('exportWorkspaceBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global URL and DOM link click
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('obtiene proyectos y notas, y genera la descarga del archivo ZIP', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/projects') {
        return Promise.resolve({
          data: [{ id: 10, name: 'Mi Proyecto' }],
        });
      }
      if (url === '/notes/project/10') {
        return Promise.resolve({
          data: [
            {
              id: 101,
              title: 'Nota 1',
              content: '<p>Contenido de prueba</p>',
              tags: ['tag1'],
              createdAt: '2026-08-15T00:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/notes/favorites') {
        return Promise.resolve({
          data: [],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    await exportWorkspaceBackup();

    expect(api.get).toHaveBeenCalledWith('/projects');
    expect(api.get).toHaveBeenCalledWith('/notes/project/10');
    expect(clickSpy).toHaveBeenCalled();
  });
});
