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
  DriveFileMove as ConvertIcon,
  DeleteOutline as ClearIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { toast } from '../store/toastStore';
import QuickNoteModal from './QuickNoteModal';
import { useUiStore } from '../store/uiStore';

const STORAGE_KEY = 'notitas-scratchpad-content';

export default function Scratchpad() {
  const { currentProjectId, scratchpadOpen, setScratchpadOpen, toggleScratchpad } = useUiStore();
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
        toggleScratchpad();
      }
    };
    const handleCustomEvent = () => toggleScratchpad();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('notitas:scratchpad', handleCustomEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('notitas:scratchpad', handleCustomEvent);
    };
  }, [toggleScratchpad]);

  // Autofocus al abrir el bloc
  useEffect(() => {
    if (scratchpadOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 120);
    }
  }, [scratchpadOpen]);

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
      {/* Panel Desplegable del Scratchpad flotante superior */}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 62, sm: 70 },
          right: { xs: 12, sm: 20 },
          zIndex: 1300,
          pointerEvents: scratchpadOpen ? 'auto' : 'none',
        }}
      >
        <Collapse in={scratchpadOpen} timeout={250} unmountOnExit>
          <Paper
            elevation={16}
            sx={{
              width: { xs: 'calc(100vw - 24px)', sm: 350 },
              maxHeight: { xs: 'calc(100vh - 80px)', sm: 480 },
              borderRadius: 3.5,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(26, 32, 44, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(16px)',
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
                <Tooltip title="Cerrar (Alt+S)">
                  <IconButton
                    size="small"
                    onClick={() => setScratchpadOpen(false)}
                    aria-label="Cerrar bloc rápido"
                    sx={{ p: 0.5 }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
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
