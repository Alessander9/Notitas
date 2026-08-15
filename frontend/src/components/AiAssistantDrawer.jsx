import React, { useState, useRef, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Tooltip,
  Paper,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as SparklesIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  AddCircleOutline as InsertIcon,
  DeleteSweep as ClearIcon,
  Lightbulb as IdeaIcon,
  MenuBook as BookIcon,
  Checklist as TasksIcon,
  Bolt as FastIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { getPlainText } from '../utils/text';

const SUGGESTED_PROMPTS = [
  { icon: <IdeaIcon sx={{ fontSize: 15 }} />, text: '¿Qué funciones y atajos tiene Notitas?', label: 'Atajos y funciones' },
  { icon: <FastIcon sx={{ fontSize: 15 }} />, text: '¿Cómo activar el Modo Zen o los comandos "/"?', label: 'Modo Zen y Slash' },
  { icon: <BookIcon sx={{ fontSize: 15 }} />, text: 'Resume los puntos clave de la nota actual', label: 'Resumir nota actual', needsNote: true },
  { icon: <TasksIcon sx={{ fontSize: 15 }} />, text: 'Extrae una lista de tareas de la nota actual', label: 'Extraer tareas', needsNote: true },
  { icon: <IdeaIcon sx={{ fontSize: 15 }} />, text: 'Dame ideas para estructurar un nuevo proyecto', label: 'Ideas de proyecto' },
];

export default function AiAssistantDrawer() {
  const theme = useTheme();
  const {
    aiDrawerOpen,
    setAiDrawerOpen,
    currentNoteId,
    currentProjectId,
  } = useUiStore();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeNoteContext, setIncludeNoteContext] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy **Notitas AI**, tu asistente inteligente. Puedo ayudarte a redactar, resumir tus notas, responder dudas sobre la plataforma o generar ideas para tus proyectos. ¿En qué te ayudo hoy?',
      provider: 'Notitas AI',
    },
  ]);

  const messagesEndRef = useRef(null);

  // Fetch current note for context
  const { data: note } = useQuery({
    queryKey: ['note', currentNoteId],
    queryFn: async () => {
      if (!currentNoteId) return null;
      const res = await api.get(`/notes/${currentNoteId}`);
      return res.data;
    },
    enabled: Boolean(currentNoteId),
  });

  // Fetch current project for context
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });

  const activeProject = projects.find((p) => p.id === currentProjectId);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (aiDrawerOpen) {
      scrollToBottom();
    }
  }, [messages, aiDrawerOpen]);

  const handleSend = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      content: text,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    try {
      // Build context if note is active and option is checked
      const noteContext = includeNoteContext && note
        ? {
            title: note.title,
            tags: note.tags,
            content: getPlainText(note.content, ''),
          }
        : null;

      const projectContext = activeProject
        ? {
            name: activeProject.name,
            description: activeProject.description,
          }
        : null;

      const res = await api.post('/ai/chat', {
        messages: newMessages.filter((m) => m.id !== 'welcome').map((m) => ({
          role: m.role,
          content: m.content,
        })),
        noteContext,
        projectContext,
      });

      const aiMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.data.message,
        provider: res.data.provider || 'Groq',
        model: res.data.model,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error in AI Assistant chat:', err);
      const errMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: '⚠️ Lo siento, ocurrió un problema al conectar con los servicios de IA. Por favor intenta de nuevo en unos momentos.',
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Respuesta copiada al portapapeles');
  };

  const handleInsertIntoNote = (content) => {
    if (!currentNoteId) {
      toast.info('Abre una nota para poder insertar el contenido generado');
      return;
    }
    // Convert markdown line breaks to HTML paragraphs
    const formatted = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    window.dispatchEvent(
      new CustomEvent('notitas-ai-insert', {
        detail: { content: `<p>${formatted}</p>` },
      })
    );
    toast.success('Contenido insertado en la nota activa');
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversación reiniciada. ¿En qué más puedo ayudarte hoy?',
        provider: 'Notitas AI',
      },
    ]);
  };

  return (
    <Drawer
      anchor="right"
      open={aiDrawerOpen}
      onClose={() => setAiDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400, md: 440 },
          bgcolor: 'background.default',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
          borderLeft: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(56, 108, 95, 0.12) 0%, rgba(38, 78, 68, 0.04) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(56, 108, 95, 0.35)',
            }}
          >
            <SparklesIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 0.8 }}>
              Notitas AI
              <Chip
                label="Multi-IA"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  bgcolor: 'primary.main',
                  color: '#fff',
                }}
              />
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Groq • OpenRouter • Google Gemini
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Limpiar conversación">
            <IconButton size="small" onClick={handleClearHistory} sx={{ p: 0.6 }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar (Esc o Ctrl+J)">
            <IconButton size="small" onClick={() => setAiDrawerOpen(false)} sx={{ p: 0.6 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Active Note Context Bar ────────────────────────── */}
      {note && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontSize: '1rem', lineHeight: 1 }}>
              {note.icon || '📝'}
            </Typography>
            <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
              {note.title || 'Sin título'}
            </Typography>
          </Box>
          <Chip
            label={includeNoteContext ? 'Contexto activo' : 'Sin contexto'}
            size="small"
            clickable
            onClick={() => setIncludeNoteContext(!includeNoteContext)}
            color={includeNoteContext ? 'primary' : 'default'}
            variant={includeNoteContext ? 'filled' : 'outlined'}
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
          />
        </Box>
      )}

      {/* ── Messages Container ─────────────────────────────── */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 0.5,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.8,
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  bgcolor: isUser
                    ? 'primary.main'
                    : msg.isError
                      ? 'error.light'
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                  color: isUser ? '#fff' : 'text.primary',
                  maxWidth: '92%',
                  border: isUser ? 'none' : '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  '& h2, & h3, & h4': {
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    mt: 1,
                    mb: 0.5,
                    color: isUser ? '#fff' : 'text.primary',
                  },
                  '& ul, & ol': { pl: 2.2, my: 0.5 },
                  '& code': {
                    bgcolor: isUser ? 'rgba(0,0,0,0.2)' : 'action.hover',
                    px: 0.6,
                    py: 0.2,
                    borderRadius: 1,
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  },
                }}
              >
                {msg.content}
              </Paper>

              {/* Action Buttons below AI messages */}
              {!isUser && !msg.isError && msg.id !== 'welcome' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, pl: 0.5 }}>
                  {msg.provider && (
                    <Chip
                      label={msg.provider}
                      size="small"
                      sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, opacity: 0.7 }}
                    />
                  )}
                  <Tooltip title="Copiar al portapapeles">
                    <IconButton size="small" onClick={() => handleCopy(msg.content)} sx={{ p: 0.4 }}>
                      <CopyIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  {currentNoteId && (
                    <Tooltip title="Insertar en la nota activa">
                      <IconButton size="small" onClick={() => handleInsertIntoNote(msg.content)} sx={{ p: 0.4, color: 'primary.main' }}>
                        <InsertIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.5, bgcolor: 'action.hover', borderRadius: 3, maxWidth: 260 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Notitas AI está pensando...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* ── Suggested Prompts Chips ────────────────────────── */}
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', overflowX: 'auto', display: 'flex', gap: 0.8 }}>
        {SUGGESTED_PROMPTS.map((prompt, idx) => {
          if (prompt.needsNote && !note) return null;
          return (
            <Chip
              key={idx}
              icon={prompt.icon}
              label={prompt.label}
              size="small"
              clickable
              onClick={() => handleSend(prompt.text)}
              disabled={loading}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: 2,
                flexShrink: 0,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            />
          );
        })}
      </Box>

      {/* ── Input Box ──────────────────────────────────────── */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            multiline
            maxRows={4}
            size="small"
            fullWidth
            placeholder="Pregunta algo a Notitas AI (Enter para enviar)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            InputProps={{
              sx: {
                borderRadius: 3,
                fontSize: '0.86rem',
                bgcolor: 'action.hover',
              },
            }}
          />
          <IconButton
            color="primary"
            aria-label="Enviar mensaje a Notitas AI"
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || loading}
            sx={{
              p: 1.1,
              bgcolor: inputMessage.trim() && !loading ? 'primary.main' : 'action.disabledBackground',
              color: '#fff',
              borderRadius: 2.5,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { color: 'text.disabled' },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}
