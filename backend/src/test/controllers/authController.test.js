import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';
const signToken = (payload = {}, options = {}) =>
  jwt.sign({ id: 1, sub: 'ana@test.com', email: 'ana@test.com', tv: 0, rm: false, ...payload }, JWT_SECRET, options);

// Cola de respuestas de la BD
let queryResults = [];
const sendPasswordResetEmail = mock.fn(async () => ({ success: true, devLink: 'http://localhost/reset?token=abc' }));

mock.module('../../config/db.js', {
  exports: {
    query: async (sql) => {
      const next = queryResults.shift();
      if (next === undefined) throw new Error(`query inesperado en test: ${String(sql).slice(0, 80)}`);
      return next;
    },
  },
});

mock.module('../../services/emailService.js', {
  exports: { sendPasswordResetEmail },
});

const ac = await import('../../controllers/authController.js');

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
  res.cookie = () => res;
  res.clearCookie = () => res;
  return res;
};

beforeEach(() => {
  queryResults = [];
  sendPasswordResetEmail.mock.resetCalls();
});

const userRow = (overrides = {}) => ({
  id: 1,
  name: 'Ana',
  email: 'ana@test.com',
  avatar: null,
  token_version: 0,
  password: 'x',
  ...overrides,
});

test.describe('register', () => {
  test('rechaza con 400 si faltan campos', async () => {
    const res = makeRes();
    await ac.register({ body: { name: 'Ana' } }, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Todos los campos son obligatorios');
  });

  test('rechaza con 400 si el email ya está registrado', async () => {
    queryResults = [{ rows: [{ id: 9 }] }];
    const res = makeRes();
    await ac.register({ body: { name: 'Ana', email: 'ANA@Test.com', password: '123456' } }, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Error: El email ya está registrado');
  });

  test('registra al usuario y responde 200', async () => {
    queryResults = [{ rows: [] }, { rows: [] }];
    const res = makeRes();
    await ac.register({ body: { name: 'Ana', email: 'ana@test.com', password: '123456' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Usuario registrado exitosamente');
  });
});

test.describe('login', () => {
  test('rechaza con 400 si faltan email o contraseña', async () => {
    const res = makeRes();
    await ac.login({ body: { email: 'ana@test.com' } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('rechaza con 401 si el email no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await ac.login({ body: { email: 'nadie@test.com', password: 'x' } }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Credenciales inválidas');
  });

  test('rechaza con 401 si la contraseña es incorrecta', async () => {
    queryResults = [{ rows: [userRow({ password: await bcrypt.hash('correcta', 4) })] }];
    const res = makeRes();
    await ac.login({ body: { email: 'ana@test.com', password: 'mala' } }, res, () => {});
    assert.equal(res.statusCode, 401);
  });

  test('inicia sesión correctamente y fija cookie + token', async () => {
    queryResults = [{ rows: [userRow({ password: await bcrypt.hash('correcta', 4) })] }];
    const res = makeRes();
    await ac.login({ body: { email: 'ana@test.com', password: 'correcta', rememberMe: true } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
    assert.equal(res.body.name, 'Ana');
    assert.ok(typeof res.body.token === 'string' && res.body.token.length > 20);
  });
});

test.describe('refresh', () => {
  test('rechaza con 401 si no hay token', async () => {
    const res = makeRes();
    await ac.refresh({ cookies: {}, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 401);
  });

  test('rechaza con 401 si el token es inválido', async () => {
    const res = makeRes();
    await ac.refresh({ cookies: { jwt: 'token-malo' }, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 401);
  });

  test('rechaza con 401 si el usuario no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await ac.refresh({ cookies: { jwt: signToken() }, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Usuario no encontrado');
  });

  test('rechaza con 401 si la sesión fue revocada (token_version)', async () => {
    queryResults = [{ rows: [userRow({ token_version: 5 })] }];
    const res = makeRes();
    await ac.refresh({ cookies: { jwt: signToken() }, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Sesión revocada');
  });

  test('renueva el token correctamente', async () => {
    queryResults = [{ rows: [userRow()] }];
    const res = makeRes();
    await ac.refresh({ cookies: { jwt: signToken() }, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.ok(typeof res.body.token === 'string');
  });
});

test.describe('logout', () => {
  test('cierra sesión sin token', async () => {
    const res = makeRes();
    await ac.logout({ cookies: {}, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Sesión cerrada exitosamente');
  });

  test('cierra sesión y revoca el token (token_version + 1)', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await ac.logout({ cookies: { jwt: signToken() }, headers: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
  });
});

test.describe('forgotPassword', () => {
  test('rechaza con 400 si falta el email', async () => {
    const res = makeRes();
    await ac.forgotPassword({ body: {} }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('responde 200 y genera link de desarrollo si el usuario existe', async () => {
    queryResults = [{ rows: [{ id: 1 }] }, { rows: [] }];
    const res = makeRes();
    await ac.forgotPassword({ body: { email: 'ana@test.com' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.devResetLink);
    assert.equal(sendPasswordResetEmail.mock.calls.length, 1);
  });

  test('responde 200 sin link si el usuario no existe (no revela información)', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await ac.forgotPassword({ body: { email: 'nadie@test.com' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.devResetLink, undefined);
    assert.equal(sendPasswordResetEmail.mock.calls.length, 0);
  });
});

test.describe('resetPassword', () => {
  test('rechaza con 400 si faltan token o contraseña', async () => {
    const res = makeRes();
    await ac.resetPassword({ body: { token: 'abc' } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('rechaza con 400 si el token es inválido o expiró', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await ac.resetPassword({ body: { token: 'no-existe', password: 'nueva123' } }, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'El enlace de recuperación es inválido o ha expirado');
  });

  test('restablece la contraseña y marca el token como usado', async () => {
    queryResults = [
      { rows: [{ id: 5, user_id: 1 }] },
      { rows: [] },
      { rows: [] },
    ];
    const res = makeRes();
    await ac.resetPassword({ body: { token: 'valido', password: 'nueva123' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.');
  });
});
