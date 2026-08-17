import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  FullscreenExit as ExitFullscreenIcon,
} from '@mui/icons-material';

/**
 * Divide el HTML de una nota en diapositivas según encabezados H1/H2 o separadores <hr>.
 */
function parseSlides(html = '') {
  if (!html) return [{ title: 'Sin contenido', content: '<p>Esta nota no contiene texto.</p>' }];

  // Reemplazar <hr> y <h1>, <h2> por marcadores de corte
  const sections = html
    .split(/(?=<h1|<h2|<hr)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sections.length === 0) {
    return [{ title: 'Diapositiva 1', content: html }];
  }

  return sections.map((sec, i) => {
    // Extraer título del primer heading si existe
    const hMatch = sec.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
    const title = hMatch ? hMatch[1].replace(/<[^>]*>/g, '') : `Diapositiva ${i + 1}`;
    return {
      title,
      content: sec,
    };
  });
}

export default function PresentationModal({ open, onClose, noteTitle = '', noteContent = '' }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => parseSlides(noteContent), [noteContent]);

  // Reset slide index when opening
  useEffect(() => {
    if (open) setCurrentSlide(0);
  }, [open]);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  // Atajos de teclado para presentación (Flechas, Espacio, Escape)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleNext, handlePrev, onClose]);

  if (!open) return null;

  const current = slides[currentSlide] || { title: '', content: '' };
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 2, sm: 6 },
          userSelect: 'none',
        },
      }}
    >
      {/* Barra Superior */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
            {noteTitle || 'Presentación'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700 }}>
            {currentSlide + 1} / {slides.length}
          </Typography>
          <Tooltip title="Salir de la presentación (ESC)">
            <IconButton onClick={onClose} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ExitFullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Contenido Central de la Diapositiva */}
      <Box
        sx={{
          my: 'auto',
          maxWidth: 900,
          width: '100%',
          mx: 'auto',
          textAlign: 'left',
          animation: 'fadeIn 0.25s ease',
          '& h1': { fontSize: { xs: '2rem', sm: '3.2rem' }, fontWeight: 900, mb: 2, color: '#38bdf8' },
          '& h2': { fontSize: { xs: '1.6rem', sm: '2.4rem' }, fontWeight: 800, mb: 2, color: '#38bdf8' },
          '& h3': { fontSize: { xs: '1.3rem', sm: '1.8rem' }, fontWeight: 700, mb: 1.5, color: '#94a3b8' },
          '& p': { fontSize: { xs: '1.1rem', sm: '1.5rem' }, lineHeight: 1.6, color: '#e2e8f0', my: 1.5 },
          '& ul, & ol': { fontSize: { xs: '1.1rem', sm: '1.4rem' }, lineHeight: 1.7, pl: 4, my: 2, color: '#cbd5e1' },
          '& li': { mb: 1 },
          '& code': { bgcolor: 'rgba(255,255,255,0.12)', px: 1, py: 0.3, borderRadius: 1.5, fontFamily: 'monospace', color: '#f59e0b' },
          '& pre': { bgcolor: '#1e293b', p: 2.5, borderRadius: 3, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)' },
          '& img': { maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 3, my: 2 },
          '& blockquote': { borderLeft: '4px solid #38bdf8', pl: 2, fontStyle: 'italic', color: '#94a3b8' },
        }}
        dangerouslySetInnerHTML={{ __html: current.content }}
      />

      {/* Barra Inferior con Navegación y Progreso */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' },
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>
            Usa las flechas ← → o la barra espaciadora para navegar
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handlePrev}
              disabled={currentSlide === 0}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:disabled': { opacity: 0.2 } }}
            >
              <PrevIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:disabled': { opacity: 0.2 } }}
            >
              <NextIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
