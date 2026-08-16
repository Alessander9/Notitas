import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// Cola de respuestas de la BD
let queryResults = [];
const deleteFromCloudinary = mock.fn(async () => {});
const uploadBufferToCloudinary = mock.fn(async () => ({ secure_url: 'https://res.cloudinary.com/notitas/x.jpg' }));

mock.module('../../config/db.js', {
  exports: {
    query: async (sql) => {
      const next = queryResults.shift();
      if (next === undefined) throw new Error(`query inesperado en test: ${String(sql).slice(0, 100)}`);
      return next;
    },
  },
});

mock.module('../../services/cloudinaryService.js', {
  exports: { uploadBufferToCloudinary, deleteFromCloudinary },
});

const nc = await import('../../controllers/noteController.js');

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
  res.send = () => res;
  return res;
};

// Fila completa de una nota (SELECT n.*)
const noteRow = (overrides = {}) => ({
  id: 1,
  project_id: 1,
  title: 'Mi Nota',
  content: '<p>hola</p>',
  cover_image: null,
  icon: '📝',
  favorite: false,
  archived: false,
  deleted: false,
  share_token: 'abc123',
  pin_hash: null,
  is_locked: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  updated_by: 1,
  ...overrides,
});

// Fila que devuelve checkNoteAccess (nota + roles)
const accessRow = (overrides = {}) => ({
  ...noteRow(),
  project_owner_id: 1,
  project_role: null,
  note_role: null,
  ...overrides,
});

// Las 3 consultas de formatNotesBulk (tags, attachments, members)
const formatQueries = (overrides = []) => {
  const [tags = { rows: [] }, attachments = { rows: [] }, members = { rows: [] }] = overrides;
  return [tags, attachments, members];
};

const cloudinaryUrl = 'https://res.cloudinary.com/notitas/image/upload/v1/notitas/covers/notes/abc.jpg';

beforeEach(() => {
  queryResults = [];
  deleteFromCloudinary.mock.resetCalls();
  uploadBufferToCloudinary.mock.resetCalls();
});

test.describe('getNotesByProject', () => {
  test('rechaza con 400 un ID de proyecto no válido', async () => {
    const res = makeRes();
    await nc.getNotesByProject({ params: { projectId: 'abc' }, user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('responde 403 sin acceso al proyecto', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.getNotesByProject({ params: { projectId: 1 }, user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('devuelve las notas paginadas del proyecto', async () => {
    queryResults = [
      { rows: [{ id: 1 }] },
      { rows: [noteRow()] },
      ...formatQueries([{ rows: [{ note_id: 1, tag: 'idea' }] }]),
    ];
    const res = makeRes();
    await nc.getNotesByProject({ params: { projectId: 1 }, user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.totalElements, 1);
    assert.equal(res.body.content[0].id, 1);
    assert.deepEqual(res.body.content[0].tags, ['idea']);
  });
});

test.describe('getFavorites / getArchived / getTrash', () => {
  test('devuelve las notas favoritas', async () => {
    queryResults = [{ rows: [noteRow()] }, ...formatQueries()];
    const res = makeRes();
    await nc.getFavorites({ user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.content[0].favorite, false); // favorite del mock
  });

  test('devuelve las notas archivadas', async () => {
    queryResults = [{ rows: [noteRow({ archived: true })] }, ...formatQueries()];
    const res = makeRes();
    await nc.getArchived({ user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.content[0].archived, true);
  });

  test('devuelve las notas de la papelera', async () => {
    queryResults = [{ rows: [noteRow({ deleted: true })] }, ...formatQueries()];
    const res = makeRes();
    await nc.getTrash({ user: { id: 1 }, query: {} }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.content[0].deleted, true);
  });
});

test.describe('searchNotes', () => {
  test('devuelve lista vacía si el término está vacío', async () => {
    const res = makeRes();
    await nc.searchNotes({ query: { query: '   ' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.content, []);
  });

  test('busca notas por título/contenido/tag', async () => {
    queryResults = [{ rows: [noteRow()] }, ...formatQueries()];
    const res = makeRes();
    await nc.searchNotes({ query: { query: 'hola' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.content[0].title, 'Mi Nota');
  });
});

test.describe('getNoteById', () => {
  test('rechaza con 400 un ID no válido', async () => {
    const res = makeRes();
    await nc.getNoteById({ params: { id: 'abc' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('responde 404 sin acceso a la nota', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.getNoteById({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('devuelve la nota formateada', async () => {
    queryResults = [
      { rows: [accessRow()] },
      ...formatQueries([{ rows: [{ note_id: 1, tag: 'a' }] }, { rows: [{ id: 9, note_id: 1, url: 'u', type: 't', name: 'n', tag: null }] }]),
    ];
    const res = makeRes();
    await nc.getNoteById({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
    assert.deepEqual(res.body.tags, ['a']);
    assert.equal(res.body.attachments[0].id, 9);
  });
});

test.describe('createNote', () => {
  test('rechaza con 400 si falta el ID de proyecto', async () => {
    const res = makeRes();
    await nc.createNote({ body: { title: 'x' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('rechaza con 403 sin permisos de creación en el proyecto', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.createNote({ body: { projectId: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('crea la nota con tags y versión inicial', async () => {
    queryResults = [
      { rows: [{ id: 1 }] },               // projCheck
      { rows: [noteRow()] },               // INSERT notes
      { rows: [] },                        // INSERT tag 'idea'
      { rows: [] },                        // INSERT tag 'trabajo'
      { rows: [] },                        // INSERT note_versions
      ...formatQueries(),                  // formatNoteResponse
    ];
    const res = makeRes();
    await nc.createNote({ body: { projectId: 1, title: 'Mi Nota', content: '<p>x</p>', tags: ['idea', 'trabajo'] }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
  });
});

test.describe('updateNote', () => {
  test('responde 404 si la nota no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.updateNote({ params: { id: 1 }, body: {}, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('responde 403 si el usuario es solo VIEWER', async () => {
    queryResults = [{ rows: [accessRow({ project_owner_id: 99, project_role: 'VIEWER', note_role: null })] }];
    const res = makeRes();
    await nc.updateNote({ params: { id: 1 }, body: { title: 'Nuevo' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Permiso de edición denegado');
  });

  test('actualiza sin guardar versión si no cambian título/contenido', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [noteRow({ favorite: true })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.updateNote({ params: { id: 1 }, body: { favorite: true }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.favorite, true);
  });

  test('guarda versión anterior y actualiza tags cuando cambia el contenido', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [] },                        // INSERT note_versions
      { rows: [noteRow({ content: '<p>nuevo</p>' })] },
      { rows: [] },                        // DELETE note_tags
      { rows: [] },                        // INSERT tag
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.updateNote({ params: { id: 1 }, body: { content: '<p>nuevo</p>', tags: ['a'] }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
  });
});

test.describe('deleteNote', () => {
  test('responde 404 si la nota no existe', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.deleteNote({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('mueve la nota a la papelera (soft delete)', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.deleteNote({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Nota enviada a la papelera');
  });
});

test.describe('deleteNotePermanent', () => {
  test('elimina la nota y limpia Cloudinary (portada y adjuntos)', async () => {
    queryResults = [
      { rows: [accessRow({ cover_image: cloudinaryUrl })] },
      { rows: [{ url: cloudinaryUrl }, { url: 'https://otros.com/f.png' }] },
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    ];
    const res = makeRes();
    await nc.deleteNotePermanent({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Nota eliminada permanentemente');
    assert.equal(deleteFromCloudinary.mock.calls.length, 2);
  });
});

test.describe('restoreNote / toggleFavorite / archiveNote', () => {
  test('restaura la nota desde la papelera', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [noteRow()] }, ...formatQueries()];
    const res = makeRes();
    await nc.restoreNote({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
  });

  test('alterna el favorito', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [noteRow({ favorite: true })] }, ...formatQueries()];
    const res = makeRes();
    await nc.toggleFavorite({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.favorite, true);
  });

  test('archiva la nota', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [noteRow({ archived: true })] }, ...formatQueries()];
    const res = makeRes();
    await nc.archiveNote({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.archived, true);
  });
});

test.describe('uploadNoteCover / uploadInlineImage', () => {
  test('rechaza con 400 sin archivo', async () => {
    const res = makeRes();
    await nc.uploadNoteCover({ file: null, params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('sube portada y elimina la anterior de Cloudinary', async () => {
    queryResults = [
      { rows: [accessRow({ cover_image: cloudinaryUrl })] },
      { rows: [noteRow({ cover_image: 'https://res.cloudinary.com/notitas/nueva.jpg' })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.uploadNoteCover({ file: { buffer: Buffer.from('img') }, params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(uploadBufferToCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
    assert.equal(deleteFromCloudinary.mock.calls[0].arguments[0], cloudinaryUrl);
  });

  test('sube imagen embebida y devuelve la URL', async () => {
    queryResults = [{ rows: [accessRow()] }];
    const res = makeRes();
    await nc.uploadInlineImage({ file: { buffer: Buffer.from('img') }, params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.url, 'https://res.cloudinary.com/notitas/x.jpg');
  });
});

test.describe('addAttachment / deleteAttachment / updateAttachmentTag', () => {
  test('agrega un adjunto a la nota', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 5, note_id: 1, url: 'u', type: 'image/png', name: 'foto.png', tag: null }] },
    ];
    const res = makeRes();
    await nc.addAttachment({ file: { buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'foto.png' }, body: { name: 'foto.png' }, params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 5);
    assert.equal(uploadBufferToCloudinary.mock.calls[0].arguments[1].resourceType, 'image');
  });

  test('responde 404 si el adjunto no existe', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.deleteAttachment({ params: { id: 1, attachmentId: 5 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Adjunto no encontrado');
  });

  test('elimina el adjunto y su archivo de Cloudinary', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 5, url: cloudinaryUrl, note_id: 1 }] },
      { rows: [] },
    ];
    const res = makeRes();
    await nc.deleteAttachment({ params: { id: 1, attachmentId: 5 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
  });

  test('actualiza el tag de un adjunto', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 5, tag: 'importante' }] },
    ];
    const res = makeRes();
    await nc.updateAttachmentTag({ params: { id: 1, attachmentId: 5 }, query: { tag: 'importante' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tag, 'importante');
  });
});

test.describe('getVersions / restoreVersion', () => {
  test('lista las versiones de la nota', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 9, note_id: 1, title: 'V1', content: '<p>v</p>', updated_by: 1, user_name: 'Ana', created_at: '2026-01-01' }] },
    ];
    const res = makeRes();
    await nc.getVersions({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body[0].id, 9);
    assert.equal(res.body[0].userName, 'Ana');
  });

  test('responde 404 si la versión no existe', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.restoreVersion({ params: { id: 1, versionId: 9 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('restaura una versión guardando la actual', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 9, note_id: 1, title: 'Vieja', content: '<p>viejo</p>' }] },
      { rows: [] },                        // INSERT versión actual
      { rows: [noteRow({ title: 'Vieja', content: '<p>viejo</p>' })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.restoreVersion({ params: { id: 1, versionId: 9 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.title, 'Vieja');
  });
});

test.describe('duplicateNote', () => {
  test('duplica la nota copiando tags y adjuntos', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [noteRow()] },
      { rows: [noteRow({ id: 2, title: 'Mi Nota (Copia)' })] },
      { rows: [{ tag: 'idea' }, { tag: 'trabajo' }] },
      { rows: [] },                        // INSERT tag
      { rows: [] },                        // INSERT tag
      { rows: [{ url: 'u1', type: 't', name: 'n', tag: null }] },
      { rows: [] },                        // INSERT attachment
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.duplicateNote({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.title, 'Mi Nota (Copia)');
  });
});

test.describe('getPublicSharedNote', () => {
  test('responde 404 si el token no existe o fue revocado', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.getPublicSharedNote({ params: { token: 'nope' } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('devuelve la nota compartida', async () => {
    queryResults = [{ rows: [noteRow()] }, ...formatQueries()];
    const res = makeRes();
    await nc.getPublicSharedNote({ params: { token: 'abc123' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
  });
});

test.describe('deleteCoverImage', () => {
  test('responde 403 si el usuario es solo VIEWER', async () => {
    queryResults = [{ rows: [accessRow({ project_owner_id: 99, project_role: 'VIEWER' })] }];
    const res = makeRes();
    await nc.deleteCoverImage({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('elimina la portada y limpia Cloudinary', async () => {
    queryResults = [
      { rows: [accessRow({ cover_image: cloudinaryUrl })] },
      { rows: [noteRow({ cover_image: null })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.deleteCoverImage({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.coverImage, null);
    assert.equal(deleteFromCloudinary.mock.calls.length, 1);
  });
});

test.describe('generateShareToken / revokeShareToken', () => {
  test('genera un token de compartido', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.generateShareToken({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.match(res.body.shareToken, /^[a-f0-9]{32}$/);
  });

  test('revoca el token de compartido', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.revokeShareToken({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Enlace compartido revocado exitosamente');
  });
});

test.describe('getComments / addComment / updateComment / deleteComment', () => {
  test('rechaza con 400 un ID de nota no válido', async () => {
    const res = makeRes();
    await nc.getComments({ params: { id: 'abc' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('lista los comentarios de la nota', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 2, note_id: 1, user_id: 1, content: 'hola', author_name: 'Ana', author_email: 'a@t.com', author_avatar: null, created_at: 'd', updated_at: null }] },
    ];
    const res = makeRes();
    await nc.getComments({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body[0].authorName, 'Ana');
  });

  test('rechaza con 400 un comentario vacío', async () => {
    const res = makeRes();
    await nc.addComment({ params: { id: 1 }, body: { content: '  ' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('crea un comentario con datos del autor', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ id: 2, note_id: 1, user_id: 1, content: 'hola', created_at: 'd', updated_at: null }] },
      { rows: [{ name: 'Ana', email: 'a@t.com', avatar: null }] },
    ];
    const res = makeRes();
    await nc.addComment({ params: { id: 1 }, body: { content: 'hola' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.authorName, 'Ana');
  });

  test('responde 404 si el comentario no existe al editarlo', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.updateComment({ params: { id: 1, commentId: 9 }, body: { content: 'nuevo' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('responde 403 si no es el autor del comentario', async () => {
    queryResults = [{ rows: [{ id: 9, note_id: 1, user_id: 99 }] }];
    const res = makeRes();
    await nc.updateComment({ params: { id: 1, commentId: 9 }, body: { content: 'x' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('edita el comentario del propio autor', async () => {
    queryResults = [
      { rows: [{ id: 9, note_id: 1, user_id: 1 }] },
      { rows: [{ id: 9, note_id: 1, user_id: 1, content: 'editado', created_at: 'd', updated_at: 'd2' }] },
      { rows: [{ name: 'Ana', email: 'a@t.com', avatar: null }] },
    ];
    const res = makeRes();
    await nc.updateComment({ params: { id: 1, commentId: 9 }, body: { content: 'editado' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.content, 'editado');
  });

  test('responde 403 si ni autor ni dueño del proyecto', async () => {
    queryResults = [{ rows: [{ id: 9, user_id: 99, project_owner_id: 99 }] }];
    const res = makeRes();
    await nc.deleteComment({ params: { id: 1, commentId: 9 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('elimina el comentario como autor (204)', async () => {
    queryResults = [
      { rows: [{ id: 9, user_id: 1, project_owner_id: 1 }] },
      { rows: [] },
    ];
    const res = makeRes();
    await nc.deleteComment({ params: { id: 1, commentId: 9 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 204);
  });
});

test.describe('joinNote', () => {
  test('responde 404 si el token es inválido', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.joinNote({ params: { token: 'nope' }, user: { id: 1, name: 'Ana' } }, res, () => {});
    assert.equal(res.statusCode, 404);
  });

  test('no se une si ya es el dueño del proyecto', async () => {
    queryResults = [
      { rows: [accessRow()] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.joinNote({ params: { token: 'abc123' }, user: { id: 1, name: 'Ana' } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 1);
  });

  test('se une como colaborador y notifica al dueño', async () => {
    queryResults = [
      { rows: [accessRow({ project_owner_id: 99 })] },
      { rows: [] },                        // INSERT note_members
      { rows: [] },                        // INSERT notifications
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.joinNote({ params: { token: 'abc123' }, user: { id: 1, name: 'Ana' } }, res, () => {});
    assert.equal(res.statusCode, 200);
  });
});

test.describe('getNoteMembers / updateNoteMemberRole / removeNoteMember', () => {
  test('lista los colaboradores de la nota', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [{ membership_id: 4, user_id: 2, role: 'EDITOR', joined_at: 'd', name: 'Luis', email: 'l@t.com', avatar: null }] },
    ];
    const res = makeRes();
    await nc.getNoteMembers({ params: { id: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body[0].name, 'Luis');
    assert.equal(res.body[0].role, 'EDITOR');
  });

  test('actualiza el rol de un colaborador', async () => {
    queryResults = [{ rows: [accessRow()] }, { rows: [] }];
    const res = makeRes();
    await nc.updateNoteMemberRole({ params: { id: 1, userId: 2 }, body: { role: 'VIEWER' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Rol actualizado exitosamente');
  });

  test('se remueve a sí mismo y regenera el enlace', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [] },                        // DELETE note_members
      { rows: [] },                        // UPDATE share_token
    ];
    const res = makeRes();
    await nc.removeNoteMember({ params: { id: 1, userId: 1 }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.match(res.body.shareToken, /^[a-f0-9]{32}$/);
  });
});

test.describe('restoreAllTrashNotes / emptyTrash', () => {
  test('restaura todas las notas de la papelera', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.restoreAllTrashNotes({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Todas las notas han sido restauradas');
  });

  test('vacía la papelera sin notas', async () => {
    queryResults = [{ rows: [] }];
    const res = makeRes();
    await nc.emptyTrash({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Papelera vaciada exitosamente');
  });

  test('vacía la papelera eliminando archivos de Cloudinary', async () => {
    queryResults = [
      { rows: [noteRow({ cover_image: cloudinaryUrl, id: 1 }), noteRow({ id: 2 })] },
      { rows: [{ url: cloudinaryUrl }] },
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    ];
    const res = makeRes();
    await nc.emptyTrash({ user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(deleteFromCloudinary.mock.calls.length, 2); // portada + adjunto
  });
});

test.describe('setNotePin / verifyNotePin / removeNotePin', () => {
  test('rechaza con 400 un PIN de menos de 4 dígitos', async () => {
    const res = makeRes();
    await nc.setNotePin({ params: { id: 1 }, body: { pin: '12' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('protege la nota con PIN', async () => {
    queryResults = [
      { rows: [accessRow()] },
      { rows: [noteRow({ pin_hash: 'hash', is_locked: true })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.setNotePin({ params: { id: 1 }, body: { pin: '1234' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isLocked, true);
  });

  test('verifica PIN: devuelve true si la nota no tiene PIN', async () => {
    queryResults = [{ rows: [accessRow()] }];
    const res = makeRes();
    await nc.verifyNotePin({ params: { id: 1 }, body: { pin: '' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.verified, true);
  });

  test('verifica PIN: rechaza uno incorrecto', async () => {
    queryResults = [{ rows: [accessRow({ pin_hash: await bcrypt.hash('1234', 4) })] }];
    const res = makeRes();
    await nc.verifyNotePin({ params: { id: 1 }, body: { pin: '9999' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.verified, false);
  });

  test('verifica PIN: acepta uno correcto', async () => {
    queryResults = [{ rows: [accessRow({ pin_hash: await bcrypt.hash('1234', 4) })] }];
    const res = makeRes();
    await nc.verifyNotePin({ params: { id: 1 }, body: { pin: '1234' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.verified, true);
  });

  test('removeNotePin rechaza con 401 un PIN incorrecto', async () => {
    queryResults = [{ rows: [accessRow({ pin_hash: await bcrypt.hash('1234', 4) })] }];
    const res = makeRes();
    await nc.removeNotePin({ params: { id: 1 }, body: { pin: '0000' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'PIN actual incorrecto');
  });

  test('removeNotePin desbloquea la nota', async () => {
    queryResults = [
      { rows: [accessRow({ pin_hash: await bcrypt.hash('1234', 4) })] },
      { rows: [noteRow({ pin_hash: null, is_locked: false })] },
      ...formatQueries(),
    ];
    const res = makeRes();
    await nc.removeNotePin({ params: { id: 1 }, body: { pin: '1234' }, user: { id: 1 } }, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isLocked, false);
  });
});
