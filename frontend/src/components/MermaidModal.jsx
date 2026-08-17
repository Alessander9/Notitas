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
  TextField,
  Chip,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccountTree as MermaidIcon,
  Check as InsertIcon,
} from '@mui/icons-material';

const PRESETS = [
  {
    name: 'Flujo Simple',
    code: `graph TD
  A[Inicio] --> B{¿Es válido?}
  B -->|Sí| C[Procesar datos]
  B -->|No| D[Mostrar error]
  C --> E[Fin]`,
  },
  {
    name: 'Secuencia',
    code: `sequenceDiagram
  autonumber
  actor Usuario
  participant App as Frontend
  participant API as Backend
  Usuario->>App: Clic en Enviar
  App->>API: POST /api/notes
  API-->>App: 201 Creado
  App-->>Usuario: Notificación de éxito`,
  },
  {
    name: 'Arquitectura',
    code: `graph LR
  Cliente[Cliente Web] --> CDN[Vercel CDN]
  CDN --> API[Node.js Express]
  API --> DB[(PostgreSQL)]
  API --> Storage[Cloudinary]`,
  },
];

export default function MermaidModal({ open, onClose, onInsertDiagram }) {
  const [code, setCode] = useState(PRESETS[0].code);

  const handleApplyPreset = (presetCode) => {
    setCode(presetCode);
  };

  const handleInsert = () => {
    if (!code.trim()) return;

    // Generar URL de renderizado vectorial SVG usando Mermaid.ink
    try {
      const cleanCode = code.trim();
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ code: cleanCode, mermaid: { theme: 'default' } }))));
      const imageUrl = `https://mermaid.ink/svg/${encoded}`;

      onInsertDiagram(imageUrl, cleanCode);
      onClose();
    } catch {
      // Fallback simple base64
      const b64 = btoa(unescape(encodeURIComponent(code.trim())));
      onInsertDiagram(`https://mermaid.ink/svg/${b64}`, code.trim());
      onClose();
    }
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
              bgcolor: '#845EC2',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(132, 94, 194, 0.3)',
            }}
          >
            <MermaidIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Diagramas Mermaid.js
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Escribe diagramas de flujo, secuencia o arquitectura e incrusta el gráfico en tu nota
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {/* Presets de Diagramas */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Ejemplos:
          </Typography>
          {PRESETS.map((p) => (
            <Chip
              key={p.name}
              label={p.name}
              size="small"
              onClick={() => handleApplyPreset(p.code)}
              sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem' }}
            />
          ))}
        </Box>

        {/* Editor de código Mermaid */}
        <TextField
          multiline
          rows={8}
          fullWidth
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Escribe tu sintaxis Mermaid aquí..."
          InputProps={{
            sx: {
              fontFamily: 'monospace',
              fontSize: '0.86rem',
              bgcolor: 'action.hover',
              borderRadius: 2.5,
            },
          }}
        />

        {/* Vista previa simplificada */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px dashed',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            El diagrama se renderizará e incrustará como gráfico vectorial SVG nítido y exportable.
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<InsertIcon />}
          onClick={handleInsert}
          disabled={!code.trim()}
          sx={{
            borderRadius: 2.5,
            px: 3,
            fontWeight: 700,
            bgcolor: '#845EC2',
            '&:hover': { bgcolor: '#6d4aff' },
            boxShadow: '0 4px 14px rgba(132, 94, 194, 0.3)',
          }}
        >
          Incrustar Diagrama
        </Button>
      </DialogActions>
    </Dialog>
  );
}
