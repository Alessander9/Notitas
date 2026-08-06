import React, { Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
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

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Workspace = React.lazy(() => import('./pages/Workspace'));
const JoinProject = React.lazy(() => import('./pages/JoinProject'));
const SharedNote = React.lazy(() => import('./pages/SharedNote'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// ── Light Mode ───────────────────────────────────────────────────
// Primary verde esmeralda (#386c5f), Secondary violeta (#845EC2)
const LIGHT_THEME = {
  primary: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  secondary: { main: '#845EC2', light: '#B39CD0', dark: '#6a4aa3', contrastText: '#ffffff' },
  success: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  info: { main: '#3596B5', light: '#5bb1cf', dark: '#296073', contrastText: '#ffffff' },
  background: { default: '#f5f5f5', paper: '#fafafa' },
  divider: '#e0e6ed',
  text: { primary: '#1a2332', secondary: '#5a6a7e' },
};

const DARK_THEME = {
  primary: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  secondary: { main: '#3596B5', light: '#5bb1cf', dark: '#296073', contrastText: '#ffffff' },
  success: { main: '#386c5f', light: '#6a968c', dark: '#264e44', contrastText: '#ffffff' },
  background: { default: '#0f0f23', paper: '#1a1a35' },
  divider: '#2a2a4a',
  text: { primary: '#e8e8f0', secondary: '#a0a0c0' },
};

export default function App() {
  const { isAuthenticated, user, forceLogout } = useAuthStore();
  const { darkMode, showWelcome, welcomeKind, welcomeUser, setShowWelcome, setWelcomeUser } = useUiStore();

  const [booting, setBooting] = React.useState(() => !sessionStorage.getItem('notitas-booted'));
  const [exiting, setExiting] = React.useState(false);

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
        shape: { borderRadius: 12 },
        components: {
          MuiCssBaseline: {
            styleOverrides: (theme) => ({
              body: {
                scrollbarWidth: 'thin',
                scrollbarColor: theme.palette.mode === 'dark' ? '#2a2a4a transparent' : '#e0e6ed transparent',
              },
            }),
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 10,
                fontWeight: 600,
                padding: '8px 20px',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' },
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
                backdropFilter: 'blur(12px)',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: darkMode ? undefined : 'rgba(255,255,255,0.85)',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backdropFilter: 'blur(20px)',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 8, fontWeight: 500 },
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
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? '#2a2a4a' : '#ADC5CF',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: darkMode ? '#6a968c' : '#386c5f',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#386c5f',
                },
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
        <AnimatePresence mode="wait">
          {booting && <LoadingPage key="boot" exiting={exiting} />}
        </AnimatePresence>
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
                <Route path="/shared/note/:token" element={<SharedNote />} />
                <Route path="/" element={<Workspace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <Toasts />
        <ConfirmDialog />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
