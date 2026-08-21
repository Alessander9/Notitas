import React, { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AspectRatio as AspectRatioIcon,
  Check as CheckIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
} from '@mui/icons-material';

const MIN_WIDTH = 80;
const MAX_WIDTH = 1400;
const HANDLE_ZONE = 18; // área alrededor de la esquina donde el clic redimensiona
const LONG_PRESS_MS = 450;
const TOUCH_MOVE_THRESHOLD = 8;

/**
 * NodeView para las imágenes de las notas:
 * - Arrastrar con total libertad dentro del lienzo (posición absoluta).
 *   Si la imagen está en línea con el texto, el primer arrastre la libera
 *   y la ancla en su posición actual.
 * - Redimensionar desde la esquina manteniendo las proporciones (solo
 *   cambia el ancho; el alto se deriva del ratio).
 * - Menú flotante con opciones de redimensionar y borrar.
 * La posición/el tamaño se persisten como atributos del nodo (HTML).
 */
export default function FloatingImageNodeView({ node, updateAttributes, selected, editor, getPos }) {
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const handlersRef = useRef(null);
  const pendingTouchRef = useRef(null);
  const pendingHandlersRef = useRef(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [customWidth, setCustomWidth] = useState('');

  const { src, alt, alignment, width, left, top } = node.attrs || {};
  const isFloating = left != null && top != null;

  const container = editor?.view?.dom || null;

  // Mostrar toolbar cuando se selecciona la imagen
  useEffect(() => {
    if (selected) {
      setShowToolbar(true);
      setCustomWidth(width ? String(width) : '');
    } else {
      setShowToolbar(false);
    }
  }, [selected, width]);

  // Limpieza al desmontar el componente si estaba en pleno arrastre
  useEffect(() => {
    return () => {
      cancelPendingTouch();
      if (handlersRef.current) {
        window.removeEventListener('pointermove', handlersRef.current.move);
        window.removeEventListener('pointerup', handlersRef.current.up);
        window.removeEventListener('pointercancel', handlersRef.current.cancel);
        handlersRef.current = null;
      }
    };
  }, []);

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

  const removePendingTouchListeners = () => {
    const h = pendingHandlersRef.current;
    if (!h) return;
    window.removeEventListener('pointermove', h.move);
    window.removeEventListener('pointerup', h.up);
    window.removeEventListener('pointercancel', h.cancel);
    pendingHandlersRef.current = null;
  };

  const cancelPendingTouch = () => {
    const pending = pendingTouchRef.current;
    if (pending?.timer) clearTimeout(pending.timer);
    pendingTouchRef.current = null;
    removePendingTouchListeners();
  };

  const endDrag = (event) => {
    const h = handlersRef.current;
    if (h) {
      window.removeEventListener('pointermove', h.move);
      window.removeEventListener('pointerup', h.up);
      window.removeEventListener('pointercancel', h.cancel);
    }
    handlersRef.current = null;
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    // Restaura el scroll táctil de la página sobre la imagen
    d.img.style.touchAction = '';
    if (event && d.pointerId != null && d.img.hasPointerCapture?.(d.pointerId)) {
      d.img.releasePointerCapture(d.pointerId);
    }
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
    if (d.pointerId != null && e.pointerId !== d.pointerId) return;
    e.preventDefault();
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

  const handlePointerUp = (e) => {
    endDrag(e);
  };

  const beginDrag = ({ pointerId, startX, startY, img, attrs }) => {
    const cRect = container?.getBoundingClientRect();
    if (!img || !attrs || !cRect) return;

    cancelPendingTouch();
    img.style.touchAction = 'none';
    try {
      img.setPointerCapture?.(pointerId);
    } catch {
      // Algunos navegadores no permiten capturar el puntero tras un long press.
    }

    dragRef.current = {
      mode: 'drag',
      pointerId,
      startX,
      startY,
      startLeft: Number(attrs.left) || 0,
      startTop: Number(attrs.top) || 0,
      containerWidth: cRect.width,
      img,
    };
    const handlers = {
      move: handlePointerMove,
      up: handlePointerUp,
      cancel: handlePointerUp,
    };
    handlersRef.current = handlers;
    window.addEventListener('pointermove', handlers.move, { passive: false });
    window.addEventListener('pointerup', handlers.up);
    window.addEventListener('pointercancel', handlers.cancel);
  };

  const beginResize = ({ pointerId, startX, img }) => {
    cancelPendingTouch();
    img.style.touchAction = 'none';
    try {
      img.setPointerCapture?.(pointerId);
    } catch {
      // Ignore unsupported pointer capture.
    }
    dragRef.current = {
      mode: 'resize',
      pointerId,
      startX,
      startWidth: img.offsetWidth || parseInt(width, 10) || 400,
      img,
    };
    const handlers = {
      move: handlePointerMove,
      up: handlePointerUp,
      cancel: handlePointerUp,
    };
    handlersRef.current = handlers;
    window.addEventListener('pointermove', handlers.move, { passive: false });
    window.addEventListener('pointerup', handlers.up);
    window.addEventListener('pointercancel', handlers.cancel);
  };

  const activateTouchDrag = (pending) => {
    const img = imgRef.current;
    if (!img || !editor) return;

    let attrs = { ...node.attrs };
    if (!isFloating) {
      const floated = floatAtCurrentPosition(img);
      if (!floated) return;
      attrs = { ...attrs, ...floated };
      updateAttributes(attrs);
    }

    beginDrag({
      pointerId: pending.pointerId,
      startX: pending.startX,
      startY: pending.startY,
      img,
      attrs,
    });
  };

  const handlePendingTouchMove = (e) => {
    const pending = pendingTouchRef.current;
    if (!pending || e.pointerId !== pending.pointerId) return;
    const distance = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
    if (distance > TOUCH_MOVE_THRESHOLD) cancelPendingTouch();
  };

  const handlePendingTouchUp = (e) => {
    if (pendingTouchRef.current?.pointerId === e.pointerId) cancelPendingTouch();
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const img = imgRef.current;
    if (!img || !editor) return;

    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos != null) editor.commands.setNodeSelection(pos);

    // El asa visible sobresale un poco de la esquina: se detecta por distancia
    // al vértice (cubre tanto el interior como el exterior de la imagen).
    const iRect = img.getBoundingClientRect();
    const nearCorner =
      Math.abs(e.clientX - iRect.right) < HANDLE_ZONE && Math.abs(e.clientY - iRect.bottom) < HANDLE_ZONE;

    if (nearCorner && e.pointerType !== 'touch') {
      // Redimensionar desde la esquina (mantiene proporciones: solo ancho)
      e.preventDefault();
      beginResize({ pointerId: e.pointerId, startX: e.clientX, img });
      return;
    }

    // En móvil, un toque corto conserva el scroll y la selección. Solo un
    // long press inicia el movimiento para no secuestrar el gesto de scroll.
    if (e.pointerType === 'touch') {
      cancelPendingTouch();
      const pending = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        timer: setTimeout(() => {
          const current = pendingTouchRef.current;
          if (current?.pointerId === e.pointerId) {
            activateTouchDrag(current);
          }
        }, LONG_PRESS_MS),
      };
      pendingTouchRef.current = pending;
      const handlers = {
        move: handlePendingTouchMove,
        up: handlePendingTouchUp,
        cancel: handlePendingTouchUp,
      };
      pendingHandlersRef.current = handlers;
      window.addEventListener('pointermove', handlers.move);
      window.addEventListener('pointerup', handlers.up);
      window.addEventListener('pointercancel', handlers.cancel);
      return;
    }

    // Arrastrar para mover con total libertad
    e.preventDefault();
    let attrs = { ...node.attrs };
    if (!isFloating) {
      attrs = { ...attrs, ...floatAtCurrentPosition(img) };
      updateAttributes(attrs);
    }
    beginDrag({
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      img,
      attrs,
    });
  };

  // Limpieza si el componente se desmonta a mitad de arrastre
  useEffect(() => {
    return () => {
      const h = handlersRef.current;
      if (h) {
        window.removeEventListener('pointermove', h.move);
        window.removeEventListener('pointerup', h.up);
        window.removeEventListener('pointercancel', h.cancel);
      }
      cancelPendingTouch();
    };
  }, []);

  // Handlers para el toolbar
  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (pos != null) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
    }
  };

  const handleResize = (newWidth) => {
    if (newWidth === null || newWidth === '') {
      updateAttributes({ width: null });
    } else {
      const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(newWidth, 10)));
      if (Number.isFinite(w)) {
        updateAttributes({ width: w });
      }
    }
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const currentWidth = width || imgRef.current?.offsetWidth || 400;
    const newWidth = Math.min(MAX_WIDTH, currentWidth + 50);
    updateAttributes({ width: newWidth });
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const currentWidth = width || imgRef.current?.offsetWidth || 400;
    const newWidth = Math.max(MIN_WIDTH, currentWidth - 50);
    updateAttributes({ width: newWidth });
  };

  const handleApplyWidth = (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleResize(customWidth);
  };

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
           // El gesto empieza permitiendo scroll. Tras el long press se cambia
           // a none para que el movimiento de la imagen sea libre.
           touchAction: 'pan-y',
         }}
      />
      
      {/* Toolbar flotante cuando la imagen está seleccionada */}
      {selected && showToolbar && (
        <Box
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: -48,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0.5,
            bgcolor: 'rgba(15, 15, 35, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 100,
            animation: 'fadeInUp 0.15s ease-out',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
              to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
            },
          }}
        >
          {/* Zoom out */}
          <Tooltip title="Reducir tamaño">
            <IconButton
              size="small"
              onClick={handleZoomOut}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <ZoomOutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Input de ancho */}
          <TextField
            size="small"
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyWidth(e)}
            placeholder="px"
            sx={{
              width: 60,
              '& .MuiOutlinedInput-root': {
                height: 28,
                fontSize: '0.75rem',
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#386c5f' },
              },
              '& .MuiOutlinedInput-input': {
                p: '4px 8px',
                textAlign: 'center',
              },
            }}
          />
          
          {/* Apply width */}
          <Tooltip title="Aplicar ancho">
            <IconButton
              size="small"
              onClick={handleApplyWidth}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(56, 108, 95, 0.5)' } }}
            >
              <CheckIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {/* Zoom in */}
          <Tooltip title="Aumentar tamaño">
            <IconButton
              size="small"
              onClick={handleZoomIn}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <ZoomInIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 0.25 }} />

          {/* Presets de tamaño */}
          <Tooltip title="Tamaño pequeño (200px)">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResize(200); }}
              sx={{ color: '#fff', p: 0.5, fontSize: '0.65rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600 }}>S</Typography>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Tamaño mediano (400px)">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResize(400); }}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600 }}>M</Typography>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Tamaño grande (600px)">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResize(600); }}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600 }}>L</Typography>
            </IconButton>
          </Tooltip>

          <Tooltip title="Tamaño original">
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleResize(null); }}
              sx={{ color: '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <AspectRatioIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 0.25 }} />

          {/* Alineación (solo si no es flotante) */}
          {!isFloating && (
            <>
              <Tooltip title="Alinear a la izquierda">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); updateAttributes({ alignment: 'left' }); }}
                  sx={{ color: alignment === 'left' ? 'primary.main' : '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <AlignLeftIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Centrar">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); updateAttributes({ alignment: 'center' }); }}
                  sx={{ color: (!alignment || alignment === 'center') ? 'primary.main' : '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <AlignCenterIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Alinear a la derecha">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); updateAttributes({ alignment: 'right' }); }}
                  sx={{ color: alignment === 'right' ? 'primary.main' : '#fff', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <AlignRightIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 0.25 }} />
            </>
          )}

          {/* Eliminar imagen */}
          <Tooltip title="Eliminar imagen">
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                color: '#ff6b6b',
                p: 0.5,
                '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.25)' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Asa de redimensionamiento visible cuando la imagen está seleccionada */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            right: -8,
            bottom: -8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#386c5f',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            cursor: 'nwse-resize',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
