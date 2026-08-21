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
  InputAdornment,
} from '@mui/material';
import { Mail as MailIcon, Lock as LockIcon, Person as PersonIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import AuthLayout from '../components/AuthLayout';
import AuthFormSkeleton from '../components/skeletons/AuthFormSkeleton';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
          <AuthFormSkeleton fields={4} />
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
              Crea tu cuenta 🚀
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
              Empieza a organizar tus proyectos, notas y recursos
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2, fontSize: { xs: '0.82rem', sm: '0.875rem' } }}>
                ¡Registro exitoso! Redirigiendo al inicio de sesión...
              </Alert>
            )}

            <TextField
              margin="dense"
              required
              fullWidth
              id="name"
              label="Nombre completo"
              name="name"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 0.75 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              id="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 0.75 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="password"
              label="Contraseña (mínimo 6 caracteres)"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 0.75 }}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 0.75 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || success}
              sx={{
                mt: { xs: 2, sm: 2.5 },
                mb: 1.5,
                py: { xs: 1.15, sm: 1.3 },
                fontWeight: 700,
                fontSize: { xs: '0.88rem', sm: '0.95rem' },
                borderRadius: 2.5,
              }}
            >
              Crear cuenta
            </Button>
            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                color="primary"
                underline="hover"
                sx={{ fontSize: { xs: '0.82rem', sm: '0.875rem' }, fontWeight: 600, display: 'inline-block', py: 0.4 }}
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </Box>
          </Box>
        )}
      </Paper>
    </AuthLayout>
  );
}
