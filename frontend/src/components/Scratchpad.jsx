import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Collapse,
} from '@mui/material';
import {
  NoteAlt as ScratchpadIcon,
  CloseFullscreen as MinimizeIcon,
  DriveFileMove as ConvertIcon,
  DeleteOutline as ClearIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { toast } from '../store/toastStore';
import QuickNoteModal from './QuickNoteModal';
import { useUiStore } from '../store/uiStore';

const STORAGE_KEY = 'notitas-scratchpad-content';

export default function Scratchpad() {
  const { currentProjectId } = useUiStore();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [quickConvertOpen, setQuickConvertOpen] = useState(false);
  const textareaRef = useRef(null);

  // Guardar en localStorage con autosave
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, content);
      setSaveIndicator(true);
      const timer = setTimeout(() => setSaveIndicator(false), 1200);
      return () => clearTimeout(timer);
    } catch {}
  }, [content]);

  // Atajo de teclado global Alt+S para alternar el Scratchpad
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus al abrir el bloc
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleClear = () => {
    if (!content.trim()) return;
    setContent('');
    toast.info('Bloc de notas limpiado');
  };

  const handleCopy = () => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content);
    toast.success('Texto copiado al portapapeles');
  };

  const handleConvert = () => {
    if (!content.trim()) {
      toast.error('Escribe algo en el bloc para convertirlo en nota');
      return;
    }
    setQuickConvertOpen(true);
  };

  // Obtener primera línea como título tentativo
  const getDerivedTitle = () => {
    const lines = content.trim().split('\n');
    return lines[0]?.slice(0, 60) || 'Apunte de Bloc Rápido';
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 28 },
          left: { xs: 18, sm: 28 },
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {/* Panel Desplegable del Scratchpad */}
        <Collapse in={open} timeout={250} unmountOnExit>
          <Paper
            elevation={12}
            sx={{
              width: { xs: 'calc(100vw - 36px)', sm: 340 },
              maxHeight: 440,
              mb: 1.5,
              borderRadius: 3.5,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(26, 32, 44, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Cabecera del Scratchpad */}
            <Box
              sx={{
                px: 2,
                py: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: 1.5,
                    bgcolor: 'warning.main',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ScratchpadIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.85rem' }}>
                  Bloc Efímero (Alt+S)
                </Typography>
                {saveIndicator && (
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                    Guardado
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Copiar todo">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleCopy}
                      disabled={!content.trim()}
                      aria-label="Copiar todo"
                      sx={{ p: 0.5 }}
                    >
                      <CopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Limpiar bloc">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleClear}
                      disabled={!content.trim()}
                      aria-label="Limpiar bloc"
                      sx={{ p: 0.5 }}
                      color="error"
                    >
                      <ClearIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Minimizar">
                  <IconButton
                    size="small"
                    onClick={() => setOpen(false)}
                    aria-label="Minimizar"
                    sx={{ p: 0.5 }}
                  >
                    <MinimizeIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Área de texto rápida */}
            <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                inputRef={textareaRef}
                multiline
                rows={7}
                fullWidth
                variant="standard"
                placeholder="Escribe ideas rápidas, números, enlaces temporales... (se guarda automáticamente)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    fontFamily: 'inherit',
                  },
                }}
              />
            </Box>

            {/* Barra de pie con Acción de Conversión */}
            <Box
              sx={{
                p: 1.2,
                px: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {content.length} caracteres
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<ConvertIcon sx={{ fontSize: 15 }} />}
                onClick={handleConvert}
                disabled={!content.trim()}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  py: 0.4,
                  px: 1.5,
                  boxShadow: '0 2px 8px rgba(56, 108, 95, 0.3)',
                }}
              >
                Convertir a Nota
              </Button>
            </Box>
          </Paper>
        </Collapse>

        {/* Botón flotante adhesivo minimizado */}
        {!open && (
          <Tooltip title="Bloc de notas adhesivo (Alt+S)" placement="right" arrow>
            <Paper
              elevation={8}
              onClick={() => setOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: '24px',
                cursor: 'pointer',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.95)' : '#ffffff',
                border: '1.5px solid',
                borderColor: content.trim() ? 'warning.main' : 'divider',
                boxShadow: content.trim()
                  ? '0 6px 20px rgba(245, 158, 11, 0.3)'
                  : '0 4px 16px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.06)',
                  borderColor: 'warning.main',
                },
              }}
            >
              <ScratchpadIcon sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.78rem' }}>
                Bloc Rápido
              </Typography>
              {content.trim() && (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: 'warning.main',
                  }}
                />
              )}
            </Paper>
          </Tooltip>
        )}
      </Box>

      {/* Modal para convertir el contenido del scratchpad en una nota formal */}
      {quickConvertOpen && (
        <QuickNoteModal
          open={quickConvertOpen}
          onClose={() => setQuickConvertOpen(false)}
          defaultProjectId={typeof currentProjectId === 'number' ? currentProjectId : null}
          initialTitle={getDerivedTitle()}
          initialContent={content}
          initialTags={['scratchpad']}
        />
      )}
    </>
  );
}
