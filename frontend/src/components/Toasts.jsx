import React, { useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../store/toastStore';

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
    >
      <Alert
        severity={toast.severity}
        variant="filled"
        onClose={onDismiss}
        sx={{
          borderRadius: 2.5,
          boxShadow: 4,
          fontWeight: 500,
          '& .MuiAlert-message': { fontSize: '0.85rem' },
        }}
      >
        {toast.message}
      </Alert>
    </motion.div>
  );
}

export default function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 380,
        width: 'calc(100% - 40px)',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Box key={t.id} sx={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </Box>
        ))}
      </AnimatePresence>
    </Box>
  );
}
