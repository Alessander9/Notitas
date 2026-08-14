import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import {
  GroupAdd as GroupAddIcon,
  Check as CheckIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import api from '../services/api';
import JoinProjectSkeleton from '../components/skeletons/JoinProjectSkeleton';
import logoImage from '../assets/logo notitas.png';

export default function JoinNote() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setCurrentProject, setCurrentNote } = useUiStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleJoin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/notes/join/${token}`);
      setSuccess(true);
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setCurrentProject(res.data.projectId);
          setCurrentNote(res.data.id);
          navigate('/');
        }, 500);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'El código de invitación a la nota es inválido o ha vencido.');
    } finally {
      setLoading(false);
    }
  }, [token, setCurrentProject, setCurrentNote, navigate]);

  useEffect(() => {
    if (isAuthenticated && token) {
      handleJoin();
    }
  }, [isAuthenticated, token, handleJoin]);

  const handleLoginRedirect = () => {
    localStorage.setItem('pending-invite-token', token);
    localStorage.setItem('pending-invite-type', 'note');
    navigate('/login');
  };

  const handleRegisterRedirect = () => {
    localStorage.setItem('pending-invite-token', token);
    localStorage.setItem('pending-invite-type', 'note');
    navigate('/register');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a35 50%, #0f0f23 100%)'
            : 'linear-gradient(135deg, #f0f2f5 0%, #e6edf4 50%, #f0f2f5 100%)',
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* Background decoration elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle, rgba(56,108,95,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(56,108,95,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle, rgba(132,94,194,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(132,94,194,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <AnimatePresence mode="wait">
        {!exiting && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 420,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(26, 26, 53, 0.85)'
                    : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                borderRadius: 6,
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(230,232,242,0.8)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 24px 60px rgba(0,0,0,0.5)'
                    : '0 24px 60px rgba(56,108,95,0.15)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Header with gradient */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #386c5f 0%, #264e44 50%, #1d3f37 100%)',
                  py: 4,
                  px: 3,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.08)',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  }}
                />

                {/* Logo */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      mx: 'auto',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <img
                      src={logoImage}
                      alt="Notitas"
                      style={{
                        width: 50,
                        height: 50,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                      }}
                    />
                  </Box>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#fff',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Invitación a Nota
                  </Typography>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      mt: 1,
                      maxWidth: 280,
                      mx: 'auto',
                    }}
                  >
                    Al unirte podrás ver y editar esta nota de forma compartida
                  </Typography>
                </motion.div>
              </Box>

              {/* Content */}
              <Box sx={{ p: { xs: 3, sm: 4 } }}>
                {loading ? (
                  <JoinProjectSkeleton />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {/* Benefits of joining */}
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          mb: 1.5,
                        }}
                      >
                        Al colaborar obtendrás:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '8px',
                              bgcolor: 'rgba(56, 108, 95, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ViewIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Acceso y lectura en tiempo real
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '8px',
                              bgcolor: 'rgba(132, 94, 194, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Permiso para editar el contenido
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '8px',
                              bgcolor: 'rgba(53, 150, 181, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <GroupAddIcon sx={{ fontSize: 16, color: 'info.main' }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Colaboración directa en tu Workspace
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    {/* Errors */}
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert 
                            severity="error" 
                            sx={{ 
                              mb: 2.5, 
                              borderRadius: 2,
                              bgcolor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid',
                              borderColor: 'rgba(239, 68, 68, 0.2)',
                            }}
                          >
                            {error}
                          </Alert>
                        </motion.div>
                      )}

                      {success && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <Box
                            sx={{
                              mb: 2.5,
                              p: 2.5,
                              borderRadius: 3,
                              bgcolor: 'rgba(56, 108, 95, 0.08)',
                              border: '1px solid',
                              borderColor: 'rgba(56, 108, 95, 0.2)',
                              textAlign: 'center',
                            }}
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            >
                              <Box
                                sx={{
                                  width: 50,
                                  height: 50,
                                  mx: 'auto',
                                  mb: 1.5,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <CheckIcon sx={{ color: '#fff', fontSize: 28 }} />
                              </Box>
                            </motion.div>
                            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                              ¡Te has unido con éxito!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              Redirigiendo a tu espacio de trabajo...
                            </Typography>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action buttons */}
                    {!isAuthenticated && !success && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<LoginIcon />}
                            onClick={handleLoginRedirect}
                            sx={{
                              py: 1.4,
                              fontWeight: 700,
                              borderRadius: 3,
                              textTransform: 'none',
                              fontSize: '0.95rem',
                              background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                              boxShadow: '0 8px 24px rgba(56, 108, 95, 0.3)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #6a968c 0%, #386c5f 100%)',
                                boxShadow: '0 12px 32px rgba(56, 108, 95, 0.4)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.25s ease',
                            }}
                          >
                            Iniciar Sesión para Unirse
                          </Button>
                        </motion.div>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Divider sx={{ flex: 1 }} />
                          <Typography variant="caption" color="text.disabled">
                            o
                          </Typography>
                          <Divider sx={{ flex: 1 }} />
                        </Box>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<PersonAddIcon />}
                            onClick={handleRegisterRedirect}
                            sx={{
                              py: 1.4,
                              fontWeight: 700,
                              borderRadius: 3,
                              textTransform: 'none',
                              fontSize: '0.95rem',
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.dark',
                                bgcolor: 'rgba(56, 108, 95, 0.08)',
                                transform: 'translateY(-2px)',
                              },
                              transition: 'all 0.25s ease',
                            }}
                          >
                            Crear Cuenta Nueva
                          </Button>
                        </motion.div>

                        <Typography
                          variant="caption"
                          sx={{
                            textAlign: 'center',
                            color: 'text.disabled',
                            mt: 1,
                          }}
                        >
                          ¿No tienes cuenta? Regístrate en segundos
                        </Typography>
                      </Box>
                    )}
                  </motion.div>
                )}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
