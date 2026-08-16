import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

let dbUp = true;

mock.module('../../config/db.js', {
  exports: {
    query: async () => {
      if (!dbUp) throw new Error('connection refused');
      return { rows: [{ '?column?': 1 }] };
    },
  },
});

const hc = await import('../../controllers/healthController.js');

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

test.describe('ping', () => {
  test('responde 200 con status ok', () => {
    const res = makeRes();
    hc.ping({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'notitas-api-node');
  });
});

test.describe('health', () => {
  test('responde 200 con base de datos arriba', async () => {
    dbUp = true;
    const res = makeRes();
    await hc.health({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.database, 'up');
  });

  test('responde 503 si la base de datos no responde', async () => {
    dbUp = false;
    const res = makeRes();
    await hc.health({}, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.status, 'degraded');
    assert.equal(res.body.database, 'unreachable');
  });
});
