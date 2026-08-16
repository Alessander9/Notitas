import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';

// Respuesta de la BD para la consulta de usuario (controlada por cada test)
let dbResult = { rows: [] };

mock.module('../../config/db.js', {
  exports: {
    query: async () => dbResult,
  },
});

const { authenticateToken, optionalAuthenticateToken } = await import('../../middleware/auth.js');

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

const signToken = (payload = {}, options = {}) =>
  jwt.sign({ id: 1, sub: 'ana@test.com', email: 'ana@test.com', tv: 0, ...payload }, JWT_SECRET, options);

const userRow = (overrides = {}) => ({
  id: '1',
  email: 'ana@test.com',
  name: 'Ana',
  avatar: null,
  token_version: 0,
  ...overrides,
});

test.describe('authenticateToken', () => {
  test('rechaza solicitudes sin token con 401', async () => {
    const req = { cookies: {}, headers: {} };
    const res = makeRes();
    let nextCalled = 0;
    await authenticateToken(req, res, () => nextCalled++);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'No autorizado: Token no proporcionado');
    assert.equal(nextCalled, 0);
  });

  test('rechaza un token inválido con 401', async () => {
    const req = { cookies: {}, headers: { authorization: 'Bearer token.invalido.xyz' } };
    const res = makeRes();
    await authenticateToken(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Token inválido');
  });

  test('rechaza un token expirado con 401', async () => {
    const req = { cookies: {}, headers: { authorization: `Bearer ${signToken({}, { expiresIn: '-1s' })}` } };
    const res = makeRes();
    await authenticateToken(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Token expirado');
  });

  test('acepta un token válido de la cookie y fija req.user', async () => {
    dbResult = { rows: [userRow()] };
    const req = { cookies: { jwt: signToken() }, headers: {} };
    const res = makeRes();
    let nextCalled = 0;
    await authenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(res.statusCode, null);
    assert.equal(req.user.id, 1);
    assert.equal(req.user.name, 'Ana');
    assert.equal(req.user.tokenVersion, 0);
  });

  test('acepta un token válido enviado en Authorization Bearer', async () => {
    dbResult = { rows: [userRow()] };
    const req = { cookies: {}, headers: { authorization: `Bearer ${signToken()}` } };
    const res = makeRes();
    let nextCalled = 0;
    await authenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(req.user.id, 1);
  });

  test('rechaza con 401 si el usuario no existe en la BD', async () => {
    dbResult = { rows: [] };
    const req = { cookies: { jwt: signToken() }, headers: {} };
    const res = makeRes();
    await authenticateToken(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Usuario no encontrado');
  });

  test('rechaza con 401 un token revocado (token_version desactualizado)', async () => {
    dbResult = { rows: [userRow({ token_version: 2 })] };
    const req = { cookies: { jwt: signToken() }, headers: {} };
    const res = makeRes();
    await authenticateToken(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Sesión invalidada. Inicia sesión nuevamente.');
  });
});

test.describe('optionalAuthenticateToken', () => {
  test('continúa como invitado si no hay token', async () => {
    const req = { cookies: {}, headers: {} };
    const res = makeRes();
    let nextCalled = 0;
    await optionalAuthenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(req.user, undefined);
    assert.equal(res.statusCode, null);
  });

  test('continúa como invitado si el token es inválido (no lanza error)', async () => {
    const req = { cookies: {}, headers: { authorization: 'Bearer token.malo.xyz' } };
    const res = makeRes();
    let nextCalled = 0;
    await optionalAuthenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(req.user, undefined);
  });

  test('identifica al usuario si el token es válido', async () => {
    dbResult = { rows: [userRow()] };
    const req = { cookies: { jwt: signToken() }, headers: {} };
    const res = makeRes();
    let nextCalled = 0;
    await optionalAuthenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(req.user.id, 1);
    assert.equal(req.user.name, 'Ana');
  });

  test('no autentica si el token es válido pero el usuario no existe', async () => {
    dbResult = { rows: [] };
    const req = { cookies: { jwt: signToken() }, headers: {} };
    const res = makeRes();
    let nextCalled = 0;
    await optionalAuthenticateToken(req, res, () => nextCalled++);
    assert.equal(nextCalled, 1);
    assert.equal(req.user, undefined);
  });
});
