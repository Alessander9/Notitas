import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import logoImage from '../assets/logo notitas.png';

const FEATURES = [
  { icon: '📁', text: 'Organiza proyectos y notas en un solo lugar' },
  { icon: '👥', text: 'Colabora con tu equipo en tiempo real' },
  { icon: '⭐', text: 'Destaca tus notas favoritas' },
  { icon: '🔗', text: 'Comparte notas públicamente con un enlace' },
];

/**
 * Layout de autenticación split-screen: panel de marca con gradiente
 * (solo escritorio) + panel del formulario. En móvil solo se ve el formulario
 * con el logo compacto arriba.
 */
export default function AuthLayout({ children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      {/* Panel de marca (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '46%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #386c5f 0%, #1d3f37 60%, #162b26 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
        }}
      >
        {/* Formas decorativas flotantes */}
        <Box sx={{ position: 'absolute', top: -90, right: -90, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <Box sx={{ position: 'absolute', bottom: -110, left: -70, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', top: '32%', left: -130, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <Box
          sx={{
            position: 'absolute',
            top: '18%',
            right: '14%',
            width: 90,
            height: 90,
            borderRadius: '40% 60% 55% 45% / 45% 40% 60% 55%',
            background: 'rgba(255,255,255,0.08)',
            animation: 'blobFloat 8s ease-in-out infinite',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff' }}
        >
          <Typography variant="h2" fontWeight={800} sx={{ letterSpacing: '-0.02em', textShadow: '0 6px 30px rgba(0,0,0,0.25)' }}>
            Notitas
          </Typography>
          <Typography variant="h6" sx={{ mt: 1, opacity: 0.92, fontWeight: 400 }}>
            Organiza proyectos, notas y recursos en un solo lugar
          </Typography>
        </motion.div>

        <Box sx={{ mt: 5, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 380 }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.text}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: 'easeOut' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 1.25,
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                  '&:hover': { transform: 'translateX(4px)', bgcolor: 'rgba(255,255,255,0.16)' },
                }}
              >
                <Typography sx={{ fontSize: '1.3rem' }}>{f.icon}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {f.text}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Panel del formulario */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Logo compacto solo en móvil */}
          <Box sx={{ textAlign: 'center', mb: 3, display: { xs: 'block', md: 'none' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <img
                src={logoImage}
                alt="Notitas Logo"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(56,108,95,0.3))',
                }}
              />
            </Box>
            <Typography variant="h4" fontWeight={800} color="primary">
              Notitas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Organizador de Proyectos, Notas y Recursos
            </Typography>
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
