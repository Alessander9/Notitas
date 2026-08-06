import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { EditNote as EditNoteIcon } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import { useUiStore } from '../store/uiStore';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(56, 108, 95, 0.35); }
  50% { box-shadow: 0 0 0 28px rgba(56, 108, 95, 0); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export default function LoadingPage({ message = 'Preparando tu espacio de trabajo...', exiting = false }) {
  const { darkMode } = useUiStore();

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: darkMode
          ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a35 45%, #0f0f23 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #e8edf5 45%, #f5f7fa 100%)',
        transition: 'opacity 0.45s ease-in-out',
        opacity: exiting ? 0 : 1,
      }}
    >
      {/* Floating glowing logo */}
      <Box sx={{ animation: `${float} 3s ease-in-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
        <Box
          sx={{
            width: 92,
            height: 92,
            borderRadius: '28%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: darkMode
              ? 'linear-gradient(135deg, #6a968c, #386c5f)'
              : 'linear-gradient(135deg, #386c5f, #264e44)',
            animation: `${glow} 2.6s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <EditNoteIcon sx={{ fontSize: 52, color: '#ffffff' }} />
        </Box>
      </Box>

      {/* Wordmark */}
      <Typography
        variant="h3"
        fontWeight="bold"
        sx={{
          mt: 3.5,
          letterSpacing: '0.5px',
          background: darkMode
            ? 'linear-gradient(90deg, #6a968c, #ffffff, #6a968c)'
            : 'linear-gradient(90deg, #386c5f, #6a968c, #386c5f)',
          backgroundSize: '200% auto',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: `${shimmer} 2.4s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        Notitas
      </Typography>

      {/* Tagline */}
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mt: 0.5, opacity: 0.8, animation: `${fadeInUp} 0.8s ease-out` }}
      >
        Organizador de Proyectos, Notas y Recursos
      </Typography>

      {/* Loading bar */}
      <Box sx={{ width: 220, mt: 4 }}>
        <LinearProgress
          sx={{
            height: 4,
            borderRadius: 4,
            backgroundColor: darkMode ? 'rgba(56,108,95,0.15)' : 'rgba(56,108,95,0.15)',
            '& .MuiLinearProgress-bar': {
              background: darkMode
                ? 'linear-gradient(90deg, #386c5f, #6a968c)'
                : 'linear-gradient(90deg, #386c5f, #6a968c)',
            },
          }}
        />
      </Box>

      {/* Message */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 2, opacity: 0.6, animation: `${fadeInUp} 1s ease-out` }}
      >
        {message}
      </Typography>
    </Box>
  );
}
