import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Chip,
  AppBar,
  Toolbar,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import { Launch as LaunchIcon } from '@mui/icons-material';
import axios from 'axios';
import SharedNoteSkeleton from '../components/skeletons/SharedNoteSkeleton';
import CoverImage from '../components/CoverImage';
import { API_BASE_URL } from '../services/api';
import { getAssetUrl } from '../utils/text';

export default function SharedNote() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default theme settings for public pages (reads system preferences)
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const publicTheme = createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
      primary: {
        main: '#386c5f',
      },
      background: {
        default: prefersDarkMode ? '#121212' : '#f5f5f5',
        paper: prefersDarkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    },
  });

  useEffect(() => {
    const fetchSharedNote = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/public/notes/shared/${token}`);
        setNote(res.data);
      } catch (err) {
        console.error(err);
        setError('Esta nota no existe, ya no está disponible o el enlace es incorrecto.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedNote();
    }
  }, [token]);

  const coverUrl = getAssetUrl(note?.coverImage);

  return (
    <ThemeProvider theme={publicTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          '@supports (min-height: 100dvh)': { minHeight: '100dvh' },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        {/* Top Public Header */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              Notitas (Nota Compartida)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              component={RouterLink}
              to="/register"
              startIcon={<LaunchIcon />}
            >
              Crear mi cuenta
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ flexGrow: 1, py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
          {loading ? (
            <SharedNoteSkeleton />
          ) : error ? (
            <Paper elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography variant="h6" color="error" gutterBottom>
                Acceso no disponible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {error}
              </Typography>
            </Paper>
          ) : (
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, overflow: 'hidden' }}>
              {/* Cover Image Banner */}
              {coverUrl && (
                <CoverImage
                  src={coverUrl}
                  alt="Cover"
                  sx={{ width: '100%', height: 250, borderRadius: 2, mb: 3, boxShadow: 1 }}
                />
              )}

              {/* Title */}
              <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.8rem', sm: '3rem' } }}>
                {note.title || 'Sin Título'}
              </Typography>

              {/* Date & Info */}
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1.5 }}>
                Compartido públicamente • Última modificación:{' '}
                {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 3 }}>
                  {note.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}

              <Divider sx={{ mb: 3 }} />

              {/* HTML Formatted Note Content */}
              <Box
                sx={{
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  color: 'text.primary',
                  '& p': { mb: 2 },
                  '& h1': { fontSize: '2rem', fontWeight: 'bold', mb: 2, mt: 3 },
                  '& h2': { fontSize: '1.6rem', fontWeight: 'bold', mb: 2, mt: 3 },
                  '& h3': { fontSize: '1.3rem', fontWeight: 'bold', mb: 1.5, mt: 2 },
                  '& pre': {
                    backgroundColor: publicTheme.palette.mode === 'dark' ? '#2e2e2e' : '#f4f4f4',
                    color: publicTheme.palette.mode === 'dark' ? '#e6e6e6' : '#2b2b2b',
                    padding: 2,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    mb: 2,
                  },
                  '& img.align-left': {
                    float: 'left',
                    margin: '12px 16px 12px 0',
                    maxWidth: '45%',
                    height: 'auto',
                    borderRadius: '8px',
                    display: 'block',
                  },
                  '& img.align-center': {
                    display: 'block',
                    margin: '20px auto',
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                  },
                  '& img.align-right': {
                    float: 'right',
                    margin: '12px 0 12px 16px',
                    maxWidth: '45%',
                    height: 'auto',
                    borderRadius: '8px',
                    display: 'block',
                  },
                  '& img': {
                    maxWidth: '100%',
                    maxHeight: '450px',
                    borderRadius: '8px',
                    margin: '16px 0',
                    display: 'block',
                  },
                  // Imágenes flotantes en vistas de solo lectura: centradas en línea
                  '& img[data-notitas-float]': {
                    position: 'static !important',
                    float: 'none !important',
                    display: 'block',
                    margin: '20px auto',
                    maxWidth: '100%',
                    height: 'auto',
                  },
                  // Table styles
                  '& table': {
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    width: '100%',
                    margin: '20px 0',
                    overflow: 'hidden',
                    '& td, & th': {
                      border: '2px solid',
                      borderColor: 'divider',
                      boxSizing: 'border-box',
                      minWidth: '1em',
                      padding: '6px 8px',
                      position: 'relative',
                      verticalAlign: 'top',
                    },
                    '& th': {
                      backgroundColor: 'action.hover',
                      fontWeight: 'bold',
                      textAlign: 'left',
                    },
                  },
                  // Checklist styles
                  '& ul[data-type="taskList"]': {
                    listStyle: 'none',
                    padding: 0,
                    '& li': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '4px 0',
                      '& input[type="checkbox"]': {
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        accentColor: '#386c5f',
                      },
                    },
                  },
                  '& p, & h1, & h2, & h3, & h4, & h5, & h6': {
                    clear: 'both',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: note.content || '<p><em>Nota vacía.</em></p>' }}
              />
            </Paper>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
