import React, { useState } from 'react';
import { Box, Skeleton } from '@mui/material';

// Displays an image with a skeleton placeholder while it loads and a smooth
// fade-in once ready. Use it for cover images of notes and projects.
// `sx` applies to the wrapper (dimensions, borderRadius, shadow, etc.).
// `fallback` (optional) renders when there is no src or the image fails.
export default function CoverImage({ src, alt = '', sx, fallback = null, objectFit = 'cover' }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset the loading state whenever the src changes (e.g. switching notes)
  if (src !== currentSrc) {
    setCurrentSrc(src);
    setLoaded(false);
    setFailed(false);
  }

  const showImage = Boolean(currentSrc) && !failed;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', flexShrink: 0, ...sx }}>
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
              transition: 'opacity 0.35s ease-in-out',
            }}
          />
        </>
      ) : (
        fallback
      )}
    </Box>
  );
}
