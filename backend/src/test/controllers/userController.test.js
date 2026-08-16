import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// Cola de respuestas de la BD
let queryResults = [];
const deleteFromCloudinary = mock.fn(async () => {});
const uploadBufferToCloudinary = mock.fn(async () => ({ secure_url: 'https://res.cloudinary.com/notitas/avatars/x.jpg' }));

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
  exports: { uploadBufferToCloudinary, deleteFromCloudinary },
});

const uc = await import('../../controllers/userController.js');

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
  deleteFromCloudinary.mock.resetCalls();
  uploadBufferToCloudinary.mock.resetCalls();
});

const userRow = (overrides = {}) => ({
  id: '1',
  email: 'ana@test.com',
  name: 'Ana',
  avatar: null,
  ...overrides,
});

test.describe('getProfile', () => {
  test('responde 404 si el usuario no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await uc.getProfile({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('devuelve el perfil del usuario', async () => {
    queryResults = [{ rows: [userRow()] }];
    const res = makeRes();
    await uc.getProfile({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
    assert.equal(res.body.name, 'Ana');
    assert.equal(res.body.email, 'ana@test.com');
  });
});

test.describe('updateProfile', () => {
  test('rechaza con 400 si faltan nombre o email', async () => {
    const res = makeRes();
    await uc.updateProfile({ body: { name: 'Ana' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('rechaza con 400 si el email ya está en uso por otra cuenta', async () => {
    queryResults = [{ rows: [{ id: 99 }] }];
    const res = makeRes();
    await uc.updateProfile({ body: { name: 'Ana', email: 'otro@test.com' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'El correo electrónico ya está en uso por otra cuenta');
  });

  test('actualiza el perfil correctamente', async () => {
    queryResults = [
      { rows: [] },
      { rows: [userRow({ name: 'Ana María', email: 'ana.maria@test.com' })] },
    ];
    const res = makeRes();
    await uc.updateProfile({ body: { name: 'Ana María', email: 'ANA.MARIA@TEST.com' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Ana María');
    assert.equal(res.body.email, 'ana.maria@test.com');
  });
});

test.describe('changePassword', () => {
  test('rechaza con 400 si faltan contraseñas', async () => {
    const res = makeRes();
    await uc.changePassword({ body: { currentPassword: 'x' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('responde 404 si el usuario no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await uc.changePassword({ body: { currentPassword: 'a', newPassword: 'b' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('rechaza con 400 si la contraseña actual es incorrecta', async () => {
    queryResults = [{ rows: [userRow({ password: await bcrypt.hash('correcta', 4) })] }];
    const res = makeRes();
    await uc.changePassword({ body: { currentPassword: 'mala', newPassword: 'nueva123' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'La contraseña actual no es correcta');
  });

  test('actualiza la contraseña correctamente', async () => {
    queryResults = [
      { rows: [userRow({ password: await bcrypt.hash('correcta', 4) })] },
      { rows: [] },
    ];
    const res = makeRes();
    await uc.changePassword({ body: { currentPassword: 'correcta', newPassword: 'nueva123' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Contraseña actualizada correctamente');
  });
});

test.describe('updateAvatar', () => {
  test('rechaza con 400 si no se subió archivo', async () => {
    const res = makeRes();
    await uc.updateAvatar({ file: null, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('sube el avatar, actualiza la BD y elimina el anterior de Cloudinary', async () => {
    const oldAvatar = 'https://res.cloudinary.com/notitas/image/upload/v1/notitas/avatars/viejo.jpg';
    queryResults = [
      { rows: [userRow({ avatar: oldAvatar })] },
      { rows: [] },
    ];
    const res = makeRes();
    await uc.updateAvatar({ file: { buffer: Buffer.from('img') }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.avatar, 'https://res.cloudinary.com/notitas/avatars/x.jpg');
    assert.equal(uploadBufferToCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls[0].arguments[0], oldAvatar);
  });

  test('no elimina el avatar anterior si no es de Cloudinary', async () => {
    queryResults = [
      { rows: [userRow({ avatar: 'https://gravatar.com/avatar/abc' })] },
      { rows: [] },
    ];
    const res = makeRes();
    await uc.updateAvatar({ file: { buffer: Buffer.from('img') }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 0);
  });
});
