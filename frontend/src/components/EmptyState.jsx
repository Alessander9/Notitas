import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';

// Elementos decorativos flotantes
function FloatingElement({ delay, x, y, size, color, shape = 'circle' }) {
  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
        rotate: [0, 5, -5, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? '30%' : '40%',
        background: `linear-gradient(135deg, ${color}40 0%, ${color}15 100%)`,
        border: `1px solid ${color}20`,
        backdropFilter: 'blur(4px)',
      }}
    />
  );
}

/**
 * Estado vacío ilustrado mejorado: blob orgánico con gradiente,
 * elementos decorativos flotantes, icono animado, título,
 * descripción y CTA opcional con mejor feedback visual.
 */
export default function EmptyState({ icon, title, description, actionLabel, onAction, color = '#386c5f' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        py: 8,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Elementos decorativos de fondo */}
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <FloatingElement delay={0} x="10%" y="20%" size={40} color={color} shape="circle" />
        <FloatingElement delay={0.5} x="85%" y="15%" size={28} color={color} shape="square" />
        <FloatingElement delay={1} x="15%" y="75%" size={32} color={color} shape="diamond" />
        <FloatingElement delay={1.5} x="80%" y="70%" size={24} color={color} shape="circle" />
        <FloatingElement delay={2} x="50%" y="85%" size={36} color={color} shape="square" />
      </Box>

      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        <Box sx={{ position: 'relative', width: 140, height: 140, mb: 3 }}>
          {/* Blob principal */}
          <motion.div
            animate={{
              borderRadius: [
                '44% 56% 63% 37% / 55% 42% 58% 45%',
                '56% 44% 37% 63% / 42% 55% 45% 58%',
                '44% 56% 63% 37% / 55% 42% 58% 45%',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 50%, ${color}66 100%)`,
              boxShadow: `0 20px 50px ${color}40, inset 0 -4px 12px ${color}30`,
            }}
          />
          {/* Icono central */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Box sx={{ fontSize: 56, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))' }}>
              {icon}
            </Box>
          </motion.div>
          {/* Anillo exterior sutil */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              border: `2px solid ${color}25`,
              pointerEvents: 'none',
            }}
          />
        </Box>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Typography
          variant="h5"
          fontWeight={800}
          gutterBottom
          sx={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title}
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 380,
            lineHeight: 1.7,
            mb: actionLabel ? 3 : 0,
          }}
        >
          {description}
        </Typography>
      </motion.div>

      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="contained"
            onClick={onAction}
            sx={{
              mt: 1,
              borderRadius: 3,
              px: 4,
              py: 1.3,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
              boxShadow: `0 8px 24px ${color}40`,
              transition: 'all 0.25s ease',
              '&:hover': {
                boxShadow: `0 12px 32px ${color}55`,
                background: `linear-gradient(135deg, ${color} 0%, ${color} 100%)`,
              },
            }}
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </Box>
  );
}
