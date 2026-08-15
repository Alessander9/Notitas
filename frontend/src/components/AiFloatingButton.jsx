import React from 'react';
import { Box, Tooltip, Zoom } from '@mui/material';
import { AutoAwesome as SparklesIcon, SmartToy as BotIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';

export default function AiFloatingButton() {
  const { aiDrawerOpen, toggleAiDrawer } = useUiStore();

  return (
    <Zoom in={!aiDrawerOpen} unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 28 },
          right: { xs: 18, sm: 28 },
          zIndex: 9999, // Muy alto para que nunca quede tapado por nada
          pointerEvents: 'auto',
        }}
      >
        <Tooltip
          title="Notitas AI — Asistente Inteligente (Ctrl+J)"
          placement="left"
          arrow
        >
          <motion.div
            whileHover={{ scale: 1.12, y: -4 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 3.2,
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
                gap: 1.2,
                px: { xs: 1.8, sm: 2.2 },
                py: { xs: 1.1, sm: 1.35 },
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '50px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #10b981 0%, #386c5f 50%, #173830 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: { xs: '0.86rem', sm: '0.94rem' },
                boxShadow: '0 8px 28px rgba(16, 185, 129, 0.55), 0 2px 10px rgba(0,0,0,0.3)',
                outline: 'none',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: '0 12px 36px rgba(16, 185, 129, 0.75), 0 4px 16px rgba(0,0,0,0.4)',
                  background: 'linear-gradient(135deg, #34d399 0%, #386c5f 50%, #0f2b23 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)',
                  opacity: 0.7,
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
                <BotIcon sx={{ fontSize: { xs: 24, sm: 26 }, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                <SparklesIcon
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    fontSize: 13,
                    color: '#fef08a',
                    filter: 'drop-shadow(0 0 4px rgba(254, 240, 138, 0.8))',
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
                  letterSpacing: '0.03em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  display: { xs: 'inline-block', sm: 'inline-block' },
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
