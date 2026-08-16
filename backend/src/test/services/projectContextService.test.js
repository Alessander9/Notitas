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

const { findProjectByMessage, buildProjectDossier } = await import('../../services/projectContextService.js');

const projects = [
  { id: 3, name: 'Marketing' },
  { id: 5, name: 'App móvil' },
  { id: 7, name: 'Marketing Digital' },
];

beforeEach(() => {
  queryResults = [];
});

test.describe('findProjectByMessage', () => {
  test('devuelve null si no hay texto o proyectos', () => {
    assert.equal(findProjectByMessage('', projects), null);
    assert.equal(findProjectByMessage('hola', null), null);
    assert.equal(findProjectByMessage('hola', []), null);
  });

  test('detecta una mención exacta (sin distinguir mayúsculas)', () => {
    const result = findProjectByMessage('dame un resumen del proyecto marketing', projects);
    assert.deepEqual(result, { id: 3, name: 'Marketing' });
  });

  test('elige el proyecto con el nombre más largo que coincida', () => {
    const result = findProjectByMessage('resumen de marketing digital', projects);
    assert.equal(result.id, 7);
  });

  test('devuelve null si no hay ninguna coincidencia', () => {
    assert.equal(findProjectByMessage('¿qué funciones tiene Notitas?', projects), null);
  });
});

test.describe('buildProjectDossier', () => {
  test('devuelve null con IDs no válidos', async () => {
    assert.equal(await buildProjectDossier('abc', 1), null);
    assert.equal(await buildProjectDossier(1, 'abc'), null);
  });

  test('devuelve null si el usuario no tiene acceso al proyecto', async () => {
    queryResults = [{ rows: [] }];
    assert.equal(await buildProjectDossier(3, 9), null);
  });

  test('construye el dossier con notas, stats y texto plano', async () => {
    queryResults = [
      { rows: [{ id: 3, name: 'Marketing', description: 'Campañas', icon: 'folder', color: '#386c5f', user_id: 1 }] },
      {
        rows: [
          { id: 10, title: 'Plan Q3', content: '<p>Ideas para la <strong>campaña</strong> de verano&nbsp;</p>', archived: false, favorite: true, updated_at: 'd', tags: ['campaña'] },
          { id: 11, title: 'Presupuesto', content: 'Gasto en publicidad.', archived: true, favorite: false, updated_at: 'd', tags: ['finanzas'] },
        ],
      },
    ];
    const dossier = await buildProjectDossier(3, 1);
    assert.equal(dossier.name, 'Marketing');
    assert.equal(dossier.isOwner, true);
    assert.equal(dossier.stats.noteCount, 2);
    assert.equal(dossier.stats.activeCount, 1);
    assert.ok(dossier.stats.totalWords > 0);
    assert.equal(dossier.notes[0].title, 'Plan Q3');
    assert.deepEqual(dossier.notes[0].tags, ['campaña']);
    assert.equal(dossier.notes[0].favorite, true);
    // HTML y entidades convertidos a texto plano
    assert.ok(!dossier.notes[0].content.includes('<strong>'));
    assert.ok(dossier.notes[0].content.includes('campaña'));
    assert.ok(!dossier.notes[1].content.includes('&nbsp;'));
  });

  test('marca isOwner=false si el usuario es colaborador', async () => {
    queryResults = [
      { rows: [{ id: 3, name: 'Marketing', description: null, icon: null, color: null, user_id: 99 }] },
      { rows: [] },
    ];
    const dossier = await buildProjectDossier(3, 1);
    assert.equal(dossier.isOwner, false);
    assert.equal(dossier.stats.noteCount, 0);
  });
});
