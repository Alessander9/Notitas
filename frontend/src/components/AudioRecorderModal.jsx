import React, { useState, useRef, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Check as InsertIcon,
  DeleteOutline as DiscardIcon,
} from '@mui/icons-material';
import { toast } from '../store/toastStore';

export default function AudioRecorderModal({ open, onClose, onInsertAudio }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioElementRef = useRef(null);

  // Limpiar recursos al cerrar
  useEffect(() => {
    if (!open) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        clearInterval(timerRef.current);
      }
      setAudioUrl(null);
      setAudioBlob(null);
      setDuration(0);
      setIsPlaying(false);
      setIsRecording(false);
    }
  }, [open]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al acceder al micrófono', err);
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleInsert = () => {
    if (!audioBlob) return;

    // Crear reproductor HTML con blob URL
    const filename = `audio-${Date.now()}.webm`;
    const audioHtml = `<div class="audio-note-block" style="padding: 10px; background: rgba(56,108,95,0.08); border-radius: 8px; margin: 8px 0; display: flex; align-items: center; gap: 10px;">
      <audio controls src="${audioUrl}" style="height: 36px; max-width: 100%;"></audio>
      <span style="font-size: 12px; color: #666;">🎙️ Nota de voz (${formatDuration(duration)})</span>
    </div><p></p>`;

    onInsertAudio(audioHtml, audioBlob, filename);
    onClose();
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: '#e11d48',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
            }}
          >
            <MicIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Grabadora de Voz
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Graba apuntes de audio e insértalos en tu nota
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
        {/* Temporizador y animación de onda */}
        <Box
          sx={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            bgcolor: isRecording ? 'rgba(225, 29, 72, 0.12)' : 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.3s ease',
          }}
        >
          {isRecording && (
            <CircularProgress
              size={120}
              thickness={2}
              sx={{ color: '#e11d48', position: 'absolute' }}
            />
          )}

          <IconButton
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={Boolean(audioUrl && !isRecording)}
            sx={{
              width: 72,
              height: 72,
              bgcolor: isRecording ? '#e11d48' : '#386c5f',
              color: '#fff',
              '&:hover': { bgcolor: isRecording ? '#be123c' : '#2d574c' },
              boxShadow: isRecording ? '0 0 24px rgba(225, 29, 72, 0.5)' : '0 4px 14px rgba(56, 108, 95, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            {isRecording ? <StopIcon sx={{ fontSize: 32 }} /> : <MicIcon sx={{ fontSize: 32 }} />}
          </IconButton>
        </Box>

        <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
          {formatDuration(duration)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {isRecording ? 'Grabando audio... haz clic para detener' : audioUrl ? 'Grabación finalizada' : 'Haz clic en el micrófono para empezar'}
        </Typography>

        {/* Reproductor de previsualización */}
        {audioUrl && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              width: '100%',
              borderRadius: 2.5,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <audio
              ref={audioElementRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
            <Button
              size="small"
              startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
              onClick={togglePlayback}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {isPlaying ? 'Pausar' : 'Escuchar'}
            </Button>
            <IconButton size="small" onClick={() => { setAudioUrl(null); setAudioBlob(null); setDuration(0); }} color="error">
              <DiscardIcon fontSize="small" />
            </IconButton>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<InsertIcon />}
          onClick={handleInsert}
          disabled={!audioBlob}
          sx={{
            borderRadius: 2.5,
            px: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
          }}
        >
          Insertar Audio
        </Button>
      </DialogActions>
    </Dialog>
  );
}
