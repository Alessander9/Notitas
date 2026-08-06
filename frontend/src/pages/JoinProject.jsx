import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
} from '@mui/material';
import { GroupAdd as GroupAddIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import api from '../services/api';
import JoinProjectSkeleton from '../components/skeletons/JoinProjectSkeleton';

export default function JoinProject() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setCurrentProject } = useUiStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleJoin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/projects/join/${token}`);
      setSuccess(true);
      setTimeout(() => {
        setCurrentProject(res.data.id);
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Código de invitación inválido o vencido.');
    } finally {
      setLoading(false);
    }
  }, [token, setCurrentProject, navigate]);

  useEffect(() => {
    if (isAuthenticated && token) {
      handleJoin();
    }
  }, [isAuthenticated, token, handleJoin]);

  const handleLoginRedirect = () => {
    // Save token to session/localStorage to join after login
    localStorage.setItem('pending-invite-token', token);
    navigate('/login');
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        display: 'flex',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
      }}
    >
      <Paper elevation={4} aria-busy={loading} sx={{ p: { xs: 3, sm: 4 }, width: '100%', borderRadius: 3, textAlign: 'center' }}>
        {loading ? (
          <JoinProjectSkeleton />
        ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <GroupAddIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h5" fontWeight="bold">
            Invitación a Proyecto
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', my: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: '100%', my: 2 }}>
              ¡Te has unido con éxito! Redirigiendo al proyecto...
            </Alert>
          )}

          {!isAuthenticated && !success && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Has sido invitado a colaborar en un proyecto. Inicia sesión o regístrate para aceptar la invitación.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={handleLoginRedirect}
                sx={{ py: 1.2, fontWeight: 'bold' }}
              >
                Iniciar Sesión para Unirse
              </Button>
            </>
          )}
        </Box>
        )}
      </Paper>
    </Container>
  );
}
