import React, { useState, useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';
import { getGenerativeGradient } from '../utils/gradientGenerator';

// Displays an image with a skeleton placeholder while it loads and a smooth
// fade-in once ready. Use it for cover images of notes and projects.
// `sx` applies to the wrapper (dimensions, borderRadius, shadow, etc.).
// `fallback` (optional) renders when there is no src or the image fails.
// `seed` (optional) generates an aesthetic mesh gradient if src is missing or fails.
export default function CoverImage({
  src,
  alt = '',
  sx,
  fallback = null,
  objectFit = 'cover',
  zoomOnHover = false,
  seed = null,
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset the loading state whenever the src changes (e.g. switching notes)
  if (src !== currentSrc) {
    setCurrentSrc(src);
    setLoaded(false);
    setFailed(false);
  }

  const gradientStyle = useMemo(() => {
    if (!seed) return null;
    return getGenerativeGradient(seed);
  }, [seed]);

  const showImage = Boolean(currentSrc) && !failed;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        // Zoom suave de la imagen al pasar el cursor (detalle premium)
        ...(zoomOnHover ? { '&:hover img': { transform: 'scale(1.07)' } } : {}),
        ...sx,
      }}
    >
      {showImage ? (
        <>
          {!loaded && (
            <Skeleton
              variant="rectangular"
              animation="wave"
              sx={{ position: 'absolute', inset: 0, zIndex: 0 }}
            />
          )}
          <Box
            component="img"
            src={currentSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            draggable={false}
            sx={{
              position: 'relative',
              zIndex: 1,
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit,
              opacity: loaded ? 1 : 0,
              pointerEvents: loaded ? 'auto' : 'none',
              transition: zoomOnHover
                ? 'opacity 0.35s ease-in-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'opacity 0.35s ease-in-out',
              ...(zoomOnHover ? { willChange: 'transform' } : {}),
            }}
          />
        </>
      ) : gradientStyle ? (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: gradientStyle.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%, rgba(0,0,0,0.2) 100%)',
              pointerEvents: 'none',
            },
          }}
        >
          {fallback}
        </Box>
      ) : (
        fallback
      )}
    </Box>
  );
}
