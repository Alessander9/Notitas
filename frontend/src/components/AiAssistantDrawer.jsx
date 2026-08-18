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
  useMediaQuery,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
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
  Folder as FolderIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { toast } from '../store/toastStore';
import { getPlainText } from '../utils/text';
import { renderMarkdown } from '../utils/markdown';

const SUGGESTED_PROMPTS = [
  { icon: <IdeaIcon sx={{ fontSize: 15 }} />, text: '¿Qué funciones y atajos tiene Notitas?', label: 'Atajos y funciones' },
  { icon: <FastIcon sx={{ fontSize: 15 }} />, text: '¿Cómo activar el Modo Zen o los comandos "/"?', label: 'Modo Zen y Slash' },
  { icon: <BookIcon sx={{ fontSize: 15 }} />, text: 'Resume los puntos clave de la nota actual', label: 'Resumir nota actual', needsNote: true },
  { icon: <TasksIcon sx={{ fontSize: 15 }} />, text: 'Extrae una lista de tareas de la nota actual', label: 'Extraer tareas', needsNote: true },
  { icon: <IdeaIcon sx={{ fontSize: 15 }} />, text: 'Dame ideas para estructurar un nuevo proyecto', label: 'Ideas de proyecto' },
  { icon: <FolderIcon sx={{ fontSize: 15 }} />, text: 'Dame un resumen del proyecto actual', label: 'Resumir proyecto', needsProject: true },
];

// ── Shared panel content (used by both Drawer and inline panel) ──────────────
function AiPanelContent({ onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    aiDrawerOpen,
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
      content: '¡Hola! Soy **CleoBot**, tu asistente virtual. Puedo ayudarte a redactar, resumir tus notas, revisar tus proyectos, responder dudas sobre la plataforma o generar ideas. ¿En qué te ayudo hoy?',
      provider: 'CleoBot',
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

  // Fetch project notes for AI context (shared paginated cache)
  const { notes: projectNotes = [] } = useProjectNotes(
    typeof currentProjectId === 'number' ? currentProjectId : null,
    Boolean(currentProjectId && typeof currentProjectId === 'number')
  );

  const noteSummaries = React.useMemo(() => {
    const list = Array.isArray(projectNotes) ? projectNotes : [];
    if (!list.length) return [];
    return list.slice(0, 20).map((n) => ({
      title: n.title || 'Sin título',
      tags: n.tags || [],
      preview: (n.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
      updatedAt: n.updatedAt,
    }));
  }, [projectNotes]);

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
          noteCount: projectNotes.length,
          notes: noteSummaries,
        }
      : null;

    const apiMessages = newMessages.filter((m) => m.id !== 'welcome').map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await api.post('/ai/chat', {
        messages: apiMessages,
        noteContext,
        projectContext,
        // Para que la IA pueda revisar y resumir proyectos: el proyecto activo
        // y el catálogo de proyectos del usuario (para detectar menciones por nombre).
        projectId: activeProject?.id || null,
        userProjects: projects.map((p) => ({ id: p.id, name: p.name, description: p.description })),
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
      console.warn('Backend AI endpoint no respondió o falló, activando failover directo:', err);
      try {
        const directRes = await directAiChat(apiMessages, noteContext, projectContext);
        const aiMsg = {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: directRes.message,
          provider: directRes.provider || 'Groq Direct',
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (directErr) {
        console.error('Error total en AI Assistant chat:', directErr);
        const errMsg = {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: '⚠️ Lo siento, ocurrió un problema al conectar con los servicios de IA. Por favor intenta de nuevo en unos momentos.',
          isError: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      }
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
    // Convert markdown to HTML rich text for the note editor
    let formatted = content
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^```[\w]*\n?([\s\S]*?)```/gm, '<pre><code>$1</code></pre>')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[-*•]\s+(.*)$/gm, '<li>$1</li>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    // Agrupar viñetas consecutivas en una lista
    formatted = formatted.replace(/((?:<li>.*<\/li>\n?)+)/g, (m) => `<ul>${m}</ul>`);
    formatted = formatted.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');

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
        provider: 'CleoBot',
      },
    ]);
  };

  return (
    <>
      {/* ── Top Drag / Minimize Handle for Mobile ── */}
      {isMobile && (
        <Box
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Minimizar CleoBot"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            pb: 0.75,
            bgcolor: 'background.paper',
            cursor: 'pointer',
            borderBottom: '1px solid',
            borderColor: 'divider',
            transition: 'background 0.2s ease',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              py: 0.4,
              px: 2,
              borderRadius: 3,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 4,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'),
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'text.secondary',
                letterSpacing: '0.02em',
                userSelect: 'none',
              }}
            >
              Minimizar
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Header ────────────────────────────────────────── */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
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
          {isMobile && (
            <Tooltip title="Minimizar asistente">
              <IconButton
                onClick={onClose}
                aria-label="Minimizar CleoBot"
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                }}
              >
                <KeyboardArrowDownIcon sx={{ fontSize: 24 }} />
              </IconButton>
            </Tooltip>
          )}
          <Box
            sx={{
              width: { xs: 34, sm: 36 },
              height: { xs: 34, sm: 36 },
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(56, 108, 95, 0.35)',
            }}
          >
            <SparklesIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              CleoBot
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Tooltip title="Limpiar conversación">
            <IconButton
              size="small"
              onClick={handleClearHistory}
              aria-label="Limpiar conversación"
              sx={{
                width: { xs: 36, sm: 32 },
                height: { xs: 36, sm: 32 },
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar (Esc o Ctrl+J)">
            <IconButton
              onClick={onClose}
              aria-label="Cerrar asistente de IA"
              sx={{
                width: { xs: 38, sm: 34 },
                height: { xs: 38, sm: 34 },
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'),
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: '#fff',
                  borderColor: 'error.main',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <CloseIcon sx={{ fontSize: { xs: 20, sm: 18 } }} />
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
            <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
              {note.title || 'Sin título'}
            </Typography>
            {activeProject && (
              <>
                <Typography variant="caption" sx={{ opacity: 0.4 }}>·</Typography>
                <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 110, opacity: 0.75 }}>
                  {activeProject.icon || '📁'} {activeProject.name}
                </Typography>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={includeNoteContext ? 'Contexto activo' : 'Sin contexto'}
              size="small"
              clickable
              onClick={() => setIncludeNoteContext(!includeNoteContext)}
              color={includeNoteContext ? 'primary' : 'default'}
              variant={includeNoteContext ? 'filled' : 'outlined'}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
            />
            {noteSummaries.length > 0 && (
              <Chip
                size="small"
                label={`${noteSummaries.length} notas del proyecto`}
                sx={{ fontSize: '0.65rem', height: 18 }}
              />
            )}
          </Box>
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
                  '& h2, & h3, & h4': {
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    mt: 1,
                    mb: 0.5,
                    color: isUser ? '#fff' : 'text.primary',
                  },
                  '& ul, & ol': { pl: 2.2, my: 0.5 },
                  '& li': { my: 0.3 },
                  '& p': { my: 0.5, '&:first-of-type': { mt: 0 }, '&:last-of-type': { mb: 0 } },
                  '& code': {
                    bgcolor: isUser ? 'rgba(0,0,0,0.2)' : 'action.hover',
                    px: 0.6,
                    py: 0.2,
                    borderRadius: 1,
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  },
                  '& pre': {
                    bgcolor: isUser ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
                    p: 1.2,
                    borderRadius: 2,
                    overflowX: 'auto',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    my: 1,
                  },
                  '& blockquote': {
                    borderLeft: '3px solid',
                    borderColor: 'divider',
                    pl: 1.2,
                    my: 0.8,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  },
                  '& a': { color: isUser ? '#fff' : 'primary.main', fontWeight: 600 },
                  '& table': { my: 1, width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
                  '& th, & td': { borderBottom: '1px solid', borderColor: 'divider', py: 0.6, pr: 1.2, textAlign: 'left' },
                  '& hr': { my: 1, borderColor: 'divider', opacity: 0.5 },
                }}
              >
                {renderMarkdown(msg.content)}
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
              CleoBot está pensando...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* ── Suggested Prompts Chips ────────────────────────── */}
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', overflowX: 'auto', display: 'flex', gap: 0.8 }}>
        {SUGGESTED_PROMPTS.map((prompt, idx) => {
          if (prompt.needsNote && !note) return null;
          if (prompt.needsProject && !activeProject) return null;
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
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          pt: 1.5,
          pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', sm: 2 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            multiline
            maxRows={4}
            size="small"
            fullWidth
            placeholder="Pregunta algo a CleoBot (Enter para enviar)..."
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
            aria-label="Enviar mensaje a CleoBot"
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
    </>
  );
}

// ── Mobile / Default Drawer ───────────────────────────────────────────────
export default function AiAssistantDrawer({ forceRender = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { aiDrawerOpen, setAiDrawerOpen } = useUiStore();

  if (!isMobile && !forceRender) return null;

  return (
    <Drawer
      anchor="right"
      open={aiDrawerOpen}
      onClose={() => setAiDrawerOpen(false)}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        zIndex: 1400,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          maxWidth: '100vw',
          height: '100%',
          '@supports (height: 100dvh)': { height: '100dvh' },
          bgcolor: 'background.default',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
          borderLeft: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        },
      }}
    >
      <AiPanelContent onClose={() => setAiDrawerOpen(false)} />
    </Drawer>
  );
}

// ── Desktop: inline split-pane panel (named export) ──────────────────────────
export function AiAssistantPanel() {
  const { aiDrawerOpen, setAiDrawerOpen } = useUiStore();

  return (
    <AnimatePresence>
      {aiDrawerOpen && (
        <motion.div
          key="ai-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ overflow: 'hidden', flexShrink: 0, height: '100%' }}
        >
          <Box
            sx={{
              width: 420,
              minWidth: 420,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              overflow: 'hidden',
            }}
          >
            <AiPanelContent onClose={() => setAiDrawerOpen(false)} />
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
