import React from 'react';
import { Box, Tooltip, Zoom } from '@mui/material';
import { AutoAwesome as SparklesIcon, SmartToy as BotIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

export default function AiFloatingButton() {
  const { user } = useAuthStore();
  const { aiDrawerOpen, toggleAiDrawer } = useUiStore();

  // Solo mostrar para usuarios autenticados
  if (!user) return null;

  return (
    <Zoom in={!aiDrawerOpen} unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 28 },
          right: { xs: 20, sm: 28 },
          zIndex: 1250,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip
          title="Notitas AI — Asistente Inteligente (Ctrl+J)"
          placement="left"
          arrow
        >
          <motion.div
            whileHover={{ scale: 1.1, y: -3 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Box
              component="button"
              onClick={toggleAiDrawer}
              aria-label="Abrir asistente de IA Notitas"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: { xs: 2, sm: 2.2 },
                py: { xs: 1.25, sm: 1.4 },
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #10b981 0%, #386c5f 50%, #1e3a34 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: { xs: '0.85rem', sm: '0.92rem' },
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45), 0 2px 10px rgba(0,0,0,0.2)',
                outline: 'none',
                transition: 'box-shadow 0.25s ease, background 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 12px 32px rgba(16, 185, 129, 0.65), 0 4px 14px rgba(0,0,0,0.3)',
                  background: 'linear-gradient(135deg, #34d399 0%, #386c5f 50%, #132a24 100%)',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
                  opacity: 0.6,
                  pointerEvents: 'none',
                },
              }}
            >
              {/* Icono Bot con destello */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BotIcon sx={{ fontSize: { xs: 22, sm: 24 }, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                <SparklesIcon
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    fontSize: 12,
                    color: '#fef08a',
                    animation: 'spin-slow 4s linear infinite',
                    '@keyframes spin-slow': {
                      '0%': { transform: 'rotate(0deg) scale(0.9)' },
                      '50%': { transform: 'rotate(180deg) scale(1.2)' },
                      '100%': { transform: 'rotate(360deg) scale(0.9)' },
                    },
                  }}
                />
              </Box>

              {/* Texto Flotante Notitas AI */}
              <Box
                component="span"
                sx={{
                  letterSpacing: '0.02em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  display: { xs: 'none', sm: 'inline-block' },
                }}
              >
                Notitas AI
              </Box>
            </Box>
          </motion.div>
        </Tooltip>
      </Box>
    </Zoom>
  );
}
