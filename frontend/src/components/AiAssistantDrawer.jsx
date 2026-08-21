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
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Close as CloseIcon,
  AutoAwesome as SparklesIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  DeleteSweep as ClearIcon,
  Lightbulb as IdeaIcon,
  MenuBook as BookIcon,
  Checklist as TasksIcon,
  Bolt as FastIcon,
  Folder as FolderIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  PostAdd as PostAddIcon,
  NoteAdd as NoteAddIcon,
  VerticalAlignBottom as AppendIcon,
  FindReplace as ReplaceIcon,
  Input as CursorInsertIcon,
  ArrowDropDown as ArrowDropDownIcon,
  AlternateEmail as AtIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useProjectNotes } from '../hooks/useProjectNotes';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { getPlainText } from '../utils/text';
import { renderMarkdown, markdownToEditorHtml } from '../utils/markdown';

const SUGGESTED_PROMPTS = [
  { icon: <IdeaIcon sx={{ fontSize: 15 }} />, text: '¿Qué funciones y atajos tiene Notitas?', label: 'Atajos y funciones' },
  { icon: <AtIcon sx={{ fontSize: 15 }} />, text: '¿Cómo arrobar y vincular notas de otros proyectos?', label: 'Menciones @ entre notas' },
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
    setCurrentNote,
    setCurrentProject,
  } = useUiStore();
  const queryClient = useQueryClient();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeNoteContext, setIncludeNoteContext] = useState(true);
  const [transferMenuAnchor, setTransferMenuAnchor] = useState(null);
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
        provider: res.data.provider || 'CleoBot',
        model: res.data.model,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error en AI Assistant chat:', err);
      const serverMessage = err.response?.data?.message;
      const errMsg = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: serverMessage
          ? `⚠️ ${serverMessage}`
          : '⚠️ Lo siento, ocurrió un problema al conectar con los servicios de IA. Por favor intenta de nuevo en unos momentos.',
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

  const createNewNoteWithAiContent = async (markdownContent) => {
    try {
      const targetProjectId =
        currentProjectId && typeof currentProjectId === 'number'
          ? currentProjectId
          : projects.length > 0
            ? projects[0].id
            : null;

      if (!targetProjectId) {
        toast.error('Crea o selecciona un proyecto para guardar notas');
        return;
      }

      // Extraer una primera línea limpia como título sugerido
      const firstLine = markdownContent
        .split('\n')[0]
        .replace(/^#+\s*/, '')
        .replace(/[*`_]/g, '')
        .trim()
        .slice(0, 48);
      const noteTitle = firstLine ? `CleoBot: ${firstLine}` : 'Respuesta de CleoBot';
      const editorHtml = markdownToEditorHtml(markdownContent);

      const res = await api.post(`/projects/${targetProjectId}/notes`, {
        title: noteTitle,
        content: editorHtml,
        tags: ['CleoBot', 'IA'],
        icon: '🤖',
      });

      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['projectNotes'] });
      setCurrentProject(targetProjectId);
      setCurrentNote(res.data.id);
      toast.success('Nueva nota creada con el contenido de CleoBot');
    } catch (err) {
      console.error('Error creando nueva nota desde IA:', err);
      toast.error('No se pudo crear la nueva nota');
    }
  };

  const handleInsertIntoNote = (content, mode = 'insert') => {
    if (!currentNoteId) {
      createNewNoteWithAiContent(content);
      return;
    }

    const htmlContent = markdownToEditorHtml(content);

    window.dispatchEvent(
      new CustomEvent('notitas-ai-insert', {
        detail: { content: htmlContent, mode },
      })
    );

    if (mode === 'replace') {
      toast.success('Contenido de la nota reemplazado');
    } else if (mode === 'append') {
      toast.success('Contenido añadido al final de la nota');
    } else {
      toast.success('Contenido insertado en la nota activa');
    }
  };

  const handleOpenTransferMenu = (event, content) => {
    event.stopPropagation();
    setTransferMenuAnchor({ el: event.currentTarget, content });
  };

  const handleCloseTransferMenu = () => {
    setTransferMenuAnchor(null);
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
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.8, pl: 0.5, mt: 0.3 }}>
                  {msg.provider && (
                    <Chip
                      label={msg.provider}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, opacity: 0.75 }}
                    />
                  )}

                  {/* Botón principal para traspasar a la nota */}
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<PostAddIcon sx={{ fontSize: 16 }} />}
                    endIcon={<ArrowDropDownIcon sx={{ fontSize: 18, ml: -0.5 }} />}
                    onClick={(e) => handleOpenTransferMenu(e, msg.content)}
                    aria-label="Traspasar respuesta a la nota"
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      py: 0.3,
                      px: 1.2,
                      height: 26,
                      borderRadius: 2,
                      borderColor: 'divider',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.18)' : 'rgba(56, 108, 95, 0.08)',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    {currentNoteId ? 'Traspasar a nota' : 'Crear nueva nota'}
                  </Button>

                  {/* Acceso rápido a copiar */}
                  <Tooltip title="Copiar al portapapeles">
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(msg.content)}
                      aria-label="Copiar respuesta"
                      sx={{
                        p: 0.4,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <CopyIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
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

      {/* ── Menú de Opciones para Traspasar a la Nota ── */}
      <Menu
        anchorEl={transferMenuAnchor?.el}
        open={Boolean(transferMenuAnchor)}
        onClose={handleCloseTransferMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 260,
            boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
            border: '1px solid',
            borderColor: 'divider',
            p: 0.6,
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 0.6, borderBottom: '1px solid', borderColor: 'divider', mb: 0.5 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.6 }}
          >
            Traspasar a la nota
          </Typography>
        </Box>

        {currentNoteId ? [
          <MenuItem
            key="insert"
            onClick={() => {
              if (transferMenuAnchor?.content) {
                handleInsertIntoNote(transferMenuAnchor.content, 'insert');
              }
              handleCloseTransferMenu();
            }}
            sx={{ borderRadius: 2, py: 0.8, mb: 0.2 }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
              <CursorInsertIcon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText
              primary="Insertar en el cursor"
              secondary="En la posición actual de la nota"
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </MenuItem>,

          <MenuItem
            key="append"
            onClick={() => {
              if (transferMenuAnchor?.content) {
                handleInsertIntoNote(transferMenuAnchor.content, 'append');
              }
              handleCloseTransferMenu();
            }}
            sx={{ borderRadius: 2, py: 0.8, mb: 0.2 }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'secondary.main' }}>
              <AppendIcon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText
              primary="Añadir al final"
              secondary="Agregar al final de la nota activa"
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </MenuItem>,

          <MenuItem
            key="replace"
            onClick={async () => {
              const contentToReplace = transferMenuAnchor?.content;
              handleCloseTransferMenu();
              if (!contentToReplace) return;
              const ok = await confirm({
                title: '¿Reemplazar contenido de la nota?',
                message:
                  'Esta acción sustituirá todo el texto actual de la nota por la respuesta de CleoBot. Podrás deshacer el cambio con Ctrl+Z.',
                confirmText: 'Reemplazar',
                cancelText: 'Cancelar',
              });
              if (ok) {
                handleInsertIntoNote(contentToReplace, 'replace');
              }
            }}
            sx={{ borderRadius: 2, py: 0.8, mb: 0.2 }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'warning.main' }}>
              <ReplaceIcon sx={{ fontSize: 19 }} />
            </ListItemIcon>
            <ListItemText
              primary="Reemplazar contenido"
              secondary="Sustituir toda la nota actual"
              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
              secondaryTypographyProps={{ fontSize: '0.7rem' }}
            />
          </MenuItem>,

          <Divider key="divider" sx={{ my: 0.6 }} />,
        ] : null}

        <MenuItem
          onClick={() => {
            if (transferMenuAnchor?.content) {
              createNewNoteWithAiContent(transferMenuAnchor.content);
            }
            handleCloseTransferMenu();
          }}
          sx={{ borderRadius: 2, py: 0.8, mb: 0.2 }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#10b981' }}>
            <NoteAddIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary="Crear como nueva nota"
            secondary="Guardar en el proyecto activo"
            primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.7rem' }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (transferMenuAnchor?.content) {
              handleCopy(transferMenuAnchor.content);
            }
            handleCloseTransferMenu();
          }}
          sx={{ borderRadius: 2, py: 0.8 }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
            <CopyIcon sx={{ fontSize: 19 }} />
          </ListItemIcon>
          <ListItemText
            primary="Copiar texto"
            secondary="Copiar respuesta al portapapeles"
            primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
            secondaryTypographyProps={{ fontSize: '0.7rem' }}
          />
        </MenuItem>
      </Menu>
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
