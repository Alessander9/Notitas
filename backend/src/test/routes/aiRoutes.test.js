import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// La BD solo se consulta si llega un token válido (para buscar al usuario)
let dbResult = { rows: [] };

mock.module('../../config/db.js', {
  exports: {
    query: async () => dbResult,
  },
});

const chatWithAssistant = mock.fn(async ({ userName }) => ({
  content: `Hola ${userName}`,
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
}));
const transformTextWithAi = mock.fn(async () => ({
  content: 'Texto transformado',
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
}));

mock.module('../../services/aiService.js', {
  exports: { chatWithAssistant, transformTextWithAi },
});

// Importar la app completa tras registrar los mocks
const app = (await import('../../app.js')).default;

const JWT_SECRET = process.env.NOTITAS_JWT_SECRET || process.env.JWT_SECRET || 'notitas-super-secret-jwt-key-2026-production';
const signToken = () => jwt.sign({ id: 1, sub: 'ana@test.com', email: 'ana@test.com', tv: 0 }, JWT_SECRET, { expiresIn: '1h' });

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
  dbResult = { rows: [] };
  chatWithAssistant.mock.resetCalls();
  transformTextWithAi.mock.resetCalls();
});

const postJson = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

test.describe('POST /api/ai/chat (autenticación opcional)', () => {
  test('responde 200 a un invitado sin token', async () => {
    const res = await postJson('/api/ai/chat', { messages: [{ role: 'user', content: 'hola' }] });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, 'Hola Usuario');
    assert.equal(body.provider, 'Groq');
    assert.equal(chatWithAssistant.mock.calls.length, 1);
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].userName, 'Usuario');
  });

  test('responde 200 a un invitado aunque el token sea inválido', async () => {
    const res = await postJson('/api/ai/chat', { messages: [{ role: 'user', content: 'hola' }] }, {
      Authorization: 'Bearer token.invalido.xyz',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, 'Hola Usuario');
  });

  test('identifica al usuario con un token válido', async () => {
    dbResult = { rows: [{ id: '1', email: 'ana@test.com', name: 'Ana', avatar: null, token_version: 0 }] };
    const res = await postJson('/api/ai/chat', { messages: [{ role: 'user', content: 'hola' }] }, {
      Authorization: `Bearer ${signToken()}`,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, 'Hola Ana');
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].userName, 'Ana');
  });

  test('responde 400 si no llega el campo messages', async () => {
    const res = await postJson('/api/ai/chat', {});
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, 'El campo "messages" es obligatorio y debe ser un array no vacío.');
  });
});

test.describe('POST /api/ai/transform (autenticación opcional)', () => {
  test('transforma texto como invitado', async () => {
    const res = await postJson('/api/ai/transform', { action: 'summarize', text: 'texto a resumir' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.result, 'Texto transformado');
    assert.equal(transformTextWithAi.mock.calls.length, 1);
  });
});
