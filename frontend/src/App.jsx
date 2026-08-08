import React, { Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useUiStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { setUnauthorizedHandler } from './services/api';
import LoadingPage from './components/LoadingPage';
import WelcomeScreen from './components/WelcomeScreen';
import Toasts from './components/Toasts';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import IdleSessionGuard from './components/IdleSessionGuard';
import CommandPalette from './components/CommandPalette';

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Workspace = React.lazy(() => import('./pages/Workspace'));
const JoinProject = React.lazy(() => import('./pages/JoinProject'));
const JoinNote = React.lazy(() => import('./pages/JoinNote'));
const SharedNote = React.lazy(() => import('./pages/SharedNote'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// ── Light Mode ───────────────────────────────────────────────────
// Primary verde esmeralda (#386c5f), Secondary violeta (#845EC2), Accent púrpura (#6D4AFF)
const LIGHT_THEME = {
  primary: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  secondary: { main: '#845EC2', light: '#B39CD0', dark: '#6a4aa3', contrastText: '#ffffff' },
  accent: { main: '#6D4AFF', light: '#9F86FF', dark: '#4328D7', contrastText: '#ffffff' },
  success: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  info: { main: '#3596B5', light: '#5bb1cf', dark: '#296073', contrastText: '#ffffff' },
  background: { default: '#f5f7fc', paper: 'rgba(255, 255, 255, 0.85)' },
  divider: 'rgba(230, 232, 242, 0.7)',
  text: { primary: '#1a2332', secondary: '#5a6a7e' },
};

const DARK_THEME = {
  primary: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  secondary: { main: '#3596B5', light: '#5bb1cf', dark: '#296073', contrastText: '#ffffff' },
  accent: { main: '#6D4AFF', light: '#9F86FF', dark: '#4328D7', contrastText: '#ffffff' },
  success: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  background: { default: '#0f0f23', paper: 'rgba(26, 26, 53, 0.85)' },
  divider: 'rgba(255, 255, 255, 0.08)',
  text: { primary: '#e8e8f0', secondary: '#a0a0c0' },
};

export default function App() {
  const { isAuthenticated, user, forceLogout, refreshSession } = useAuthStore();
  const { darkMode, showWelcome, welcomeKind, welcomeUser, setShowWelcome, setWelcomeUser } = useUiStore();

  const [booting, setBooting] = React.useState(() => !sessionStorage.getItem('notitas-booted'));
  const [exiting, setExiting] = React.useState(false);
  const [themeFlash, setThemeFlash] = React.useState(false);
  const prevDarkRef = React.useRef(darkMode);

  // Verificación de sesión al arrancar: el estado persistido en localStorage
  // no sabe si la cookie JWT sigue siendo válida, así que se renueva contra el
  // servidor. Si expiró/fue revocada, se fuerza un logout limpio en vez de
  // mostrar el workspace roto (esto provocaba el "se cierra" al usar la app
  // con la sesión vencida).
  const [sessionReady, setSessionReady] = React.useState(!isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) {
      setSessionReady(true);
      return undefined;
    }
    let cancelled = false;
    setSessionReady(false);
    // Renueva la cookie y valida la sesión. Si expiró/fue revocada, el
    // interceptor de axios (401) fuerza el logout y redirige al login; los
    // fallos transitorios de red NO destruyen la sesión local.
    refreshSession().finally(() => {
      if (!cancelled) setSessionReady(true);
    });
    // Cap de seguridad: si el servidor tarda demasiado en responder (backend
    // dormido en Render free, red caída...), la verificación sigue en segundo
    // plano pero la app avanza — si la sesión resultara inválida, el
    // interceptor 401 fuerza el logout igualmente. Evita quedarse pegado en
    // la pantalla de carga para siempre.
    const cap = setTimeout(() => {
      if (!cancelled) setSessionReady(true);
    }, 12000);
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, [isAuthenticated, refreshSession]);

  // Renovación deslizante: mientras haya sesión, renueva la cookie cada 6 h y
  // al volver a la pestaña, para que la sesión no expire con la app en uso.
  React.useEffect(() => {
    if (!isAuthenticated) return undefined;
    const REFRESH_MS = 6 * 60 * 60 * 1000;
    // Solo renueva: el interceptor 401 fuerza el logout si el token expiró o
    // fue revocado; los errores de red se reintentan en el siguiente ciclo.
    const renew = () => {
      refreshSession();
    };
    const id = setInterval(renew, REFRESH_MS);
    const onFocus = () => {
      if (!document.hidden) renew();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, refreshSession]);

  React.useEffect(() => {
    setUnauthorizedHandler(() => forceLogout());
  }, [forceLogout]);

  // Callback estable para que el timer del WelcomeScreen no se reinicie
  // en cada render de App (antes era una función inline que reiniciaba el
  // timeout de 3.4s con cada cambio de store, dejando la pantalla pegada).
  const handleWelcomeFinish = React.useCallback(() => {
    setWelcomeUser(null);
    setShowWelcome(false);
  }, [setWelcomeUser, setShowWelcome]);

  // Cap de seguridad: si por cualquier motivo la pantalla no se cierra,
  // se fuerza su cierre a los 6 segundos de mostrarse.
  React.useEffect(() => {
    if (!showWelcome) return;
    const t = setTimeout(() => {
      setWelcomeUser(null);
      setShowWelcome(false);
    }, 6000);
    return () => clearTimeout(t);
  }, [showWelcome, setShowWelcome, setWelcomeUser]);

  React.useEffect(() => {
    if (!booting) return;
    sessionStorage.setItem('notitas-booted', '1');
    const t1 = setTimeout(() => setExiting(true), 1100);
    const t2 = setTimeout(() => setBooting(false), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [booting]);

  // Fundido breve al cambiar de tema: evita el cambio brusco entre
  // modo claro/oscuro (overlay que se desvanece sobre la app).
  React.useEffect(() => {
    if (prevDarkRef.current === darkMode) return;
    prevDarkRef.current = darkMode;
    setThemeFlash(true);
    const t = setTimeout(() => setThemeFlash(false), 500);
    return () => clearTimeout(t);
  }, [darkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          ...(darkMode ? DARK_THEME : LIGHT_THEME),
        },
        typography: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.02em' },
          h5: { fontWeight: 600, letterSpacing: '-0.015em' },
          h6: { fontWeight: 600 },
          body1: { lineHeight: 1.6 },
        },
        shape: { borderRadius: 14 },
        shadows: [
          'none',
          darkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(56,108,95,0.06)',
          darkMode ? '0 4px 14px rgba(0,0,0,0.45)' : '0 6px 16px rgba(56,108,95,0.08)',
          darkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 10px 24px rgba(56,108,95,0.10)',
          darkMode ? '0 12px 28px rgba(0,0,0,0.55)' : '0 16px 40px rgba(56,108,95,0.12)',
          darkMode ? '0 16px 36px rgba(0,0,0,0.6)' : '0 24px 60px rgba(56,108,95,0.16)',
          ...Array(19).fill('none'),
        ],
        components: {
          MuiCssBaseline: {
            styleOverrides: (theme) => ({
              body: {
                scrollbarWidth: 'thin',
                scrollbarColor: theme.palette.mode === 'dark' ? '#2a2a4a transparent' : '#e0e6ed transparent',
                backgroundColor: theme.palette.background.default,
                backgroundImage:
                  theme.palette.mode === 'dark'
                    ? 'radial-gradient(1100px 700px at 88% -10%, rgba(56,108,95,0.28), transparent 60%), radial-gradient(900px 600px at -12% 28%, rgba(0,201,167,0.12), transparent 55%), radial-gradient(1000px 700px at 45% 115%, rgba(132,94,194,0.16), transparent 60%)'
                    : 'radial-gradient(1100px 700px at 88% -10%, rgba(56,108,95,0.12), transparent 60%), radial-gradient(900px 600px at -12% 28%, rgba(0,201,167,0.10), transparent 55%), radial-gradient(1000px 700px at 45% 115%, rgba(132,94,194,0.08), transparent 60%)',
                transition: 'background-color 0.35s ease',
              },
            }),
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 14,
                fontWeight: 600,
                padding: '8px 20px',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: darkMode ? '0 8px 20px rgba(0,0,0,0.5)' : '0 8px 20px rgba(56,108,95,0.18)' },
              },
              containedPrimary: {
                background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #264e44 0%, #386c5f 100%)' },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderRadius: 20,
                backdropFilter: 'blur(12px)',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(230,232,242,0.8)',
                boxShadow: darkMode ? '0 6px 20px rgba(0,0,0,0.4)' : '0 6px 18px rgba(56,108,95,0.07)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: darkMode ? 'rgba(26,26,53,0.85)' : 'rgba(255,255,255,0.85)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              },
              outlined: {
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(230,232,242,0.8)',
                borderRadius: 16,
                backdropFilter: 'blur(12px) saturate(150%)',
                WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                boxShadow: darkMode 
                  ? '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)' 
                  : '0 4px 16px rgba(56,108,95,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                '&:hover': {
                  borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(56,108,95,0.2)',
                  boxShadow: darkMode 
                    ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' 
                    : '0 8px 28px rgba(56,108,95,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                },
              },
              elevation0: {
                boxShadow: 'none',
              },
              elevation1: {
                boxShadow: darkMode 
                  ? '0 2px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)' 
                  : '0 2px 12px rgba(56,108,95,0.07), inset 0 1px 0 rgba(255,255,255,0.8)',
              },
              elevation2: {
                boxShadow: darkMode 
                  ? '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' 
                  : '0 4px 20px rgba(56,108,95,0.09), inset 0 1px 0 rgba(255,255,255,0.85)',
              },
              elevation3: {
                boxShadow: darkMode 
                  ? '0 8px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)' 
                  : '0 8px 28px rgba(56,108,95,0.11), inset 0 1px 0 rgba(255,255,255,0.9)',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 24,
                margin: '12px',
                maxHeight: 'calc(100% - 24px)',
                backdropFilter: 'blur(20px) saturate(140%)',
                backgroundColor: darkMode ? 'rgba(26,26,53,0.88)' : 'rgba(255,255,255,0.88)',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(230,232,242,0.8)',
                boxShadow: darkMode ? '0 24px 60px rgba(0,0,0,0.6)' : '0 24px 60px rgba(56,108,95,0.18)',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 14,
                transition: 'all 0.2s ease-in-out',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? '#2a2a4a' : '#ADC5CF',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? '#6a968c' : '#386c5f',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#6D4AFF',
                  borderWidth: '2px',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 10, fontWeight: 500 },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                backdropFilter: 'blur(8px)',
                backgroundColor: darkMode ? 'rgba(26,26,53,0.9)' : 'rgba(255,255,255,0.9)',
                color: darkMode ? '#e8e8f0' : '#1a1a2e',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                fontSize: '0.8rem',
              },
            },
          },

        },
      }),
    [darkMode]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Overlay de transición de tema (se desvanece solo) */}
        {themeFlash && (
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 20000,
              pointerEvents: 'none',
              bgcolor: darkMode ? '#0c0c1c' : '#ffffff',
              animation: 'themeFlashFade 0.5s ease forwards',
            }}
          />
        )}
        <AnimatePresence mode="wait">
          {booting && <LoadingPage key="boot" exiting={exiting} />}
        </AnimatePresence>
        {/* Mientras se verifica/renueva la cookie no se muestra el workspace */}
        {!sessionReady && isAuthenticated && (
          <LoadingPage key="session" message="Verificando tu sesión..." />
        )}
        {showWelcome && (welcomeKind === 'logout' || isAuthenticated) && (
          <WelcomeScreen
            key={`welcome-${welcomeKind}`}
            variant={welcomeKind}
            user={welcomeKind === 'logout' ? welcomeUser : user}
            onFinish={handleWelcomeFinish}
          />
        )}
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<LoadingPage message="Cargando..." />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/join/project/:token" element={<JoinProject />} />
                <Route path="/join/note/:token" element={<JoinNote />} />
                <Route path="/shared/note/:token" element={<SharedNote />} />
                <Route path="/" element={<Workspace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <Toasts />
        <ConfirmDialog />
        <IdleSessionGuard />
        <CommandPalette />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
