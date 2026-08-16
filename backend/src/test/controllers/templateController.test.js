import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Cola de respuestas de la BD: cada llamada a query() consume una
let queryResults = [];

mock.module('../../config/db.js', {
  exports: {
    query: async (sql) => {
      const next = queryResults.shift();
      if (next === undefined) throw new Error(`query inesperado en test: ${String(sql).slice(0, 80)}`);
      return next;
    },
  },
});

const tc = await import('../../controllers/templateController.js');

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

const templateRow = (overrides = {}) => ({
  id: 3,
  user_id: 1,
  title: 'Plantilla Test',
  description: null,
  icon: '📝',
  category: 'Personalizadas',
  content: '<p>contenido</p>',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  queryResults = [];
});

test.describe('createCustomTemplate', () => {
  test('rechaza con 400 si falta el título', async () => {
    const req = { body: { content: '<p>x</p>' }, user: { id: 1 } };
    const res = makeRes();
    await tc.createCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'El título de la plantilla es requerido');
  });

  test('rechaza con 400 si falta el contenido', async () => {
    const req = { body: { title: 'Sin contenido' }, user: { id: 1 } };
    const res = makeRes();
    await tc.createCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'El contenido de la plantilla es requerido');
  });

  test('crea la plantilla y responde 201', async () => {
    queryResults = [{ rows: [templateRow({ title: 'Mi Plantilla' })] }];
    const req = { body: { title: 'Mi Plantilla', content: '<p>hola</p>' }, user: { id: 1 } };
    const res = makeRes();
    await tc.createCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.title, 'Mi Plantilla');
    assert.equal(res.body.isCustom, true);
    assert.equal(res.body.id, 3);
  });
});

test.describe('createTemplateFromNote', () => {
  test('responde 404 si la nota no existe o no se tiene acceso', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { noteId: 99 }, body: {}, user: { id: 1 } };
    const res = makeRes();
    await tc.createTemplateFromNote(req, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Nota no encontrada');
  });

  test('crea una plantilla a partir de una nota accesible', async () => {
    const note = {
      id: 5,
      title: 'Mi Nota',
      content: '<p>contenido de la nota</p>',
      tags: ['idea', 'personal'],
      icon: '⭐',
      deleted: false,
      project_id: 1,
    };
    queryResults = [
      { rows: [note] },
      { rows: [templateRow({ title: 'Mi Nota', icon: '⭐', tags: ['idea', 'personal'], content: '<p>contenido de la nota</p>' })] },
    ];
    const req = { params: { noteId: 5 }, body: {}, user: { id: 1 } };
    const res = makeRes();
    await tc.createTemplateFromNote(req, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.title, 'Mi Nota');
    assert.equal(res.body.content, '<p>contenido de la nota</p>');
    assert.deepEqual(res.body.tags, ['idea', 'personal']);
  });
});

test.describe('updateCustomTemplate', () => {
  test('responde 404 si la plantilla no pertenece al usuario', async () => {
    queryResults = [{ rows: [] }];
    const req = { params: { id: 3 }, body: { title: 'Nuevo' }, user: { id: 2 } };
    const res = makeRes();
    await tc.updateCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Plantilla no encontrada o sin permisos');
  });

  test('actualiza solo los campos enviados', async () => {
    queryResults = [
      { rows: [templateRow({ title: 'Viejo' })] },
      { rows: [templateRow({ title: 'Nuevo' })] },
    ];
    const req = { params: { id: 3 }, body: { title: 'Nuevo' }, user: { id: 1 } };
    const res = makeRes();
    await tc.updateCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.title, 'Nuevo');
  });
});

test.describe('deleteCustomTemplate', () => {
  test('elimina la plantilla y responde 200', async () => {
    queryResults = [{ rows: [{ id: 3 }] }, { rows: [] }];
    const req = { params: { id: 3 }, user: { id: 1 } };
    const res = makeRes();
    await tc.deleteCustomTemplate(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Plantilla personalizada eliminada exitosamente');
  });
});
