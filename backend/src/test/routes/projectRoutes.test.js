import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Cola de respuestas de la BD: cada llamada a query() consume una
let queryResults = [];
const deleteFromCloudinary = mock.fn(async () => {});

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
    uploadBufferToCloudinary: async () => ({ secure_url: 'https://res.cloudinary.com/notitas/x.jpg' }),
    deleteFromCloudinary,
  },
});

// Importar la app completa tras registrar los mocks
const app = (await import('../../app.js')).default;

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';
const signToken = () => jwt.sign({ id: 1, sub: 'ana@test.com', email: 'ana@test.com', tv: 0 }, JWT_SECRET, { expiresIn: '1h' });

// Fila de usuario que devuelve authenticateToken al validar el token
const userRow = () => ({ id: '1', email: 'ana@test.com', name: 'Ana', avatar: null, token_version: 0 });
const creatorRow = () => ({ id: 1, name: 'Ana', email: 'ana@test.com', avatar: null });

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

beforeEach(() => {
  queryResults = [];
  deleteFromCloudinary.mock.resetCalls();
});

const deleteCover = (headers = {}) =>
  fetch(`${baseUrl}/api/projects/7/cover`, {
    method: 'DELETE',
    headers,
  });

test.describe('DELETE /api/projects/:id/cover', () => {
  test('responde 401 sin token', async () => {
    const res = await deleteCover();
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.message, 'No autorizado: Token no proporcionado');
  });

  test('responde 403 si el usuario no tiene permisos sobre el proyecto', async () => {
    queryResults = [
      { rows: [userRow()] },  // authenticateToken
      { rows: [] },           // check de permisos → vacío
    ];
    const res = await deleteCover({ Authorization: `Bearer ${signToken()}` });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.message, 'Sin permisos para modificar el proyecto');
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });

  test('elimina la portada de Cloudinary y devuelve el proyecto actualizado', async () => {
    const cover = 'https://res.cloudinary.com/notitas/image/upload/v123/notitas/covers/projects/abc.jpg';
    queryResults = [
      { rows: [userRow()] },                                                              // authenticateToken
      { rows: [{ id: 7, user_id: 1, name: 'P', cover_image: cover }] },                   // check de permisos
      { rows: [{ id: 7, user_id: 1, name: 'P', cover_image: null }] },                    // UPDATE projects
      { rows: [creatorRow()] },                                                           // creador
      { rows: [] },                                                                       // colaboradores
    ];
    const res = await deleteCover({ Authorization: `Bearer ${signToken()}` });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.coverImage, null);
    assert.equal(body.id, 7);
    assert.equal(body.currentUserRole, 'OWNER');
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls[0].arguments[0], cover);
  });

  test('no llama a Cloudinary si la portada no es de Cloudinary', async () => {
    queryResults = [
      { rows: [userRow()] },
      { rows: [{ id: 7, user_id: 1, name: 'P', cover_image: 'https://mi-dominio.com/img/portada.png' }] },
      { rows: [{ id: 7, user_id: 1, name: 'P', cover_image: null }] },
      { rows: [creatorRow()] },
      { rows: [] },
    ];
    const res = await deleteCover({ Authorization: `Bearer ${signToken()}` });
    assert.equal(res.status, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });
});
