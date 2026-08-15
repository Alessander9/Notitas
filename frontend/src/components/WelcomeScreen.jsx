import React, { useEffect, useRef, useState } from 'react';
import { Box, Avatar, Button } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';
import { getAvatarUrl } from '../utils/text';

const PARTICLE_COLORS = ['#386c5f', '#6a968c', '#264e44', '#845EC2', '#00C9A7'];

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  x: `${(i * 37 + 7) % 100}%`,
  y: `${(i * 53 + 11) % 100}%`,
  s: 6 + ((i * 7) % 10),
  r: i % 3 === 0 ? '50%' : '3px',
  c: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  d: 2.4 + (i % 5) * 0.6,
  delay: (i % 6) * 0.4,
}));

const EXIT_DURATION = 450;

export default function WelcomeScreen({ variant = 'login', user, onFinish }) {
  const { darkMode } = useUiStore();
  const isLogout = variant === 'logout';
  const firstName = (user?.name || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';

  const [exiting, setExiting] = useState(false);
  const onFinishRef = useRef(onFinish);
  const calledRef = useRef(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const doFinish = () => {
    if (calledRef.current) return;
    calledRef.current = true;
    setExiting(true);
    setTimeout(() => onFinishRef.current?.(), EXIT_DURATION);
  };

  useEffect(() => {
    const t = setTimeout(doFinish, 3400);
    return () => clearTimeout(t);
  }, []);

  const avatarUrl = getAvatarUrl(user?.avatar);
  const greetingColor = darkMode ? '#e8e8f0' : '#1a2332';
  const subColor = darkMode ? '#a0a0c0' : '#5a6a7e';

  return (
    <motion.div
      onClick={doFinish}
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}
    >
      <Box
        sx={{
          position: 'absolute', inset: 0,
          background: isLogout
            ? 'radial-gradient(ellipse at 50% 40%, #1a0a2e 0%, #0a0a1a 55%, #050510 100%)'
            : 'radial-gradient(ellipse at 50% 40%, #0d2b22 0%, #0a1a2e 55%, #050510 100%)',
        }}
      />

      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.25, 0.95, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '45vw', height: '45vw', maxWidth: 520, maxHeight: 520, borderRadius: '50%', top: '18%', left: '10%',
          background: isLogout
            ? 'radial-gradient(circle, rgba(132,94,194,0.18) 0%, rgba(132,94,194,0.04) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(56,108,95,0.18) 0%, rgba(56,108,95,0.04) 60%, transparent 80%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 20, 0], y: [0, 20, -30, 0], scale: [1, 0.9, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '55vw', height: '55vw', maxWidth: 640, maxHeight: 640, borderRadius: '50%', bottom: '10%', right: '5%',
          background: isLogout
            ? 'radial-gradient(circle, rgba(100,60,180,0.13) 0%, rgba(80,40,160,0.03) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(0,201,167,0.13) 0%, rgba(56,108,95,0.03) 60%, transparent 80%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }}
      />

      <motion.span
        animate={{ opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 3.8, times: [0, 0.18, 0.75, 1], ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.3], y: [0, -18, -36] }}
            transition={{ duration: p.d, delay: p.delay, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
            style={{
              position: 'absolute', left: p.x, top: p.y,
              width: p.s, height: p.s, borderRadius: p.r,
              background: p.c, opacity: 0, filter: 'blur(1px)',
            }}
          />
        ))}
      </motion.span>

      <Box sx={{ position: 'relative', textAlign: 'center', maxWidth: 420, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: exiting ? 0.8 : 1, opacity: exiting ? 0 : 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <Avatar
            src={avatarUrl || undefined}
            sx={{
              width: 84, height: 84, mx: 'auto', mb: 0.5, fontSize: 36, fontWeight: 900,
              background: isLogout
                ? 'linear-gradient(135deg, #845EC2 0%, #6a4aa3 50%, #4a2d80 100%)'
                : 'linear-gradient(135deg, #386c5f 0%, #00C9A7 50%, #264e44 100%)',
              color: '#ffffff',
              boxShadow: isLogout
                ? '0 8px 32px rgba(132,94,194,0.35), 0 0 60px rgba(132,94,194,0.15)'
                : '0 8px 32px rgba(56,108,95,0.35), 0 0 60px rgba(0,201,167,0.15)',
            }}
          >
            {firstName.charAt(0).toUpperCase()}
          </Avatar>
        </motion.div>

        <motion.h1
          initial={{ y: 22, opacity: 0 }}
 animate={{ y: exiting ? -12 : 0, opacity: exiting ? 0 : 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
          style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.04em', color: greetingColor, lineHeight: 1.15, margin: 0 }}
        >
          {isLogout ? `Hasta pronto, ${firstName}` : `Bienvenido, ${firstName}`}
        </motion.h1>

        <motion.p
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: exiting ? -10 : 0, opacity: exiting ? 0 : 1 }}
          transition={{ duration: 0.55, delay: 0.3, ease: 'easeOut' }}
          style={{ fontSize: '1.05rem', fontWeight: 500, color: subColor, margin: 0, maxWidth: 320 }}
        >
          {isLogout
            ? 'Tu sesión se ha cerrado correctamente. ¡Vuelve pronto!'
            : 'Prepárate para organizar tus ideas y proyectos.'}
        </motion.p>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: exiting ? 0 : 1 }} transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }} style={{ height: 2, borderRadius: 2, background: isLogout ? 'rgba(132,94,194,0.4)' : 'rgba(56,108,95,0.4)', width: '100%', maxWidth: 220, marginTop: 4 }} />

        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: exiting ? -10 : 0, opacity: exiting ? 0 : 1 }} transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }} style={{ marginTop: 4 }}>
          <Button
            onClick={doFinish}
            variant="contained"
 disableElevation
            endIcon={<ArrowForwardIcon />}
            sx={{
              borderRadius: 14, px: 4, py: 1.4, fontSize: '1rem', fontWeight: 800, textTransform: 'none', letterSpacing: 0.2,
              background: isLogout
                ? 'linear-gradient(135deg, #845EC2 0%, #6a4aa3 100%)'
                : 'linear-gradient(135deg, #386c5f 0%, #00C9A7 100%)',
              boxShadow: isLogout
                ? '0 6px 24px rgba(132,94,194,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                : '0 6px 24px rgba(56,108,95,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
              '&:hover': {
                background: isLogout
                  ? 'linear-gradient(135deg, #9a7ad6 0%, #7c5ab5 100%)'
                  : 'linear-gradient(135deg, #4a8a7a 0%, #00D4B0 100%)',
              },
            }}
          >
            {isLogout ? 'Finalizar sesión' : 'Continuar'}
          </Button>
        </motion.div>
      </Box>
    </motion.div>
  );
}
