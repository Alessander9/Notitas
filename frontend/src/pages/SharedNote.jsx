import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
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
import { 
  Launch as LaunchIcon,
  DescriptionOutlined as DescriptionIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import SharedNoteSkeleton from '../components/skeletons/SharedNoteSkeleton';
import CoverImage from '../components/CoverImage';
import { API_BASE_URL } from '../services/api';
import { getAssetUrl } from '../utils/text';
import logoImage from '../assets/logo notitas.png';

function extractHeadings(html = '') {
  const matches = [];
  const regex = /<h([123])[^>]*>(.*?)<\/h[123]>/gi;
  let match;
  let i = 0;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) matches.push({ id: `h-${i++}`, level, text });
  }
  return matches;
}

function injectHeadingIds(html = '') {
  let i = 0;
  return html.replace(/<h([123])([^>]*)>/gi, (_, level, attrs) => {
    return `<h${level}${attrs} id="h-${i++}">`;
  });
}

export default function SharedNote() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headings = useMemo(() => (note?.content ? extractHeadings(note.content) : []), [note?.content]);
  const processedContent = useMemo(() => (note?.content ? injectHeadingIds(note.content) : ''), [note?.content]);
  const [activeHeading, setActiveHeading] = useState('');

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

  // Default theme settings for public pages (reads system preferences)
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const publicTheme = createTheme({
    palette: {
      mode: prefersDarkMode ? 'dark' : 'light',
      primary: {
        main: '#386c5f',
      },
      background: {
        default: prefersDarkMode ? '#0f0f23' : '#f0f2f5',
        paper: prefersDarkMode ? 'rgba(26, 26, 53, 0.85)' : 'rgba(255, 255, 255, 0.90)',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          body: {
            backgroundColor: theme.palette.background.default,
            backgroundImage:
              theme.palette.mode === 'dark'
                ? 'radial-gradient(1100px 700px at 88% -10%, rgba(56,108,95,0.28), transparent 60%), radial-gradient(900px 600px at -12% 28%, rgba(0,201,167,0.12), transparent 55%), radial-gradient(1000px 700px at 45% 115%, rgba(132,94,194,0.16), transparent 60%)'
                : 'radial-gradient(1100px 700px at 88% -10%, rgba(56,108,95,0.08), transparent 60%), radial-gradient(900px 600px at -12% 28%, rgba(109,74,255,0.04), transparent 55%), radial-gradient(1000px 700px at 45% 115%, rgba(132,94,194,0.05), transparent 60%)',
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
          },
        }),
      },
    },
  });

  const isContentEmpty = (htmlContent) => {
    if (!htmlContent) return true;
    
    // Check if it contains visual elements that don't have text
    const hasVisualElements = /<(img|table|hr|input|iframe|video|audio|code|pre)\b/i.test(htmlContent);
    if (hasVisualElements) return false;
    
    // Strip HTML tags and entities to see if there is any visible text
    const textOnly = htmlContent
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, '')
      .trim();
      
    return textOnly.length === 0;
  };

  useEffect(() => {
    // Temporarily disabled for testing
  }, [token]);

  const coverUrl = getAssetUrl(note?.coverImage);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveHeading(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    const t = setTimeout(() => {
      headings.forEach(h => {
        const el = document.getElementById(h.id);
        if (el) observer.observe(el);
      });
    }, 100);
    return () => { clearTimeout(t); observer.disconnect(); };
  }, [headings]);

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
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            backdropFilter: 'blur(12px)',
            backgroundColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'rgba(26, 26, 53, 0.75)' 
                : 'rgba(255, 255, 255, 0.75)',
            borderBottom: '1px solid',
            borderColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(230, 232, 242, 0.8)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(56, 108, 95, 0.1)',
                  borderRadius: '8px',
                }}
              >
                <img
                  src={logoImage}
                  alt="Notitas"
                  style={{ width: 22, height: 22, objectFit: 'contain' }}
                />
              </Box>
              <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ letterSpacing: '-0.02em' }}>
                Notitas
              </Typography>
              <Chip 
                label="Nota pública" 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  bgcolor: (theme) => 
                    theme.palette.mode === 'dark' 
                      ? 'rgba(56, 108, 95, 0.2)' 
                      : 'rgba(56, 108, 95, 0.1)',
                  color: 'primary.main',
                  border: '1px solid rgba(56, 108, 95, 0.2)',
                }} 
              />
            </Box>
            <Button
              variant="contained"
              size="small"
              component={RouterLink}
              to="/register"
              startIcon={<LaunchIcon sx={{ fontSize: 16 }} />}
              sx={{
                py: 1,
                px: 2.2,
                fontSize: '0.85rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
                boxShadow: '0 4px 12px rgba(56, 108, 95, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #264e44 0%, #386c5f 100%)',
                  boxShadow: '0 6px 16px rgba(56, 108, 95, 0.3)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Crear mi cuenta
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: 'flex', gap: 3, px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 }, maxWidth: 1100, mx: 'auto', width: '100%' }}>
          {/* TOC sidebar — only on desktop when headings exist */}
          {headings.length >= 2 && (
            <Box
              component="nav"
              sx={{
                display: { xs: 'none', md: 'block' },
                width: 200,
                flexShrink: 0,
                position: 'sticky',
                top: 80,
                alignSelf: 'flex-start',
                maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.6rem', display: 'block', mb: 1 }}>
                Contenido
              </Typography>
              {headings.map(h => (
                <Box
                  key={h.id}
                  component="a"
                  href={`#${h.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  sx={{
                    display: 'block',
                    py: 0.3,
                    pl: (h.level === 1 ? 0.5 : h.level === 2 ? 1 : 1.75) + 0.5,
                    fontSize: '0.75rem',
                    color: activeHeading === h.id ? 'primary.main' : 'text.secondary',
                    fontWeight: activeHeading === h.id ? 700 : 400,
                    textDecoration: 'none',
                    borderLeft: '2px solid',
                    borderColor: activeHeading === h.id ? 'primary.main' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { color: 'primary.main' },
                    lineHeight: 1.4,
                  }}
                >
                  {h.text}
                </Box>
              ))}
            </Box>
          )}

          {/* Main content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {loading ? (
            <Box>
              <SharedNoteSkeleton />
            </Box>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 5, 
                  textAlign: 'center', 
                  borderRadius: 5,
                  border: '1px solid',
                  borderColor: (theme) => 
                    theme.palette.mode === 'dark' 
                      ? 'rgba(239, 68, 68, 0.15)' 
                      : 'rgba(239, 68, 68, 0.1)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Typography variant="h6" color="error.main" fontWeight="bold" gutterBottom>
                  Acceso no disponible
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {error}
                </Typography>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Paper 
                elevation={3} 
                sx={{ 
                  p: { xs: 3, sm: 5 }, 
                  borderRadius: 6, 
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                  border: '1px solid',
                  borderColor: (theme) => 
                    theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.06)' 
                      : 'rgba(230,232,242,0.8)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark' 
                      ? '0 24px 50px rgba(0,0,0,0.45)' 
                      : '0 20px 45px rgba(56,108,95,0.08)',
                }}
              >
                {/* Cover Image Banner */}
                {coverUrl && (
                  <CoverImage
                    src={coverUrl}
                    alt="Cover"
                    sx={{ width: '100%', height: { xs: 180, sm: 260 }, borderRadius: 2.5, mb: 4, boxShadow: 2 }}
                  />
                )}

                {/* Title with Icon */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {note.icon && (
                    <Box component="span" sx={{ fontSize: { xs: '2rem', sm: '2.8rem' }, lineHeight: 1 }}>
                      {note.icon}
                    </Box>
                  )}
                  <Typography 
                    variant="h3" 
                    fontWeight={800} 
                    sx={{ 
                      fontSize: { xs: '1.8rem', sm: '2.8rem' },
                      letterSpacing: '-0.025em',
                      lineHeight: 1.2
                    }}
                  >
                    {note.title || 'Sin Título'}
                  </Typography>
                </Box>

                {/* Date & Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.secondary' }}>
                  <CalendarIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Compartido públicamente • Última modificación:{' '}
                    {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Typography>
                </Box>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 3 }}>
                    {note.tags.map((tag) => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{
                          borderRadius: '8px',
                          borderColor: (theme) => 
                            theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.1)' 
                              : 'rgba(56, 108, 95, 0.2)',
                          bgcolor: (theme) => 
                            theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.02)' 
                              : 'rgba(56, 108, 95, 0.02)',
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Divider sx={{ mb: 4, opacity: 0.6 }} />

                {/* Content Area (HTML or Empty State) */}
                {isContentEmpty(note.content) ? (
                  <Box
                    sx={{
                      py: 6,
                      px: 3,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: (theme) => 
                        theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.02)' 
                          : 'rgba(56, 108, 95, 0.02)',
                      borderRadius: 4,
                      border: '1px dashed',
                      borderColor: (theme) => 
                        theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.1)' 
                          : 'rgba(56, 108, 95, 0.15)',
                    }}
                  >
                    <DescriptionIcon 
                      sx={{ 
                        fontSize: 48, 
                        color: 'text.disabled',
                        mb: 2,
                        opacity: 0.6,
                      }} 
                    />
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary" gutterBottom>
                      Esta nota no tiene contenido aún
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 360, mx: 'auto', mb: 3 }}>
                      El creador de la nota no ha añadido ningún texto, imagen o recurso en esta sección por ahora.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      component={RouterLink}
                      to="/register"
                      startIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        py: 1,
                        px: 2.5,
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          borderColor: 'primary.dark',
                          bgcolor: 'rgba(56, 108, 95, 0.08)',
                        }
                      }}
                    >
                      Crear mi propia libreta
                    </Button>
                  </Box>
                ) : (
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
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                  />
                )}
              </Paper>
            </motion.div>
          )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
