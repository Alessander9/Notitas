import { useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Hook para efecto 2.5D micro-tilt acotado al hover de tarjetas.
 * No requiere librerías externas y se desactiva suavemente al salir el cursor.
 */
export function useTiltHover(max = 2.5) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), {
    stiffness: 220,
    damping: 18,
  });

  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), {
    stiffness: 220,
    damping: 18,
  });

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
}
