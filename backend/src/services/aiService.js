import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_PROMPT = `Eres "CleoBot", la asistente virtual oficial e integrada de Notitas (la plataforma moderna de notas, proyectos y colaboración en equipo).

Tu misión es ayudar al usuario a:
1. Responder cualquier duda sobre el funcionamiento, trucos y atajos de Notitas.
2. Ayudar a redactar, resumir, estructurar, traducir, corregir y expandir notas o ideas.
3. Generar listas de tareas accionables, tablas, minutas, esquemas de proyectos y plantillas personalizadas.
4. Diseñar estrategias de organización para proyectos individuales o en equipo.

### 📚 Base de Conocimiento Oficial de Notitas:
- **Proyectos y Espacios de Trabajo:** Los usuarios pueden crear proyectos con colores temáticos personalizados (violeta, esmeralda, ámbar, zafiro, etc.), iconos y portadas personalizadas.
- **Roles y Colaboración:**
  - \`OWNER\`: Creador del proyecto con control total, gestión de miembros y enlaces de invitación.
  - \`EDITOR\`: Miembro con permisos para crear y modificar notas y adjuntos.
  - \`VIEWER\`: Miembro con permisos de solo lectura.
- **Editor TipTap & Markdown:** Soporta texto enriquecido con atajos Markdown, encabezados (H1, H2, H3), listas de verificación interactivas (\`[ ] Checklist\`), tablas editables, bloques de código con sintaxis resaltada, citas y divisores.
- **Portadas y GIFs:** Selector integrado con GIPHY para portadas animadas y fondos HD, además de subida de imágenes propias.
- **Modo Zen / Concentración:** Atajo de teclado \`Ctrl + Shift + F\` / \`Cmd + Shift + F\` o tecla \`Escape\` para ocultar barras laterales y centrarse en la escritura con resplandor ambiental del proyecto.
- **Slash Commands (\`/\`):** Escribir \`/\` al inicio de una línea abre el menú flotante rápido de bloques y plantillas.
- **Catálogo de 15 Plantillas:** Minuta de reunión, Plan de Sprint, Lluvia de ideas, Metas semanales, Ficha de lectura, Daily standup, Lista de compras, To-Do list, Recetas de cocina, Plan de viaje, Presupuesto mensual, Rutina de gimnasio, Diario de gratitud, Seguimiento de hábitos y Ficha de contacto.
- **Tablero Kanban:** Vista ágil con Drag & Drop nativo entre columnas "Por Hacer", "En Progreso" y "Terminado".
- **Exportación e Importación:** Arrastre de archivos \`.md\` y \`.txt\`, y exportación a PDF, Word (.docx), Markdown (.md), HTML y PNG.
- **Compartido Público:** Enlaces seguros con token único para lectura pública y colaboración.

### 📊 Resúmenes de Proyectos
Cuando el usuario te pida un resumen de un proyecto (por ejemplo: "dame un resumen del proyecto X", "qué contiene mi proyecto Y"):
- Usa ÚNICAMENTE el contenido del proyecto que se te proporciona en el contexto (sección "Contenido del proyecto"). No inventes notas, datos ni temas que no estén ahí.
- Estructura la respuesta con encabezados Markdown:
  - \`### 📌 Resumen\` — qué es el proyecto en 2-3 líneas según sus notas y descripción.
  - \`### 🗂️ Temas y contenido clave\` — agrupa las notas por temas o etiquetas, mencionando sus títulos.
  - \`### ⭐ Notas destacadas\` — las notas favoritas, más extensas o más recientes.
  - \`### 🚀 Sugerencias\` — 2-3 ideas concretas para avanzar o mejorar el proyecto.
- Si no se te proporcionó el contenido de ningún proyecto (no hay contexto de proyecto en el prompt), NO inventes datos: indica amablemente que necesitas acceso al proyecto o pide que lo abras para poder consultar sus notas.
- Si el usuario menciona un proyecto que no está en tu contexto, acláralo y ofrece los que sí puedes ver.

### 🎨 Estilo y Tono de tus Respuestas:
- Sé conciso, claro, estructurado y profesional pero cercano.
- Utiliza formato Markdown limpio (títulos con \`###\`, listas con viñetas \`-\`, negritas para resaltar conceptos clave y emojis cuando aporten claridad visual).
- Cuando generes contenido para una nota, proporciona texto listo para copiar e insertar.
- Si te preguntan cómo hacer algo en Notitas, explica el paso a paso exacto indicando botones, menús o atajos de teclado.
`;

/**
 * Intento con Groq (Provider 1 - Ultra Rápido)
 */
async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  const model = process.env.GROQ_MODEL || 'groq/compound';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Groq error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq devolvió una respuesta vacía');

  return {
    content: content.trim(),
    provider: 'Groq',
    model,
  };
}

/**
 * Intento con OpenRouter (Provider 2 - Respaldo Inteligente)
 */
async function callOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada');

  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://notitas-cleo.vercel.app',
      'X-Title': 'CleoBot - Asistente Virtual',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter devolvió una respuesta vacía');

  return {
    content: content.trim(),
    provider: 'OpenRouter',
    model,
  };
}

/**
 * Intento con Google Gemini AI Studio (Provider 3 - Respaldo de Alta Cuota)
 */
async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');

  // Convertir mensajes formato OpenAI al formato generateContent de Google Gemini API
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find((m) => m.role === 'system')?.content;

  const requestBody = {
    contents,
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini devolvió una respuesta vacía');

  return {
    content: content.trim(),
    provider: 'Google Gemini',
    model,
  };
}

/**
 * Ejecutor con Fallback en Cascada Ordenado:
 * Groq -> OpenRouter -> Google Gemini
 */
export async function executeAiCompletion(messages) {
  const providers = [
    { name: 'Groq', fn: () => callGroq(messages) },
    { name: 'OpenRouter', fn: () => callOpenRouter(messages) },
    { name: 'Gemini', fn: () => callGemini(messages) },
  ];

  let lastError = null;

  for (const p of providers) {
    try {
      const result = await p.fn();
      return result;
    } catch (err) {
      console.warn(`[AI Failover] Proveedor ${p.name} falló:`, err.message || err);
      lastError = err;
      // Continúa automáticamente al siguiente proveedor en la lista
    }
  }

  throw new Error(`Todos los proveedores de IA fallaron. Último error: ${lastError?.message || 'Error desconocido'}`);
}

/**
 * Chat Conversacional con Contexto de Notitas
 */
export async function chatWithAssistant({ messages = [], noteContext = null, projectContext = null, projectDossier = null, userName = '' }) {
  let contextAddendum = '';
  if (userName) {
    contextAddendum += `\n- Usuario actual: ${userName}`;
  }
  if (projectContext) {
    contextAddendum += `\n- Proyecto activo: "${projectContext.name}" (${projectContext.description || 'Sin descripción'})`;
  }
  if (projectDossier) {
    contextAddendum += `\n\n- Contenido completo del proyecto "${projectDossier.name}" para poder resumirlo:
  * Descripción: ${projectDossier.description || 'Sin descripción'}
  * ${projectDossier.stats.noteCount} notas en total (${projectDossier.stats.activeCount} activas, ~${projectDossier.stats.totalWords} palabras).`;
    for (const n of projectDossier.notes) {
      contextAddendum += `\n\n### Nota: "${n.title}"`;
      if (n.tags.length > 0) contextAddendum += ` (etiquetas: ${n.tags.join(', ')})`;
      if (n.favorite) contextAddendum += ' ⭐';
      if (n.archived) contextAddendum += ' [archivada]';
      contextAddendum += `\n${n.content || '(Nota vacía)'}`;
    }
  }
  if (noteContext) {
    contextAddendum += `\n- Nota abierta actualmente:
  * Título: "${noteContext.title || 'Sin título'}"
  * Etiquetas: [${(noteContext.tags || []).join(', ')}]
  * Contenido actual de la nota:\n${noteContext.content || '(Nota vacía)'}`;
  }

  const fullSystemPrompt = SYSTEM_PROMPT + (contextAddendum ? `\n\n### 📌 Contexto Actual del Espacio de Trabajo:${contextAddendum}` : '');

  const formattedMessages = [
    { role: 'system', content: fullSystemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  ];

  return await executeAiCompletion(formattedMessages);
}

/**
 * Transformaciones rápidas de texto para el editor (Resumir, Mejorar, Tareas, etc.)
 */
export async function transformTextWithAi({ action, text, instructions = '' }) {
  let promptText = '';

  switch (action) {
    case 'summarize':
      promptText = `Resume el siguiente texto en puntos clave claros y concisos:\n\n${text}`;
      break;
    case 'improve':
      promptText = `Mejora la redacción, claridad y estilo del siguiente texto, manteniendo la idea original y corrigiendo errores ortográficos:\n\n${text}`;
      break;
    case 'to_tasks':
      promptText = `Extrae y convierte las acciones o pendientes del siguiente texto en una lista de tareas estructurada:\n\n${text}`;
      break;
    case 'to_table':
      promptText = `Organiza los siguientes datos o información en una tabla clara y estructurada con encabezados adecuados:\n\n${text}`;
      break;
    case 'expand':
      promptText = `Desarrolla y expande los siguientes puntos con argumentos sólidos, ejemplos y explicaciones detalladas:\n\n${text}`;
      break;
    case 'translate_en':
      promptText = `Traduce el siguiente texto al inglés de manera natural y profesional:\n\n${text}`;
      break;
    case 'translate_es':
      promptText = `Traduce el siguiente texto al español de manera natural y profesional:\n\n${text}`;
      break;
    case 'custom':
    default:
      promptText = `${instructions || 'Procesa el siguiente texto:'}\n\n${text}`;
      break;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: promptText },
  ];

  return await executeAiCompletion(messages);
}
