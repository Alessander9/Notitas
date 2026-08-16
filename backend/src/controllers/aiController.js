import { chatWithAssistant, transformTextWithAi } from '../services/aiService.js';
import { buildProjectDossier, findProjectByMessage } from '../services/projectContextService.js';

export const handleAiChat = async (req, res) => {
  try {
    const { messages, noteContext, projectContext, projectId, userProjects } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'El campo "messages" es obligatorio y debe ser un array no vacío.' });
    }

    const userName = req.user?.name || req.user?.username || req.user?.email || 'Usuario';
    const userId = req.user?.id;

    // Construir el dossier del proyecto consultado para poder resumirlo:
    // 1. Si el frontend envía projectId (proyecto abierto) se usa ese.
    // 2. Si no, se detecta la mención de un proyecto por nombre en el último
    //    mensaje del usuario (p.ej. "dame un resumen del proyecto Marketing").
    let projectDossier = null;
    if (userId) {
      let targetProjectId = projectId;
      if (!targetProjectId) {
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
        const mention = lastUserMsg ? findProjectByMessage(lastUserMsg.content, userProjects) : null;
        if (mention) targetProjectId = mention.id;
      }
      if (targetProjectId) {
        try {
          projectDossier = await buildProjectDossier(targetProjectId, userId);
        } catch (error) {
          console.error('Error building project dossier:', error);
        }
      }
    }

    const result = await chatWithAssistant({
      messages,
      noteContext,
      projectContext,
      projectDossier,
      userName,
    });

    return res.json({
      message: result.content,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Error in handleAiChat:', error);
    return res.status(500).json({
      message: error.message || 'Error procesando la solicitud con el asistente de IA.',
    });
  }
};

export const handleAiTransform = async (req, res) => {
  try {
    const { action, text, instructions } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'El campo "text" es obligatorio.' });
    }

    const result = await transformTextWithAi({
      action: action || 'custom',
      text: text.trim(),
      instructions,
    });

    return res.json({
      result: result.content,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('Error in handleAiTransform:', error);
    return res.status(500).json({
      message: error.message || 'Error al transformar texto con el asistente de IA.',
    });
  }
};
