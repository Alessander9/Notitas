import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Alert,
  Checkbox,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import { Mail as MailIcon, Lock as LockIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import AuthLayout from '../components/AuthLayout';
import AuthFormSkeleton from '../components/skeletons/AuthFormSkeleton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Marcada por defecto: mantiene la sesión 30 días en este dispositivo.
  // Desmarcada, la sesión se cierra al cerrar el navegador.
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const setShowWelcome = useUiStore((state) => state.setShowWelcome);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (result.success) {
      setShowWelcome(true);
      const pendingInviteToken = localStorage.getItem('pending-invite-token');
      const pendingInviteType = localStorage.getItem('pending-invite-type');
      if (pendingInviteToken) {
        localStorage.removeItem('pending-invite-token');
        localStorage.removeItem('pending-invite-type');
        if (pendingInviteType === 'note') {
          navigate(`/join/note/${pendingInviteToken}`);
        } else {
          navigate(`/join/project/${pendingInviteToken}`);
        }
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <AuthLayout>
      <Paper
        elevation={6}
        aria-busy={loading}
        sx={{
          p: { xs: 2.25, sm: 3.5, md: 4 },
          borderRadius: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {loading ? (
          <AuthFormSkeleton fields={2} />
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              component="h1"
              variant="h5"
              fontWeight={800}
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.55rem' },
                lineHeight: 1.25,
                mb: 0.5,
              }}
            >
              Bienvenido de nuevo 👋
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: { xs: 2, sm: 2.5 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                lineHeight: 1.4,
              }}
            >
              Inicia sesión para continuar con tus proyectos y notas
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="dense"
              required
              fullWidth
              id="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                  size="small"
                  sx={{
                    p: { xs: 0.5, sm: 0.75 },
                    '& .MuiSvgIcon-root': { fontSize: { xs: 20, sm: 22 } },
                    '&:hover': { backgroundColor: 'transparent' },
                  }}
                />
              }
              label={
                <Box sx={{ ml: { xs: 0.5, sm: 0.75 } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.3 }}>
                    Recuérdame
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, lineHeight: 1.25, display: 'block' }}>
                    Mantendrá tu sesión iniciada 30 días en este dispositivo
                  </Typography>
                </Box>
              }
              sx={{
                mt: 1,
                mb: 0.5,
                mx: 0,
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': { mt: 0.1 },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: { xs: 2, sm: 2.5 },
                mb: 1.5,
                py: { xs: 1.15, sm: 1.3 },
                fontWeight: 700,
                fontSize: { xs: '0.88rem', sm: '0.95rem' },
                borderRadius: 2.5,
              }}
            >
              Iniciar sesión
            </Button>
            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                color="text.secondary"
                underline="hover"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, display: 'inline-block', py: 0.4 }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>
            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link
                component={RouterLink}
                to="/register"
                variant="body2"
                color="primary"
                underline="hover"
                sx={{ fontSize: { xs: '0.82rem', sm: '0.875rem' }, fontWeight: 600, display: 'inline-block', py: 0.4 }}
              >
                ¿No tienes cuenta? Regístrate
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </AuthLayout>
  );
}
