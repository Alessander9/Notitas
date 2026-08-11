import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Sentinela de scroll infinito: observa el final del contenido con un
 * IntersectionObserver (root = viewport, por lo que funciona también dentro
 * de contenedores con overflow propio) y llama a `onLoadMore` cuando el
 * usuario se acerca al final y quedan más páginas.
 *
 * El observer se recrea cuando cambian `hasMore`/`loading`/`onLoadMore`, así
 * que al terminar de cargar una página se evalúa la intersección de nuevo:
 * si la sentinela sigue visible (lista más corta que el viewport), se carga
 * la siguiente página sin depender del timing de las callbacks del observer.
 */
export default function InfiniteScroll({ hasMore, loading, onLoadMore, children }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <>
      {children}
      <Box
        ref={sentinelRef}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 40,
          py: 1,
        }}
      >
        {loading && <CircularProgress size={18} thickness={5} />}
      </Box>
    </>
  );
}
