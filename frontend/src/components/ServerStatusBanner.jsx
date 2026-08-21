import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Close as CloseIcon,
  WifiTethering as SlowIcon,
} from '@mui/icons-material';
import { useUiStore } from '../store/uiStore';

/**
 * Banner global de conectividad: aparece cuando el backend tarda en responder
 * (p. ej. el cold start de Render free, ~60s) o cuando no hay conexión.
 * Se oculta automáticamente cuando las peticiones se completan.
 */
export default function ServerStatusBanner() {
  const status = useUiStore((s) => s.serverStatus);
  const setServerStatus = useUiStore((s) => s.setServerStatus);
  const show = status === 'slow' || status === 'offline';
  const isOffline = status === 'offline';
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline') setServerStatus('ok');
    };
    const handleOffline = () => {
      setServerStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status, setServerStatus]);

  useEffect(() => {
    if (status !== 'slow') return undefined;

    // Render no ofrece un tiempo exacto de arranque. Es una estimación visual
    // para que el usuario sepa que la petición sigue esperando y no está rota.
    setSecondsLeft(60);
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  return (
    <AnimatePresence>
      {show && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 15000,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            pt: 1,
          }}
        >
          <motion.div
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ pointerEvents: 'auto' }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                 px: { xs: 1.25, sm: 2 },
                 py: 0.9,
                 maxWidth: 'calc(100vw - 24px)',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(14px) saturate(150%)',
                background: isOffline
                  ? 'linear-gradient(135deg, #b3342c 0%, #8c2119 100%)'
                  : 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
              }}
            >
              {isOffline ? (
                <OfflineIcon sx={{ fontSize: 19 }} />
              ) : (
                <SlowIcon sx={{ fontSize: 19 }} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: { xs: 'normal', sm: 'nowrap' }, textAlign: { xs: 'center', sm: 'left' } }}>
                {isOffline
                  ? 'Sin conexión con el servidor'
                  : `Despertando servidor… aproximadamente ${secondsLeft}s`}
              </Typography>
              {isOffline ? (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    animation: 'pulse-dot 1.2s ease-in-out infinite',
                  }}
                />
              ) : (
                <CircularProgress size={14} thickness={5} sx={{ color: 'rgba(255,255,255,0.95)' }} />
              )}
              <IconButton
                size="small"
                aria-label="Ocultar aviso"
                onClick={() => setServerStatus('ok')}
                sx={{
                  ml: 0.5,
                  p: 0.3,
                  color: 'rgba(255,255,255,0.85)',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' },
                }}
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </motion.div>
        </Box>
      )}
    </AnimatePresence>
  );
}
