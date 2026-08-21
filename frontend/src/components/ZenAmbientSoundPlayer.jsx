import React, { useState } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Slider,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  Headphones as AmbientIcon,
  VolumeUp as VolumeIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { ambientSynthesizer } from '../utils/ambientAudioSynthesizer';
import { toast } from '../store/toastStore';

const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Lluvia', icon: '🌧️', action: () => ambientSynthesizer.playRain() },
  { id: 'waves', name: 'Olas', icon: '🌊', action: () => ambientSynthesizer.playWaves() },
  { id: 'cafe', name: 'Café', icon: '☕', action: () => ambientSynthesizer.playCafe() },
  { id: 'forest', name: 'Bosque', icon: '🌲', action: () => ambientSynthesizer.playForest() },
  { id: 'whitenoise', name: 'Ruido Blanco', icon: '🧘', action: () => ambientSynthesizer.playWhiteNoise() },
];

export default function ZenAmbientSoundPlayer({ anchorEl, open, onClose }) {
  const [activeSound, setActiveSound] = useState(null);
  const [volume, setVolume] = useState(50);
  const [timerMinutes, setTimerMinutes] = useState(null);

  const handleSelectSound = (sound) => {
    if (activeSound === sound.id) {
      ambientSynthesizer.stop();
      setActiveSound(null);
    } else {
      sound.action();
      setActiveSound(sound.id);
      if (timerMinutes) {
        ambientSynthesizer.setSleepTimer(timerMinutes, () => setActiveSound(null));
      }
    }
  };

  const handleVolumeChange = (_, newValue) => {
    setVolume(newValue);
    ambientSynthesizer.setVolume(newValue / 100);
  };

  const handleSetTimer = (min) => {
    if (timerMinutes === min) {
      setTimerMinutes(null);
      ambientSynthesizer.setSleepTimer(null);
      toast.info('Temporizador desactivado');
    } else {
      setTimerMinutes(min);
      if (activeSound) {
        ambientSynthesizer.setSleepTimer(min, () => {
          setActiveSound(null);
          setTimerMinutes(null);
          toast.info('Temporizador de foco finalizado');
        });
      }
      toast.success(`Sonido activo durante ${min} minutos`);
    }
  };

  const handleStop = () => {
    ambientSynthesizer.stop();
    setActiveSound(null);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      PaperProps={{
        sx: {
          p: 2,
          width: 320,
          borderRadius: 3.5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          backgroundImage: 'none',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AmbientIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={800}>
            Sonidos de Concentración
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Grid de ambientes */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
        {AMBIENT_SOUNDS.map((s) => {
          const isSelected = activeSound === s.id;
          return (
            <Button
              key={s.id}
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={() => handleSelectSound(s)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.4,
                py: 1,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.main' : 'background.paper',
                boxShadow: isSelected ? '0 4px 12px rgba(56,108,95,0.3)' : 'none',
                '&:hover': {
                  bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{s.icon}</Typography>
              {s.name}
            </Button>
          );
        })}

        {/* Botón de apagar / stop */}
        <Button
          variant="outlined"
          color="error"
          onClick={handleStop}
          disabled={!activeSound}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.4,
            py: 1,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.78rem',
          }}
        >
          <StopIcon sx={{ fontSize: 20 }} />
          Detener
        </Button>
      </Box>

      {/* Control de volumen */}
      <Box sx={{ mb: 1.5, px: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Volumen ({volume}%)
          </Typography>
          <VolumeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        </Box>
        <Slider
          size="small"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volumen de sonido ambiental"
          sx={{ color: 'primary.main' }}
        />
      </Box>

      {/* Temporizador de apagado */}
      <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8 }}>
          <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Temporizador de Foco:
          </Typography>
        </Box>
        <ButtonGroup size="small" fullWidth variant="outlined">
          {[15, 30, 45, 60].map((min) => (
            <Button
              key={min}
              onClick={() => handleSetTimer(min)}
              variant={timerMinutes === min ? 'contained' : 'outlined'}
              sx={{
                fontSize: '0.72rem',
                fontWeight: timerMinutes === min ? 700 : 500,
                textTransform: 'none',
                py: 0.2,
              }}
            >
              {min}m
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </Popover>
  );
}
