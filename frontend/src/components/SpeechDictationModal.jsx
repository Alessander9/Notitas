import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ContentPaste as InsertIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as ClearIcon,
  VolumeUp as VolumeIcon,
  SettingsVoice as VoiceIcon,
  Translate as LangIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { toast } from '../store/toastStore';

const SUPPORTED_LANGUAGES = [
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'es-PE', label: 'Español (Perú)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'es-AR', label: 'Español (Argentina)' },
  { code: 'es-US', label: 'Español (EE.UU.)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr-FR', label: 'Français (France)' },
];

// Parser inteligente de comandos de puntuación por voz
function parseVoicePunctuation(text, lang = 'es') {
  if (!text) return '';
  let res = text;

  if (lang.startsWith('es')) {
    res = res
      .replace(/\s+punto y aparte\s*/gi, '.\n\n')
      .replace(/\s+punto y seguido\s*/gi, '. ')
      .replace(/\s+nueva línea\s*/gi, '\n')
      .replace(/\s+nuevo párrafo\s*/gi, '\n\n')
      .replace(/\s+punto\s*/gi, '. ')
      .replace(/\s+coma\s*/gi, ', ')
      .replace(/\s+dos puntos\s*/gi, ': ')
      .replace(/\s+punto y coma\s*/gi, '; ')
      .replace(/\s+cerrar interrogación\s*/gi, '? ')
      .replace(/\s+abrir interrogación\s*/gi, ' ¿')
      .replace(/\s+cerrar exclamación\s*/gi, '! ')
      .replace(/\s+abrir exclamación\s*/gi, ' ¡')
      .replace(/\s+abrir paréntesis\s*/gi, ' (')
      .replace(/\s+cerrar paréntesis\s*/gi, ') ')
      .replace(/\s+comillas\s*/gi, '"');
  } else if (lang.startsWith('en')) {
    res = res
      .replace(/\s+new line\s*/gi, '\n')
      .replace(/\s+new paragraph\s*/gi, '\n\n')
      .replace(/\s+period\s*/gi, '. ')
      .replace(/\s+dot\s*/gi, '. ')
      .replace(/\s+comma\s*/gi, ', ')
      .replace(/\s+colon\s*/gi, ': ')
      .replace(/\s+semicolon\s*/gi, '; ')
      .replace(/\s+question mark\s*/gi, '? ')
      .replace(/\s+exclamation mark\s*/gi, '! ')
      .replace(/\s+open parenthesis\s*/gi, ' (')
      .replace(/\s+close parenthesis\s*/gi, ') ')
      .replace(/\s+quotes?\s*/gi, '"');
  }

  // Capitalizar después de punto o salto de línea
  res = res.replace(/(?:^|[.\n]\s+)([a-zñáéíóú])/g, (_, p1) => p1.toUpperCase());
  return res;
}

export default function SpeechDictationModal({ open, onClose, onInsertText }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [language, setLanguage] = useState('es-PE');
  const [isSupported, setIsSupported] = useState(true);
  const [autoPunctuation, setAutoPunctuation] = useState(true);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const transcriptBoxRef = useRef(null);

  // Auto-scroll al final del texto al dictar
  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const handleResult = useCallback(
    (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const piece = item[0]?.transcript || '';
        if (item.isFinal) {
          currentFinal += piece + ' ';
        } else {
          currentInterim += piece;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => {
          const combined = prev + currentFinal;
          return autoPunctuation ? parseVoicePunctuation(combined, language) : combined;
        });
      }
      setInterimTranscript(currentInterim);
    },
    [autoPunctuation, language]
  );

  const stopDictation = useCallback(() => {
    isManuallyStoppedRef.current = true;
    setIsListening(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  const startDictation = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      toast.error('Tu navegador no soporta reconocimiento de voz nativo (Web Speech API)');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        isManuallyStoppedRef.current = false;
      };

      recognition.onresult = handleResult;

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Permiso de micrófono denegado');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Silencio detectado, no hacer nada
        }
      };

      recognition.onend = () => {
        // Si no se detuvo manualmente, reiniciar para mantener dictado continuo
        if (!isManuallyStoppedRef.current && isListening) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  }, [language, handleResult, isListening]);

  // Manejar apertura y cierre del modal
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    if (open) {
      isManuallyStoppedRef.current = false;
      // Iniciar automáticamente al abrir para máxima agilidad
      startDictation();
    } else {
      stopDictation();
      setTranscript('');
      setInterimTranscript('');
    }

    return () => {
      stopDictation();
    };
  }, [open, startDictation, stopDictation]);

  // Al cambiar idioma mientras escucha, reiniciar con el nuevo idioma
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (isListening) {
      stopDictation();
      setTimeout(() => {
        isManuallyStoppedRef.current = false;
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = newLang;
          rec.onstart = () => setIsListening(true);
          rec.onresult = handleResult;
          rec.onend = () => {
            if (!isManuallyStoppedRef.current && isListening) {
              try {
                rec.start();
              } catch {}
            }
          };
          recognitionRef.current = rec;
          rec.start();
        }
      }, 150);
    }
  };

  const handleInsert = () => {
    const textToInsert = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
    if (!textToInsert) {
      toast.warning('No hay texto dictado para insertar');
      return;
    }
    stopDictation();
    onInsertText(textToInsert);
    toast.success('Texto dictado insertado en la nota');
    onClose();
  };

  const handleCopy = () => {
    const textToCopy = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopDictation();
        onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0.5,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: isListening ? '#e11d48' : '#386c5f',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening
                ? '0 0 20px rgba(225, 29, 72, 0.4)'
                : '0 4px 12px rgba(56, 108, 95, 0.3)',
              transition: 'all 0.3s ease',
            }}
          >
            <VoiceIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Dictado por Voz en Vivo
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Habla con naturalidad y transfórmalo en texto al instante
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={() => {
            stopDictation();
            onClose();
          }}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
        {!isSupported && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            El reconocimiento de voz nativo requiere Google Chrome, Microsoft Edge, Safari o navegadores compatibles.
          </Alert>
        )}

        {/* Barra superior de configuración */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="speech-lang-label">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LangIcon sx={{ fontSize: 16 }} /> Idioma
              </Box>
            </InputLabel>
            <Select
              labelId="speech-lang-label"
              value={language}
              label="Idioma"
              onChange={handleLanguageChange}
              sx={{ borderRadius: 2 }}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {l.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Convierte automáticamente palabras como 'punto', 'coma' o 'nueva línea' en signos de puntuación">
              <Chip
                label="Puntuación inteligente"
                size="small"
                onClick={() => setAutoPunctuation(!autoPunctuation)}
                color={autoPunctuation ? 'primary' : 'default'}
                variant={autoPunctuation ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Área de transcripción en tiempo real */}
        <Paper
          ref={transcriptBoxRef}
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
            border: '1px solid',
            borderColor: isListening ? 'primary.main' : 'divider',
            minHeight: 180,
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            position: 'relative',
            transition: 'border-color 0.2s ease',
          }}
        >
          {transcript || interimTranscript ? (
            <Typography
              variant="body1"
              sx={{
                lineHeight: 1.7,
                fontSize: '1.05rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <span>{transcript}</span>
              {interimTranscript && (
                <span
                  style={{
                    opacity: 0.65,
                    fontStyle: 'italic',
                    color: '#386c5f',
                  }}
                >
                  {interimTranscript}
                </span>
              )}
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                my: 'auto',
                py: 3,
                textAlign: 'center',
              }}
            >
              <VolumeIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {isListening
                  ? 'Escuchando... comienza a hablar'
                  : 'Presiona el micrófono para iniciar el dictado'}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                Puedes decir "punto", "coma", "dos puntos", "nueva línea" o "signo de interrogación"
              </Typography>
            </Box>
          )}

          {/* Indicador pulsante de escucha */}
          {isListening && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1,
                py: 0.4,
                borderRadius: 1.5,
                bgcolor: 'rgba(225, 29, 72, 0.1)',
                border: '1px solid rgba(225, 29, 72, 0.3)',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#e11d48',
                  animation: 'pulse 1.2s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.8)', opacity: 0.6 },
                    '50%': { transform: 'scale(1.3)', opacity: 1 },
                    '100%': { transform: 'scale(0.8)', opacity: 0.6 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#e11d48', fontWeight: 700, fontSize: '0.72rem' }}>
                EN VIVO
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Controles de dictado (Micrófono central y acciones) */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copiar texto">
              <span>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  disabled={!transcript && !interimTranscript}
                  color={copied ? 'success' : 'default'}
                >
                  {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Limpiar texto">
              <span>
                <IconButton
                  size="small"
                  onClick={handleClear}
                  disabled={!transcript && !interimTranscript}
                  color="error"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Botón principal de Micrófono */}
          <Button
            variant="contained"
            onClick={isListening ? stopDictation : startDictation}
            startIcon={isListening ? <MicOffIcon /> : <MicIcon />}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              fontWeight: 700,
              bgcolor: isListening ? '#e11d48' : '#386c5f',
              '&:hover': { bgcolor: isListening ? '#be123c' : '#2d574c' },
              boxShadow: isListening
                ? '0 0 20px rgba(225, 29, 72, 0.4)'
                : '0 4px 14px rgba(56, 108, 95, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {isListening ? 'Detener Micrófono' : 'Comenzar a Dictar'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={() => {
            stopDictation();
            onClose();
          }}
          sx={{ borderRadius: 2, color: 'text.secondary' }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<InsertIcon />}
          onClick={handleInsert}
          disabled={!transcript && !interimTranscript}
          sx={{
            borderRadius: 2.5,
            px: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
          }}
        >
          Insertar en la Nota
        </Button>
      </DialogActions>
    </Dialog>
  );
}
