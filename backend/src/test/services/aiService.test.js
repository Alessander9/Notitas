import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let fetchImpl;
mock.method(globalThis, 'fetch', (...args) => fetchImpl(...args));

const ai = await import('../../services/aiService.js');

const jsonRes = (body) => ({ ok: true, status: 200, json: async () => body });
const failRes = (status = 500, body = 'error del proveedor') => ({ ok: false, status, text: async () => body });
const groqSuccess = (content) => jsonRes({ choices: [{ message: { content } }] });

beforeEach(() => {
  fetchImpl = async () => {
    throw new Error('fetch no mockeado en este test');
  };
});

test.describe('executeAiCompletion (cascada de proveedores)', () => {
  test('usa el primer proveedor si responde correctamente', async () => {
    let calls = 0;
    fetchImpl = async () => {
      calls += 1;
      return groqSuccess('respuesta groq');
    };
    const result = await ai.executeAiCompletion([{ role: 'user', content: 'hola' }]);
    assert.equal(calls, 1);
    assert.equal(result.provider, 'Groq');
    assert.equal(result.content, 'respuesta groq');
  });

  test('salta al segundo proveedor si el primero falla', async () => {
    const urls = [];
    fetchImpl = async (url) => {
      urls.push(url);
      if (urls.length === 1) return failRes(401);
      return groqSuccess('respuesta openrouter');
    };
    const result = await ai.executeAiCompletion([{ role: 'user', content: 'hola' }]);
    assert.equal(urls.length, 2);
    assert.equal(result.provider, 'OpenRouter');
  });

  test('lanza un error si todos los proveedores fallan', async () => {
    fetchImpl = async () => failRes(500);
    await assert.rejects(
      () => ai.executeAiCompletion([{ role: 'user', content: 'hola' }]),
      /Todos los proveedores de IA fallaron/
    );
  });
});

test.describe('chatWithAssistant', () => {
  test('construye el system prompt con el contexto del usuario y delega en la cascada', async () => {
    let lastBody;
    fetchImpl = async (url, init) => {
      lastBody = JSON.parse(init.body);
      return groqSuccess('Hola Ana');
    };
    const result = await ai.chatWithAssistant({
      messages: [{ role: 'user', content: '¿cómo organizo mi semana?' }],
      userName: 'Ana',
      projectContext: { name: 'Proyecto X', description: 'web' },
    });
    assert.equal(result.content, 'Hola Ana');
    assert.ok(lastBody.messages[0].role === 'system');
    assert.ok(lastBody.messages[0].content.includes('Ana'));
    assert.ok(lastBody.messages[0].content.includes('Proyecto X'));
    assert.equal(lastBody.messages[1].role, 'user');
    assert.equal(lastBody.messages[1].content, '¿cómo organizo mi semana?');
  });
});

test.describe('chatWithAssistant — dossier de proyecto', () => {
  test('inyecta el contenido del proyecto en el system prompt para poder resumirlo', async () => {
    let lastBody;
    fetchImpl = async (url, init) => {
      lastBody = JSON.parse(init.body);
      return groqSuccess('resumen del proyecto');
    };
    const dossier = {
      name: 'Marketing',
      description: 'Campañas del año',
      stats: { noteCount: 1, activeCount: 1, totalWords: 10 },
      notes: [{ title: 'Plan Q3', tags: ['campaña'], favorite: true, archived: false, content: 'Ideas para la campaña de verano' }],
    };
    const result = await ai.chatWithAssistant({
      messages: [{ role: 'user', content: 'dame un resumen del proyecto' }],
      projectDossier: dossier,
    });
    assert.equal(result.content, 'resumen del proyecto');
    const system = lastBody.messages[0].content;
    assert.ok(system.includes('Marketing'));
    assert.ok(system.includes('Plan Q3'));
    assert.ok(system.includes('Ideas para la campaña de verano'));
  });
});

test.describe('transformTextWithAi', () => {
  test('genera el prompt de resumen y devuelve el resultado', async () => {
    let lastBody;
    fetchImpl = async (url, init) => {
      lastBody = JSON.parse(init.body);
      return groqSuccess('resumen generado');
    };
    const result = await ai.transformTextWithAi({ action: 'summarize', text: 'texto largo a resumir' });
    assert.equal(result.content, 'resumen generado');
    assert.ok(lastBody.messages[1].content.includes('Resume el siguiente texto'));
    assert.ok(lastBody.messages[1].content.includes('texto largo a resumir'));
  });

  test('usa las instrucciones personalizadas en la acción custom', async () => {
    let lastBody;
    fetchImpl = async (url, init) => {
      lastBody = JSON.parse(init.body);
      return groqSuccess('ok');
    };
    await ai.transformTextWithAi({ action: 'custom', text: 'x', instructions: 'Hazlo divertido' });
    assert.ok(lastBody.messages[1].content.includes('Hazlo divertido'));
  });
});
