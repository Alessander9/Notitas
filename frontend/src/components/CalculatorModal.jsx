import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Calculate as CalcIcon,
  ContentPaste as PasteIcon,
  Backspace as BackspaceIcon,
  History as HistoryIcon,
  DeleteOutline as ClearHistoryIcon,
} from '@mui/icons-material';

export default function CalculatorModal({ open, onClose, onInsertText }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleDigit = (digit) => {
    setDisplay((prev) => (prev === '0' ? String(digit) : prev + digit));
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay((prev) => prev + '.');
    }
  };

  const handleOperator = (op) => {
    setEquation(`${display} ${op} `);
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const calculate = () => {
    try {
      const fullExpr = `${equation}${display}`;
      // Sanitizar expresión para evaluar de forma segura
      const sanitized = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/[^0-9+\-*/().]/g, '');

      if (!sanitized) return;

      // Evaluación matemática segura
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${sanitized})`)();
      const formattedResult = Number.isFinite(result)
        ? String(Math.round(result * 100000000) / 100000000)
        : 'Error';

      setHistory((prev) => [{ expr: fullExpr, res: formattedResult }, ...prev.slice(0, 9)]);
      setDisplay(formattedResult);
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  const handlePercent = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      setDisplay(String(num / 100));
    }
  };

  const handleSign = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      setDisplay(String(-num));
    }
  };

  const handleInsertResult = () => {
    onInsertText(display);
    onClose();
  };

  const handleInsertFull = () => {
    const last = history[0];
    const text = last ? `${last.expr} = ${last.res}` : display;
    onInsertText(text);
    onClose();
  };

  const calcButtons = [
    { label: 'C', action: handleClear, color: 'error.main', bgcolor: 'error.light' },
    { label: '±', action: handleSign, color: 'text.primary' },
    { label: '%', action: handlePercent, color: 'text.primary' },
    { label: '÷', action: () => handleOperator('÷'), color: 'primary.main', fontWeight: 700 },

    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '×', action: () => handleOperator('×'), color: 'primary.main', fontWeight: 700 },

    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '−', action: () => handleOperator('−'), color: 'primary.main', fontWeight: 700 },

    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '+', action: () => handleOperator('+'), color: 'primary.main', fontWeight: 700 },

    { label: '0', action: () => handleDigit('0'), flex: 2 },
    { label: '.', action: handleDecimal },
    { label: '=', action: calculate, color: '#fff', bgcolor: 'primary.main', fontWeight: 700 },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
            <CalcIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Calculadora Integrada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Calcula y pega cifras directamente en tu nota
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={showHistory ? 'Ocultar historial' : 'Ver historial'}>
            <IconButton
              size="small"
              onClick={() => setShowHistory(!showHistory)}
              color={showHistory ? 'primary' : 'default'}
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', ml: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
        {/* Pantalla display de la calculadora */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'right',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ minHeight: 18, fontSize: '0.8rem' }}>
            {equation}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <IconButton size="small" onClick={handleBackspace} sx={{ p: 0.5, opacity: 0.7 }}>
              <BackspaceIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 1, fontFamily: 'monospace' }}>
              {display}
            </Typography>
          </Box>
        </Paper>

        {/* Panel de Historial Desplegable */}
        {showHistory && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'primary.main',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main">
                Historial reciente:
              </Typography>
              {history.length > 0 && (
                <IconButton size="small" onClick={() => setHistory([])} sx={{ p: 0.2 }}>
                  <ClearHistoryIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
            {history.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Sin cálculos previos
              </Typography>
            ) : (
              history.map((h, i) => (
                <Box
                  key={i}
                  onClick={() => setDisplay(h.res)}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 0.3,
                    px: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {h.expr} =
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {h.res}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        )}

        {/* Teclado numérico */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {calcButtons.map((b, i) => (
            <Button
              key={i}
              onClick={b.action}
              variant="outlined"
              sx={{
                gridColumn: b.flex ? `span ${b.flex}` : 'span 1',
                height: 48,
                borderRadius: 2.5,
                fontSize: '1.1rem',
                fontWeight: b.fontWeight || 600,
                color: b.color || 'text.primary',
                bgcolor: b.bgcolor || 'background.paper',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: b.bgcolor ? b.bgcolor : 'action.hover',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                },
                transition: 'all 0.15s ease',
              }}
            >
              {b.label}
            </Button>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cerrar
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleInsertFull}
            startIcon={<PasteIcon />}
            sx={{ borderRadius: 2.5, fontWeight: 600 }}
          >
            Pegar Operación
          </Button>
          <Button
            variant="contained"
            onClick={handleInsertResult}
            startIcon={<PasteIcon />}
            sx={{
              borderRadius: 2.5,
              px: 2.5,
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(56, 108, 95, 0.3)',
            }}
          >
            Pegar Resultado ({display})
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
