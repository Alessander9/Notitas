import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { keyframes } from '@emotion/react';
import { useUiStore } from '../store/uiStore';
import splashImage from '../assets/pantalla-carga-notitas.png';

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
      {/* Splash Screen Image */}
      <Box
        sx={{
          animation: `${float} 3s ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: { xs: 280, sm: 350, md: 400 },
            height: 'auto',
            animation: `${glow} 2.6s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <img
            src={splashImage}
            alt="Notitas"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 24px rgba(56,108,95,0.3))',
            }}
          />
        </Box>
      </Box>

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
