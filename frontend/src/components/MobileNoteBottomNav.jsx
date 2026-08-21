import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GridView as DashboardIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  EditNote as FormatIcon,
  Close as CloseIcon,
  SmartToy as BotIcon,
  KeyboardArrowDown as ArrowDownIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatStrikethrough as StrikeIcon,
  PlaylistAddCheck as ChecklistIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  FormatQuote as QuoteIcon,
  Code as CodeIcon,
  Title as TitleIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Folder as FolderIcon,
  Explore as NavIcon,
} from '@mui/icons-material';
import { getProjectIcon } from '../constants/projectOptions';
import { formatRelativeTime } from '../utils/text';

export default function MobileNoteBottomNav({
  editor,
  currentNoteId,
  currentProjectId,
  projectNotes = [],
  projects = [],
  onSelectNote,
  onSelectProject,
  onGoToDashboard,
  onOpenAi,
}) {
  const [mode, setMode] = useState('nav'); // 'nav' | 'format'
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState('notes'); // 'notes' | 'projects'

  // Current project details
  const activeProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  );
  const projectColor = activeProject?.color || '#386c5f';

  // Find previous and next note in the active project
  const { prevNote, nextNote, currentIndex, totalNotes } = useMemo(() => {
    if (!Array.isArray(projectNotes) || projectNotes.length === 0) {
      return { prevNote: null, nextNote: null, currentIndex: -1, totalNotes: 0 };
    }
    const idx = projectNotes.findIndex((n) => n.id === currentNoteId);
    return {
      prevNote: idx > 0 ? projectNotes[idx - 1] : null,
      nextNote: idx >= 0 && idx < projectNotes.length - 1 ? projectNotes[idx + 1] : null,
      currentIndex: idx,
      totalNotes: projectNotes.length,
    };
  }, [projectNotes, currentNoteId]);

  // Switch to format mode automatically when editor receives focus
  useEffect(() => {
    if (!editor) return;
    const handleFocus = () => setMode('format');
    editor.on('focus', handleFocus);
    return () => {
      editor.off('focus', handleFocus);
    };
  }, [editor]);

  const btnStyle = (isActive) => ({
    p: 0.8,
    borderRadius: 2,
    minWidth: 36,
    height: 36,
    color: isActive ? 'primary.main' : 'text.secondary',
    bgcolor: isActive ? 'action.selected' : 'transparent',
    transition: 'all 0.15s ease',
    '&:active': { transform: 'scale(0.92)' },
  });

  return (
    <>
      <Box
        component="nav"
        aria-label="Navegación y formato móvil de nota"
        sx={{
          position: 'fixed',
          bottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
          left: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 16 },
          maxWidth: 600,
          mx: 'auto',
          zIndex: 1200,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          borderRadius: 4,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(18, 18, 40, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(215, 222, 232, 0.85)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 16px 40px rgba(0, 0, 0, 0.6)'
              : '0 12px 36px rgba(56, 108, 95, 0.18)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'nav' ? (
            /* ── MODO NAVEGACIÓN (Default / Lectura) ────────────────────────── */
            <motion.div
              key="mode-nav"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 4,
              }}
            >
              {/* Botón 1: Dashboard / Proyectos */}
              <Tooltip title="Ir a Proyectos">
                <IconButton
                  size="small"
                  onClick={onGoToDashboard}
                  sx={{
                    color: 'text.secondary',
                    p: 0.9,
                    borderRadius: 2.5,
                    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <DashboardIcon sx={{ fontSize: 21 }} />
                </IconButton>
              </Tooltip>

              {/* Botón 2: Nota Anterior */}
              <Tooltip title={prevNote ? `Nota anterior: ${prevNote.title || 'Sin título'}` : 'Primera nota'}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!prevNote}
                    onClick={() => prevNote && onSelectNote(prevNote.id)}
                    sx={{
                      color: 'text.secondary',
                      p: 0.8,
                      borderRadius: 2,
                      opacity: prevNote ? 1 : 0.3,
                      '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <PrevIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Botón 3 Central: Selector Rápido de Notas & Proyectos (Bottom Sheet trigger) */}
              <Box
                component="button"
                onClick={() => setSheetOpen(true)}
                sx={{
                  background: 'none',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(56, 108, 95, 0.25)',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(56, 108, 95, 0.06)',
                  borderRadius: 3,
                  px: 1.2,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.6,
                  cursor: 'pointer',
                  maxWidth: 160,
                  transition: 'all 0.2s ease',
                  '&:active': { transform: 'scale(0.96)' },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: projectColor,
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${projectColor}`,
                  }}
                />
                <Typography
                  variant="caption"
                  noWrap
                  fontWeight={700}
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.primary',
                    lineHeight: 1.2,
                  }}
                >
                  {activeProject?.name || 'Proyecto'}
                </Typography>
                <ArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
              </Box>

              {/* Botón 4: Nota Siguiente */}
              <Tooltip title={nextNote ? `Nota siguiente: ${nextNote.title || 'Sin título'}` : 'Última nota'}>
                <span>
                  <IconButton
                    size="small"
                    disabled={!nextNote}
                    onClick={() => nextNote && onSelectNote(nextNote.id)}
                    sx={{
                      color: 'text.secondary',
                      p: 0.8,
                      borderRadius: 2,
                      opacity: nextNote ? 1 : 0.3,
                      '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <NextIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Botón 5: Pasar a Modo Formato */}
              <Tooltip title="Herramientas de formato">
                <IconButton
                  size="small"
                  onClick={() => setMode('format')}
                  sx={{
                    color: 'primary.main',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.2)' : 'rgba(56, 108, 95, 0.1)',
                    p: 0.85,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    transition: 'all 0.2s ease',
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  <FormatIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {/* Botón 6: CleoBot */}
              <Tooltip title="CleoBot Asistente IA">
                <IconButton
                  size="small"
                  onClick={onOpenAi}
                  sx={{
                    color: '#10b981',
                    p: 0.85,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    transition: 'all 0.2s ease',
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  <BotIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </motion.div>
          ) : (
            /* ── MODO FORMATO (Cuando se edita) ─────────────────────────────── */
            <motion.div
              key="mode-format"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: 4,
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {/* Botón para regresar al Modo Navegación */}
              <Tooltip title="Volver a la barra de navegación">
                <IconButton
                  size="small"
                  onClick={() => setMode('nav')}
                  sx={{
                    color: '#fff',
                    bgcolor: 'primary.main',
                    minWidth: 34,
                    height: 34,
                    borderRadius: 2,
                    p: 0.6,
                    mr: 0.5,
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <NavIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.2, my: 0.6 }} />

              {/* Formato de texto TipTap */}
              <Tooltip title="Negrita">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  sx={btnStyle(editor?.isActive('bold'))}
                >
                  <BoldIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Cursiva">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  sx={btnStyle(editor?.isActive('italic'))}
                >
                  <ItalicIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Tachado">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  sx={btnStyle(editor?.isActive('strike'))}
                >
                  <StrikeIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Lista de Tareas">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  sx={btnStyle(editor?.isActive('taskList'))}
                >
                  <ChecklistIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Lista con Viñetas">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  sx={btnStyle(editor?.isActive('bulletList'))}
                >
                  <BulletListIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Lista Numerada">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  sx={btnStyle(editor?.isActive('orderedList'))}
                >
                  <NumberedListIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Título H1">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  sx={btnStyle(editor?.isActive('heading', { level: 1 }))}
                >
                  <TitleIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Cita">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  sx={btnStyle(editor?.isActive('blockquote'))}
                >
                  <QuoteIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Bloque de Código">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  sx={btnStyle(editor?.isActive('codeBlock'))}
                >
                  <CodeIcon sx={{ fontSize: 19 }} />
                </IconButton>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ mx: 0.2, my: 0.6 }} />

              <Tooltip title="Deshacer">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  sx={btnStyle(false)}
                >
                  <UndoIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Rehacer">
                <IconButton
                  size="small"
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  sx={btnStyle(false)}
                >
                  <RedoIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* ── QUICK SWITCHER BOTTOM SHEET (Opción 2) ─────────────────────────── */}
      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '75vh',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(20, 20, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            pb: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          },
        }}
      >
        {/* Grab Handle */}
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
            mx: 'auto',
            mb: 2,
          }}
        />

        {/* Header & Tabs */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            value={sheetTab}
            exclusive
            onChange={(_, val) => val && setSheetTab(val)}
            sx={{
              bgcolor: 'action.hover',
              p: 0.3,
              borderRadius: 2.5,
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                px: 1.5,
                py: 0.4,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                border: 'none',
              },
            }}
          >
            <ToggleButton value="notes">
              Notas ({totalNotes})
            </ToggleButton>
            <ToggleButton value="projects">
              Proyectos ({projects.length})
            </ToggleButton>
          </ToggleButtonGroup>

          <IconButton size="small" onClick={() => setSheetOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Content List */}
        <Box sx={{ overflowY: 'auto', maxHeight: '50vh', pr: 0.5 }}>
          {sheetTab === 'notes' ? (
            /* Lista de Notas del Proyecto Actual */
            <List dense disablePadding>
              {projectNotes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No hay más notas en este proyecto.
                </Typography>
              ) : (
                projectNotes.map((n, idx) => {
                  const isActive = n.id === currentNoteId;
                  return (
                    <ListItemButton
                      key={n.id}
                      onClick={() => {
                        onSelectNote(n.id);
                        setSheetOpen(false);
                      }}
                      sx={{
                        borderRadius: 2.5,
                        mb: 0.6,
                        py: 1,
                        bgcolor: isActive ? 'action.selected' : 'transparent',
                        border: '1px solid',
                        borderColor: isActive ? 'primary.main' : 'transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>
                          {n.icon || '📝'}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={n.title || 'Sin título'}
                        secondary={formatRelativeTime(n.updatedAt || n.createdAt)}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.88rem',
                          noWrap: true,
                          color: isActive ? 'primary.main' : 'text.primary',
                        }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                      {isActive && (
                        <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ fontSize: '0.7rem', ml: 1 }}>
                          Actual
                        </Typography>
                      )}
                    </ListItemButton>
                  );
                })
              )}
            </List>
          ) : (
            /* Lista de Todos los Proyectos */
            <List dense disablePadding>
              {projects.map((p) => {
                const isActive = p.id === currentProjectId;
                return (
                  <ListItemButton
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setSheetOpen(false);
                    }}
                    sx={{
                      borderRadius: 2.5,
                      mb: 0.6,
                      py: 1,
                      bgcolor: isActive ? `${p.color || '#386c5f'}15` : 'transparent',
                      border: '1px solid',
                      borderColor: isActive ? (p.color || 'primary.main') : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 2,
                          bgcolor: `${p.color || '#386c5f'}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}
                      >
                        {getProjectIcon(p.icon)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={p.name}
                      secondary={p.description || 'Sin descripción'}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '0.88rem',
                        noWrap: true,
                        color: isActive ? (p.color || 'primary.main') : 'text.primary',
                      }}
                      secondaryTypographyProps={{ fontSize: '0.7rem', noWrap: true }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Quick Action: Ir al Dashboard Principal */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ListItemButton
            onClick={() => {
              onGoToDashboard();
              setSheetOpen(false);
            }}
            sx={{
              borderRadius: 3,
              justifyContent: 'center',
              py: 0.8,
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <DashboardIcon sx={{ fontSize: 18, mr: 1, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={700} color="primary.main">
              Ir a la Pantalla Principal (Dashboard)
            </Typography>
          </ListItemButton>
        </Box>
      </Drawer>
    </>
  );
}
