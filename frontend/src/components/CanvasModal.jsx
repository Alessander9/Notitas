import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  ButtonGroup,
  Slider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Brush as BrushIcon,
  CropDin as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  ArrowRightAlt as ArrowIcon,
  HorizontalRule as LineIcon,
  TextFields as TextIcon,
  FormatColorFill as FillIcon,
  DeleteOutline as ClearIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Check as InsertIcon,
  Gesture as DrawIcon,
} from '@mui/icons-material';

const COLOR_PALETTE = [
  '#386c5f',
  '#2d3748',
  '#e53e3e',
  '#dd6b20',
  '#d69e2e',
  '#319795',
  '#3182ce',
  '#805ad5',
  '#d53f8c',
  '#ffffff',
];

export default function CanvasModal({ open, onClose, onInsertImage }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('brush'); // 'brush' | 'rect' | 'circle' | 'line' | 'arrow' | 'text'
  const [color, setColor] = useState('#386c5f');
  const [fill, setFill] = useState(false);
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [redoList, setRedoList] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState(null);

  // Inicializar canvas
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        setRedoList([]);
      }, 50);
    }
  }, [open]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setRedoList([]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const newHistory = [...history];
    const popped = newHistory.pop();
    setRedoList((prev) => [popped, ...prev]);
    setHistory(newHistory);
    ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
  };

  const handleRedo = () => {
    if (redoList.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const [next, ...restRedo] = redoList;
    setRedoList(restRedo);
    setHistory((prev) => [...prev, next]);
    ctx.putImageData(next, 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (tool === 'text') {
      const text = window.prompt('Introduce el texto para el boceto:');
      if (text) {
        ctx.font = `${Math.max(14, lineWidth * 5)}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(text, pos.x, pos.y);
        saveToHistory();
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'brush') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      ctx.putImageData(snapshot, 0, 0);

      if (tool === 'rect') {
        const width = pos.x - startPos.x;
        const height = pos.y - startPos.y;
        if (fill) {
          ctx.fillRect(startPos.x, startPos.y, width, height);
        }
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        if (fill) ctx.fill();
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        // Cabeza de flecha
        const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
        const headlen = Math.max(10, lineWidth * 3);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headlen * Math.cos(angle - Math.PI / 6), pos.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headlen * Math.cos(angle + Math.PI / 6), pos.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory();
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onInsertImage(dataUrl);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0.5,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(56, 108, 95, 0.3)',
            }}
          >
            <DrawIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Pizarra de Bocetos & Diagramas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dibuja diagramas, bocetos o ideas y guárdalos como imagen en tu nota
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
        {/* Barra de herramientas de dibujo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            p: 1,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Herramientas de forma */}
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Trazo libre (Lápiz)">
              <IconButton
                size="small"
                onClick={() => setTool('brush')}
                color={tool === 'brush' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'brush' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <BrushIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rectángulo">
              <IconButton
                size="small"
                onClick={() => setTool('rect')}
                color={tool === 'rect' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'rect' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <RectangleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Círculo">
              <IconButton
                size="small"
                onClick={() => setTool('circle')}
                color={tool === 'circle' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'circle' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <CircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Línea">
              <IconButton
                size="small"
                onClick={() => setTool('line')}
                color={tool === 'line' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'line' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <LineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Flecha">
              <IconButton
                size="small"
                onClick={() => setTool('arrow')}
                color={tool === 'arrow' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'arrow' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <ArrowIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Texto">
              <IconButton
                size="small"
                onClick={() => setTool('text')}
                color={tool === 'text' ? 'primary' : 'default'}
                sx={{ bgcolor: tool === 'text' ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <TextIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Relleno toggle */}
          {(tool === 'rect' || tool === 'circle') && (
            <Tooltip title={fill ? 'Relleno activado' : 'Solo contorno'}>
              <IconButton
                size="small"
                onClick={() => setFill(!fill)}
                color={fill ? 'primary' : 'default'}
                sx={{ bgcolor: fill ? 'primary.main' + '20' : 'transparent', borderRadius: 1.5 }}
              >
                <FillIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Paleta de colores */}
          <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
            {COLOR_PALETTE.map((c) => (
              <Box
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: color === c ? 'primary.main' : 'divider',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: color === c ? '0 0 0 2px rgba(56,108,95,0.4)' : 'none',
                }}
              />
            ))}
          </Box>

          {/* Grosor de trazo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 120 }}>
            <Typography variant="caption" color="text.secondary">
              Grosor:
            </Typography>
            <Slider
              size="small"
              value={lineWidth}
              min={1}
              max={15}
              onChange={(_, val) => setLineWidth(val)}
              sx={{ color: 'primary.main' }}
            />
          </Box>

          {/* Deshacer / Rehacer / Limpiar */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Deshacer (Ctrl+Z)">
              <span>
                <IconButton size="small" onClick={handleUndo} disabled={history.length <= 1}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Rehacer (Ctrl+Y)">
              <span>
                <IconButton size="small" onClick={handleRedo} disabled={redoList.length === 0}>
                  <RedoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Limpiar lienzo">
              <IconButton size="small" onClick={handleClear} color="error">
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Lienzo Canvas */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            bgcolor: '#e2e8f0',
            p: 1,
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={760}
            height={440}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              cursor: tool === 'text' ? 'text' : 'crosshair',
              maxWidth: '100%',
              height: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              touchAction: 'none',
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<InsertIcon />}
          onClick={handleInsert}
          sx={{
            borderRadius: 2.5,
            px: 3,
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
          }}
        >
          Incrustar en Nota
        </Button>
      </DialogActions>
    </Dialog>
  );
}
