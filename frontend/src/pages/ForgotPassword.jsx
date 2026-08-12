import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Mail as MailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';
import AuthFormSkeleton from '../components/skeletons/AuthFormSkeleton';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setDevResetLink('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setInfo(
        res.data?.message ||
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
      // En desarrollo sin email configurado, el backend devuelve el enlace para
      // poder probar el flujo completo localmente.
      if (res.data?.devResetLink) {
        setDevResetLink(res.data.devResetLink);
      }
    } catch (err) {
      setError(
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Algo salió mal. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Paper elevation={6} aria-busy={loading} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, bgcolor: 'background.paper' }}>
        {loading ? (
          <AuthFormSkeleton fields={1} />
        ) : (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography component="h1" variant="h5" fontWeight={800} gutterBottom>
              ¿Olvidaste tu contraseña? 🔑
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Introduce tu correo electrónico y te enviaremos un enlace para restablecerla.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {info && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {info}
              </Alert>
            )}

            {/* Enlace de dev (solo visible cuando el backend no tiene email configurado) */}
            {devResetLink && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Modo desarrollo (email no configurado): usa este enlace para probar el flujo.
                </Typography>
                <Link href={devResetLink} target="_blank" rel="noreferrer" sx={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {devResetLink}
                </Link>
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.2, fontWeight: 'bold', fontSize: '0.95rem' }}
            >
              Enviar enlace de recuperación
            </Button>

            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                color="primary"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
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
