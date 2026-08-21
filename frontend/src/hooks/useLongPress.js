import { useCallback, useRef } from 'react';

/**
 * Hook para detectar pulsación larga (Long-Press) en dispositivos táctiles y escritorio,
 * con soporte para vibración háptica suave.
 *
 * @param {Function} onLongPress Callback al completar la pulsación larga
 * @param {Function} onClick Callback cuando es un toque/clic normal
 * @param {Object} options Configuración ({ delay: 450, moveThreshold: 10 })
 */
export function useLongPress(onLongPress, onClick, { delay = 450, moveThreshold = 10 } = {}) {
  const timeoutRef = useRef(null);
  const isLongPressRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (event) => {
      // Solo botón izquierdo en ratón
      if (event.type === 'mousedown' && event.button !== 0) return;

      isLongPressRef.current = false;
      hasMovedRef.current = false;
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      startPosRef.current = { x: clientX, y: clientY };

      timeoutRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        // Vibración háptica en dispositivos móviles compatibles
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
            // Ignorar errores de políticas del navegador
          }
        }
        if (onLongPress) {
          onLongPress(event);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback(
    (event) => {
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      const diffX = Math.abs(clientX - startPosRef.current.x);
      const diffY = Math.abs(clientY - startPosRef.current.y);

      // Si el usuario se desplaza (scroll), cancelamos el long-press y marcamos que hubo movimiento
      if (diffX > moveThreshold || diffY > moveThreshold) {
        hasMovedRef.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    },
    [moveThreshold]
  );

  const clear = useCallback(
    (event, shouldTriggerClick = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Solo disparar click si fue un toque limpio sin desplazamiento de scroll ni pulsación larga
      if (shouldTriggerClick && !isLongPressRef.current && !hasMovedRef.current && onClick) {
        onClick(event);
      }
      isLongPressRef.current = false;
    },
    [onClick]
  );

  return {
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: (e) => clear(e, true),
    onMouseLeave: (e) => clear(e, false),
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: (e) => clear(e, true),
    onContextMenu: (e) => {
      if (isLongPressRef.current) {
        e.preventDefault();
      }
    },
  };
}
