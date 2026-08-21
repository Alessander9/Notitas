import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Lock as LockIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';
import { toast } from '../store/toastStore';
import AuthLayout from '../components/AuthLayout';
import AuthFormSkeleton from '../components/skeletons/AuthFormSkeleton';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'El enlace de recuperación es inválido o ha expirado.'
      );
    } finally {
      setLoading(false);
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
        ) : !token ? (
          <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
            <Typography component="h1" variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} gutterBottom>
              Enlace inválido
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Falta el token de recuperación en la URL. Vuelve a solicitar un enlace de restablecimiento.
            </Typography>
            <Button
              component={RouterLink}
              to="/forgot-password"
              variant="contained"
              sx={{ fontWeight: 600, py: { xs: 1, sm: 1.2 }, px: 3, borderRadius: 2.5 }}
            >
              Solicitar nuevo enlace
            </Button>
          </Box>
        ) : success ? (
          <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
            <Typography component="h1" variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} gutterBottom>
              ¡Contraseña actualizada! ✅
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Ya puedes iniciar sesión con tu nueva contraseña.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              sx={{ fontWeight: 600, py: { xs: 1, sm: 1.2 }, px: 3, borderRadius: 2.5 }}
            >
              Ir al inicio de sesión
            </Button>
          </Box>
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
              Elige una nueva contraseña 🔐
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
              Introduce y confirma tu nueva contraseña. Al restablecerla, todas tus sesiones se cerrarán.
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
              label="Nueva contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                      {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              label="Confirmar contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={Boolean(confirmPassword) && confirmPassword !== password}
              helperText={Boolean(confirmPassword) && confirmPassword !== password ? 'Las contraseñas no coinciden' : ' '}
              sx={{ mb: 1 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                mb: 1.5,
                py: { xs: 1.15, sm: 1.3 },
                fontWeight: 700,
                fontSize: { xs: '0.88rem', sm: '0.95rem' },
                borderRadius: 2.5,
              }}
            >
              Restablecer contraseña
            </Button>

            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                color="primary"
                underline="hover"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: { xs: '0.82rem', sm: '0.875rem' },
                  fontWeight: 600,
                  py: 0.4,
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
                Volver al inicio de sesión
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </AuthLayout>
  );
}
