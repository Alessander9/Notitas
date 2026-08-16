import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const chatWithAssistant = mock.fn(async ({ userName }) => ({
  content: `Respuesta para ${userName}`,
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
}));
const transformTextWithAi = mock.fn(async () => ({
  content: 'Texto transformado',
  provider: 'Groq',
  model: 'llama-3.3-70b-versatile',
}));

// Cola de respuestas de la BD (solo se consulta al construir el dossier)
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

mock.module('../../services/aiService.js', {
  exports: { chatWithAssistant, transformTextWithAi },
});

const ai = await import('../../controllers/aiController.js');

const makeRes = () => {
  const res = {};
  res.body = null;
  res.status = () => res;
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const projectRow = () => ({
  id: 3,
  name: 'Marketing',
  description: 'Campañas del año',
  icon: 'folder',
  color: '#386c5f',
  user_id: 1,
});

const notesRows = () => [
  {
    id: 10,
    title: 'Plan Q3',
    content: '<p>Ideas para la campaña de <strong>verano</strong></p>',
    archived: false,
    favorite: true,
    updated_at: '2026-01-02',
    tags: ['campaña', 'verano'],
  },
  {
    id: 11,
    title: 'Presupuesto',
    content: 'Gasto total estimado en publicidad.',
    archived: false,
    favorite: false,
    updated_at: '2026-01-01',
    tags: ['finanzas'],
  },
];

beforeEach(() => {
  queryResults = [];
  chatWithAssistant.mock.resetCalls();
  transformTextWithAi.mock.resetCalls();
});

test.describe('handleAiChat', () => {
  test('rechaza con 400 si falta messages', async () => {
    const req = { body: {}, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(res.body.message, 'El campo "messages" es obligatorio y debe ser un array no vacío.');
  });

  test('rechaza con 400 si messages está vacío', async () => {
    const req = { body: { messages: [] }, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(res.body.message, 'El campo "messages" es obligatorio y debe ser un array no vacío.');
  });

  test('responde 200 usando el nombre del usuario autenticado', async () => {
    const req = { body: { messages: [{ role: 'user', content: 'hola' }] }, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(res.body.message, 'Respuesta para Ana');
    assert.equal(res.body.provider, 'Groq');
    assert.equal(chatWithAssistant.mock.calls.length, 1);
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].userName, 'Ana');
  });

  test('responde 200 como invitado usando "Usuario"', async () => {
    const req = { body: { messages: [{ role: 'user', content: 'hola' }] } };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(res.body.message, 'Respuesta para Usuario');
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].userName, 'Usuario');
  });
});

test.describe('handleAiChat — dossier de proyecto', () => {
  test('construye el dossier del projectId explícito y lo pasa al asistente', async () => {
    queryResults = [{ rows: [projectRow()] }, { rows: notesRows() }];
    const req = {
      body: { messages: [{ role: 'user', content: 'dame un resumen' }], projectId: 3 },
      user: { id: 1, name: 'Ana' },
    };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(res.body.message, 'Respuesta para Ana');
    const args = chatWithAssistant.mock.calls[0].arguments[0];
    assert.equal(args.projectDossier.name, 'Marketing');
    assert.equal(args.projectDossier.stats.noteCount, 2);
    assert.equal(args.projectDossier.notes[0].title, 'Plan Q3');
    // El contenido HTML se convierte a texto plano
    assert.ok(!args.projectDossier.notes[0].content.includes('<strong>'));
    assert.ok(args.projectDossier.notes[0].content.includes('campaña'));
  });

  test('no pasa dossier si el usuario no tiene acceso al proyecto', async () => {
    queryResults = [{ rows: [] }];
    const req = {
      body: { messages: [{ role: 'user', content: 'resumen' }], projectId: 3 },
      user: { id: 9, name: 'Luis' },
    };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].projectDossier, null);
  });

  test('detecta la mención de un proyecto por nombre en el mensaje', async () => {
    queryResults = [{ rows: [projectRow()] }, { rows: notesRows() }];
    const req = {
      body: {
        messages: [{ role: 'user', content: 'dame un resumen del proyecto Marketing por favor' }],
        userProjects: [{ id: 3, name: 'Marketing' }, { id: 5, name: 'App móvil' }],
      },
      user: { id: 1, name: 'Ana' },
    };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    const args = chatWithAssistant.mock.calls[0].arguments[0];
    assert.equal(args.projectDossier.name, 'Marketing');
    assert.equal(args.projectDossier.id, 3);
  });

  test('no consulta la BD si el mensaje no menciona ningún proyecto', async () => {
    const req = {
      body: {
        messages: [{ role: 'user', content: '¿qué funciones tiene Notitas?' }],
        userProjects: [{ id: 3, name: 'Marketing' }],
      },
      user: { id: 1, name: 'Ana' },
    };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].projectDossier, null);
  });

  test('los invitados no disparan consultas de proyecto', async () => {
    const req = {
      body: {
        messages: [{ role: 'user', content: 'resumen del proyecto Marketing' }],
        projectId: 3,
        userProjects: [{ id: 3, name: 'Marketing' }],
      },
    };
    const res = makeRes();
    await ai.handleAiChat(req, res, () => {});
    assert.equal(chatWithAssistant.mock.calls[0].arguments[0].projectDossier, null);
  });
});

test.describe('handleAiTransform', () => {
  test('rechaza con 400 si falta el texto', async () => {
    const req = { body: { action: 'summarize' }, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiTransform(req, res, () => {});
    assert.equal(res.body.message, 'El campo "text" es obligatorio.');
  });

  test('rechaza con 400 si el texto está vacío', async () => {
    const req = { body: { action: 'summarize', text: '   ' }, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiTransform(req, res, () => {});
    assert.equal(res.body.message, 'El campo "text" es obligatorio.');
  });

  test('transforma texto y responde 200', async () => {
    const req = { body: { action: 'summarize', text: 'texto largo a resumir' }, user: { name: 'Ana' } };
    const res = makeRes();
    await ai.handleAiTransform(req, res, () => {});
    assert.equal(res.body.result, 'Texto transformado');
    assert.equal(transformTextWithAi.mock.calls.length, 1);
    const args = transformTextWithAi.mock.calls[0].arguments[0];
    assert.equal(args.action, 'summarize');
    assert.equal(args.text, 'texto largo a resumir');
  });
});
