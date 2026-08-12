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
        sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, bgcolor: 'background.paper' }}
      >
        {loading ? (
          <AuthFormSkeleton fields={2} />
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography component="h1" variant="h5" fontWeight={800} gutterBottom>
              Bienvenido de nuevo 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Inicia sesión para continuar con tus proyectos y notas
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              margin="normal"
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
            />
            <TextField
              margin="normal"
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
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                  size="small"
                  sx={{
                    '& .MuiSvgIcon-root': { fontSize: 22 },
                    '&:hover': { backgroundColor: 'transparent' },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                    Recuérdame
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    Mantendrá tu sesión iniciada 30 días en este dispositivo
                  </Typography>
                </Box>
              }
              sx={{
                mt: 1.5,
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': { mt: 0.2 },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 'bold', fontSize: '0.95rem' }}
            >
              Iniciar sesión
            </Button>
            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2" color="text.secondary" underline="hover">
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Link component={RouterLink} to="/register" variant="body2" color="primary" underline="hover">
                ¿No tienes cuenta? Regístrate
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </AuthLayout>
  );
}
