import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useAuthStore } from '../store/authStore';

/**
 * Minutos de inactividad antes de avisar al usuario. OWASP recomienda 15-30 min
 * para apps sensibles; para una app de notas 60 es más amable. Se puede
 * sobreescribir con la clave de localStorage `notitas-idle-timeout-minutes`.
 */
export const IDLE_TIMEOUT_MINUTES = 60;

/** Segundos de gracia tras el aviso antes de cerrar la sesión. */
const GRACE_SECONDS = 60;

/**
 * Cierra la sesión automáticamente tras un periodo sin actividad del usuario
 * (ratón, teclado, toque, scroll o clic). Muestra primero un diálogo de aviso
 * con opción de continuar; si no hay interacción en la ventana de gracia,
 * hace logout (que además revoca los tokens en el servidor).
 */
export default function IdleSessionGuard() {
  const { isAuthenticated, logout } = useAuthStore();
  const [warningOpen, setWarningOpen] = useState(false);
  const lastActivity = useRef(Date.now());
  const warningShownAt = useRef(null);
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const timeoutMs =
    (Number(localStorage.getItem('notitas-idle-timeout-minutes')) || IDLE_TIMEOUT_MINUTES) * 60_000;

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const onActivity = () => {
      lastActivity.current = Date.now();
      if (warningShownAt.current !== null) {
        warningShownAt.current = null;
        setWarningOpen(false);
      }
    };

    // mousemove/scroll se disparan muchísimo; se procesan como mucho cada 1.5s.
    const throttled = () => {
      let last = 0;
      return () => {
        const now = Date.now();
        if (now - last > 1500) {
          last = now;
          onActivity();
        }
      };
    };

    const handlers = [];
    events.forEach((ev) => {
      const handler = ev === 'mousemove' || ev === 'scroll' ? throttled() : onActivity;
      window.addEventListener(ev, handler, { passive: true });
      handlers.push([ev, handler]);
    });

    // Al volver a la pestaña se resetea la inactividad: el tiempo pasado en
    // background (p. ej. trabajando en otra pestaña) no debe contar como
    // inactividad ni cerrar la sesión del usuario que sí está activo.
    const onVisibilityChange = () => {
      if (!document.hidden) onActivity();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    handlers.push(['visibilitychange', onVisibilityChange]);

    const interval = setInterval(() => {
      // Nunca se mide inactividad ni se avisa/cierra con la pestaña oculta.
      if (document.hidden) return;
      const idle = Date.now() - lastActivity.current;
      if (warningShownAt.current === null && idle >= timeoutMs) {
        warningShownAt.current = Date.now();
        setWarningOpen(true);
      } else if (warningShownAt.current !== null && Date.now() - warningShownAt.current >= GRACE_SECONDS * 1000) {
        logoutRef.current();
      }
    }, 1000);

    return () => {
      handlers.forEach(([ev, h]) => window.removeEventListener(ev, h));
      clearInterval(interval);
    };
  }, [isAuthenticated, timeoutMs]);

  const handleContinue = () => {
    lastActivity.current = Date.now();
    warningShownAt.current = null;
    setWarningOpen(false);
  };

  const handleLogout = () => {
    setWarningOpen(false);
    logoutRef.current();
  };

  return (
    <Dialog open={warningOpen && isAuthenticated} onClose={handleContinue} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>¿Sigues ahí? 👀</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Llevas {Math.max(1, Math.round(timeoutMs / 60000))} minutos sin actividad. Por seguridad, tu
          sesión se cerrará en {GRACE_SECONDS} segundos si no haces nada.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleLogout} color="inherit" sx={{ borderRadius: 2 }}>
          Cerrar sesión
        </Button>
        <Button onClick={handleContinue} variant="contained" sx={{ borderRadius: 2 }}>
          Continuar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
