import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Cola de respuestas de la BD: cada llamada a query() consume una
let queryResults = [];
const deleteFromCloudinary = mock.fn(async () => {});
const uploadBufferToCloudinary = mock.fn(async () => ({ secure_url: 'https://res.cloudinary.com/notitas/covers/projects/x.jpg' }));

mock.module('../../config/db.js', {
  exports: {
    query: async (sql) => {
      const next = queryResults.shift();
      if (next === undefined) throw new Error(`query inesperado en test: ${String(sql).slice(0, 80)}`);
      return next;
    },
  },
});

mock.module('../../services/cloudinaryService.js', {
  exports: {
    uploadBufferToCloudinary,
    deleteFromCloudinary,
  },
});

const pc = await import('../../controllers/projectController.js');

const makeRes = () => {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const projectRow = (overrides = {}) => ({
  id: 7,
  user_id: 1,
  name: 'Proyecto A',
  icon: 'folder',
  color: '#386c5f',
  description: 'Descripción',
  cover_image: null,
  invite_token: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const creatorRow = () => ({ id: 1, name: 'Ana', email: 'ana@test.com', avatar: null });

beforeEach(() => {
  queryResults = [];
  deleteFromCloudinary?.mock.resetCalls();
  uploadBufferToCloudinary?.mock.resetCalls();
});

test.describe('createProject', () => {
  test('rechaza con 400 si falta el nombre', async () => {
    const req = { body: { description: 'sin nombre' }, user: { id: 1 } };
    const res = makeRes();
    await pc.createProject(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'El nombre del proyecto es requerido');
  });

  test('crea el proyecto y responde formateado con rol OWNER', async () => {
    queryResults = [
      { rows: [projectRow({ name: 'Nuevo Proyecto' })] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { body: { name: 'Nuevo Proyecto' }, user: { id: 1 } };
    const res = makeRes();
    await pc.createProject(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Nuevo Proyecto');
    assert.equal(res.body.id, 7);
    assert.equal(res.body.currentUserRole, 'OWNER');
    assert.equal(res.body.creator.name, 'Ana');
  });
});

test.describe('deleteProjectCover', () => {
  test('responde 403 si el usuario no tiene permisos', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { id: 7 }, user: { id: 2 } };
    const res = makeRes();
    await pc.deleteProjectCover(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Sin permisos para modificar el proyecto');
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });

  test('elimina la portada de Cloudinary y la deja en NULL', async () => {
    const cover = 'https://res.cloudinary.com/notitas/image/upload/v123/notitas/covers/projects/abc.jpg';
    queryResults = [
      { rows: [projectRow({ cover_image: cover })] },
      { rows: [projectRow({ cover_image: null })] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.deleteProjectCover(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.coverImage, null);
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls[0].arguments[0], cover);
  });

  test('no llama a Cloudinary si la portada no es de Cloudinary', async () => {
    queryResults = [
      { rows: [projectRow({ cover_image: 'https://mi-dominio.com/img/portada.png' })] },
      { rows: [projectRow({ cover_image: null })] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.deleteProjectCover(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });

  test('funciona aunque el proyecto no tenga portada', async () => {
    queryResults = [
      { rows: [projectRow()] },
      { rows: [projectRow()] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.deleteProjectCover(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });
});

test.describe('updateProject', () => {
  test('responde 403 si el colaborador es VIEWER', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { id: 7 }, body: { name: 'Nuevo' }, user: { id: 2 } };
    const res = makeRes();
    await pc.updateProject(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'No tienes permisos para editar este proyecto');
  });

  test('permite editar al colaborador EDITOR', async () => {
    queryResults = [
      { rows: [projectRow({ name: 'Antes' })] },
      { rows: [projectRow({ name: 'Después' })] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { id: 7 }, body: { name: 'Después' }, user: { id: 2 } };
    const res = makeRes();
    await pc.updateProject(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Después');
  });
});

test.describe('deleteProject', () => {
  test('responde 403 si no es el dueño', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { id: 7 }, user: { id: 2 } };
    const res = makeRes();
    await pc.deleteProject(req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Solo el creador puede eliminar el proyecto');
  });

  test('elimina el proyecto con sus dependencias en cascada', async () => {
    queryResults = [
      { rows: [projectRow()] },
      ...Array.from({ length: 8 }, () => ({ rows: [] })),
    ];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.deleteProject(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Proyecto eliminado exitosamente');
  });
});

test.describe('joinProject', () => {
  test('responde 404 con un token de invitación inválido', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { token: 'no-existe' }, user: { id: 2, name: 'Ana' } };
    const res = makeRes();
    await pc.joinProject(req, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Enlace de invitación inválido o expirado');
  });

  test('responde con el proyecto si el usuario ya es el dueño', async () => {
    queryResults = [
      { rows: [projectRow()] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { token: 'abc' }, user: { id: 1, name: 'Ana' } };
    const res = makeRes();
    await pc.joinProject(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 7);
  });

  test('agrega al colaborador y notifica al dueño', async () => {
    queryResults = [
      { rows: [projectRow({ user_id: 9 })] },
      { rows: [] }, // INSERT project_members
      { rows: [] }, // INSERT notifications
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const req = { params: { token: 'abc' }, user: { id: 2, name: 'Luis' } };
    const res = makeRes();
    await pc.joinProject(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 7);
  });
});

test.describe('getInviteToken', () => {
  test('responde 403 si no es el dueño', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { id: 7 }, user: { id: 2 } };
    const res = makeRes();
    await pc.getInviteToken(req, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('devuelve el token existente sin regenerarlo', async () => {
    queryResults = [{ rows: [projectRow({ invite_token: 'tok-123' })] }];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.getInviteToken(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.inviteToken, 'tok-123');
  });

  test('genera un token nuevo si el proyecto no tiene uno', async () => {
    queryResults = [{ rows: [projectRow()] }, { rows: [] }];
    const req = { params: { id: 7 }, user: { id: 1 } };
    const res = makeRes();
    await pc.getInviteToken(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.match(res.body.inviteToken, /^[a-f0-9]{32}$/);
  });
});
