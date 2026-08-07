import React, { useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

const MIN_WIDTH = 80;
const MAX_WIDTH = 1400;
const HANDLE_ZONE = 18; // área alrededor de la esquina donde el clic redimensiona

/**
 * NodeView para las imágenes de las notas:
 * - Arrastrar con total libertad dentro del lienzo (posición absoluta).
 *   Si la imagen está en línea con el texto, el primer arrastre la libera
 *   y la ancla en su posición actual.
 * - Redimensionar desde la esquina manteniendo las proporciones (solo
 *   cambia el ancho; el alto se deriva del ratio).
 * La posición/el tamaño se persisten como atributos del nodo (HTML).
 */
export default function FloatingImageNodeView({ node, updateAttributes, selected, editor, getPos }) {
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const handlersRef = useRef(null);

  const { src, alt, alignment, width, left, top } = node.attrs || {};
  const isFloating = left != null && top != null;

  const container = editor?.view?.dom || null;

  // Estira el alto del lienzo para que la imagen arrastrada no quede cortada
  const bumpCanvas = (imgEl) => {
    if (!container || !imgEl) return;
    const cRect = container.getBoundingClientRect();
    const iRect = imgEl.getBoundingClientRect();
    const bottom = iRect.bottom - cRect.top;
    const current = parseFloat(container.style.minHeight) || 400;
    if (bottom + 48 > current) {
      container.style.minHeight = `${Math.ceil(bottom + 48)}px`;
    }
  };

  // Convierte una imagen en línea en flotante, anclada en su posición actual
  const floatAtCurrentPosition = (imgEl) => {
    if (!container || !imgEl) return null;
    const cRect = container.getBoundingClientRect();
    const iRect = imgEl.getBoundingClientRect();
    const naturalW = imgEl.naturalWidth || iRect.width;
    const naturalH = imgEl.naturalHeight || iRect.height;
    const attrs = {
      left: Math.max(0, Math.round(iRect.left - cRect.left)),
      top: Math.round(iRect.top - cRect.top),
      width: Math.round(iRect.width),
      ratio: naturalW > 0 ? naturalH / naturalW : null,
    };
    imgEl.style.position = 'absolute';
    imgEl.style.left = `${attrs.left}px`;
    imgEl.style.top = `${attrs.top}px`;
    imgEl.style.width = `${attrs.width}px`;
    imgEl.style.margin = '0';
    imgEl.classList.remove('align-left', 'align-center', 'align-right');
    return attrs;
  };

  const endDrag = () => {
    const h = handlersRef.current;
    if (h) {
      window.removeEventListener('pointermove', h.move);
      window.removeEventListener('pointerup', h.up);
    }
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    // Restaura el scroll táctil de la página sobre la imagen
    d.img.style.touchAction = '';
    if (d.mode === 'resize') {
      updateAttributes({ width: Math.round(d.img.offsetWidth) });
    } else {
      updateAttributes({
        left: Math.round(parseFloat(d.img.style.left) || 0),
        top: Math.round(parseFloat(d.img.style.top) || 0),
      });
    }
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === 'resize') {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, d.startWidth + (e.clientX - d.startX)));
      d.img.style.width = `${Math.round(newWidth)}px`;
    } else {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const maxLeft = Math.max(0, d.containerWidth - d.img.offsetWidth);
      d.img.style.left = `${Math.min(Math.max(0, d.startLeft + dx), maxLeft)}px`;
      d.img.style.top = `${Math.max(0, d.startTop + dy)}px`;
    }
    bumpCanvas(d.img);
  };

  const handlePointerUp = () => {
    endDrag();
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const img = imgRef.current;
    if (!img || !editor) return;

    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos != null) editor.commands.setNodeSelection(pos);

    // El asa visible sobresale un poco de la esquina: se detecta por distancia
    // al vértice (cubre tanto el interior como el exterior de la imagen).
    const iRect = img.getBoundingClientRect();
    const nearCorner =
      Math.abs(e.clientX - iRect.right) < HANDLE_ZONE && Math.abs(e.clientY - iRect.bottom) < HANDLE_ZONE;

    // Desactiva el scroll táctil de la página mientras se arrastra/redimensiona
    img.style.touchAction = 'none';

    if (nearCorner) {
      // Redimensionar desde la esquina (mantiene proporciones: solo ancho)
      e.preventDefault();
      dragRef.current = {
        mode: 'resize',
        startX: e.clientX,
        startWidth: img.offsetWidth || parseInt(width, 10) || 400,
        img,
      };
      handlersRef.current = { move: handlePointerMove, up: handlePointerUp };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return;
    }

    // Arrastrar para mover con total libertad
    e.preventDefault();
    let attrs = { ...node.attrs };
    if (!isFloating) {
      attrs = { ...attrs, ...floatAtCurrentPosition(img) };
      updateAttributes(attrs);
    }
    const cRect = container?.getBoundingClientRect();
    dragRef.current = {
      mode: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      startLeft: attrs.left,
      startTop: attrs.top,
      containerWidth: cRect?.width || 0,
      img,
    };
    handlersRef.current = { move: handlePointerMove, up: handlePointerUp };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Limpieza si el componente se desmonta a mitad de arrastre
  useEffect(() => {
    return () => {
      const h = handlersRef.current;
      if (h) {
        window.removeEventListener('pointermove', h.move);
        window.removeEventListener('pointerup', h.up);
      }
    };
  }, []);

  const className = [
    'notitas-float-img',
    !isFloating && alignment && alignment !== 'center' ? `align-${alignment}` : '',
  ].filter(Boolean).join(' ');

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      draggable={false}
      className={`notitas-image-wrap${selected ? ' notitas-image-selected' : ''}`}
      style={{ display: 'contents' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        draggable={false}
        onPointerDown={handlePointerDown}
        className={className}
        data-notitas-float={isFloating || undefined}
        style={{
          position: isFloating ? 'absolute' : undefined,
          left: isFloating ? `${left}px` : undefined,
          top: isFloating ? `${top}px` : undefined,
          width: width != null ? `${width}px` : undefined,
          margin: isFloating ? '0' : undefined,
          cursor: isFloating ? 'move' : 'grab',
          zIndex: isFloating ? 2 : undefined,
          borderRadius: 8,
          maxWidth: '100%',
          userSelect: 'none',
        }}
      />
    </NodeViewWrapper>
  );
}
