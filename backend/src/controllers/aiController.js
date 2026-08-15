import { chatWithAssistant, transformTextWithAi } from '../services/aiService.js';

export const handleAiChat = async (req, res, next) => {
  try {
    const { messages, noteContext, projectContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'El campo "messages" es obligatorio y debe ser un array no vacío.' });
    }

    const userName = req.user?.name || req.user?.username || req.user?.email || 'Usuario';

    const result = await chatWithAssistant({
      messages,
      noteContext,
      projectContext,
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

export const handleAiTransform = async (req, res, next) => {
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
