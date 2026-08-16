import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

const nc = await import('../../controllers/notificationController.js');

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

beforeEach(() => {
  queryResults = [];
});

const notificationRow = (overrides = {}) => ({
  id: '3',
  title: 'Nuevo Colaborador',
  message: 'Luis se unió a tu proyecto',
  read: false,
  event_type: 'PROJECT_JOINED',
  project_id: '7',
  note_id: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

test.describe('getNotifications', () => {
  test('devuelve las notificaciones formateadas', async () => {
    queryResults = [{ rows: [notificationRow(), notificationRow({ id: '4', read: true, note_id: '9' })] }];
    const res = makeRes();
    await nc.getNotifications({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 2);
    assert.equal(res.body[0].id, 3);
    assert.equal(res.body[0].eventType, 'PROJECT_JOINED');
    assert.equal(res.body[0].projectId, 7);
    assert.equal(res.body[0].noteId, null);
    assert.equal(res.body[0].read, false);
    assert.equal(res.body[1].read, true);
    assert.equal(res.body[1].noteId, 9);
  });

  test('devuelve lista vacía si no hay notificaciones', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.getNotifications({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
  });
});

test.describe('getUnreadCount', () => {
  test('devuelve el conteo de no leídas', async () => {
    queryResults = [{ rows: [{ count: '3' }] }];
    const res = makeRes();
    await nc.getUnreadCount({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 3);
    assert.equal(res.body.unreadCount, 3);
  });

  test('devuelve 0 si el conteo es nulo', async () => {
    queryResults = [{ rows: [{ count: null }] }];
    const res = makeRes();
    await nc.getUnreadCount({ user: { id: 1 } }, res, () => {});
    assert.equal(res.body.count, 0);
  });
});

test.describe('markAsRead', () => {
  test('marca una notificación como leída', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.markAsRead({ params: { id: 3 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Notificación marcada como leída');
  });
});

test.describe('markAllAsRead', () => {
  test('marca todas como leídas', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.markAllAsRead({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Todas las notificaciones marcadas como leídas');
  });
});

test.describe('clearNotifications', () => {
  test('elimina el historial de notificaciones', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.clearNotifications({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Historial de notificaciones eliminado');
  });
});
