import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import { useUiStore } from '../store/uiStore';
import {
  Title as H1Icon,
  FormatSize as H2Icon,
  FormatColorText as H3Icon,
  CheckCircleOutline as TaskIcon,
  FormatListBulleted as BulletIcon,
  FormatListNumbered as NumberIcon,
  FormatQuote as QuoteIcon,
  Code as CodeIcon,
  TableChart as TableIcon,
  HorizontalRule as DividerIcon,
  Animation as MediaIcon,
  AutoAwesome as TemplateIcon,
  Gesture as DrawIcon,
  Calculate as CalcIcon,
} from '@mui/icons-material';

const SLASH_COMMANDS = [
  {
    id: 'h1',
    label: 'Encabezado 1',
    description: 'Título de sección principal',
    icon: <H1Icon sx={{ fontSize: 20 }} />,
    aliases: ['h1', 'titulo', 'header', 'encabezado'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Encabezado 2',
    description: 'Título de sección secundaria',
    icon: <H2Icon sx={{ fontSize: 20 }} />,
    aliases: ['h2', 'subtitulo', 'header2'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Encabezado 3',
    description: 'Subsección pequeña',
    icon: <H3Icon sx={{ fontSize: 20 }} />,
    aliases: ['h3', 'subencabezado', 'header3'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'task',
    label: 'Lista de Tareas',
    description: 'Casillas de verificación interactivas',
    icon: <TaskIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
    aliases: ['task', 'tarea', 'todo', 'checklist', 'check'],
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'bullet',
    label: 'Lista con Viñetas',
    description: 'Lista de puntos sencilla',
    icon: <BulletIcon sx={{ fontSize: 20 }} />,
    aliases: ['bullet', 'lista', 'puntos', 'ul'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'number',
    label: 'Lista Numerada',
    description: 'Lista ordenada paso a paso',
    icon: <NumberIcon sx={{ fontSize: 20 }} />,
    aliases: ['number', 'numerada', 'ordenada', 'ol'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'table',
    label: 'Tabla',
    description: 'Insertar tabla de 3x3',
    icon: <TableIcon sx={{ fontSize: 20 }} />,
    aliases: ['table', 'tabla', 'cuadricula', 'grid'],
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'quote',
    label: 'Cita Destacada',
    description: 'Bloque de cita o llamada',
    icon: <QuoteIcon sx={{ fontSize: 20 }} />,
    aliases: ['quote', 'cita', 'bloque'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Bloque de Código',
    description: 'Fragmento de código monoespaciado',
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    aliases: ['code', 'codigo', 'snippet'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: 'Línea Separadora',
    description: 'Divisor horizontal de contenido',
    icon: <DividerIcon sx={{ fontSize: 20 }} />,
    aliases: ['divider', 'divisor', 'linea', 'separador', 'hr'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'media',
    label: 'Imagen / GIF animado',
    description: 'Abrir selector multimedia (GIPHY / Unsplash / Subida)',
    icon: <MediaIcon sx={{ fontSize: 20, color: '#e91e63' }} />,
    aliases: ['image', 'imagen', 'gif', 'foto', 'media', 'giphy'],
    customAction: 'openMediaPicker',
  },
  {
    id: 'ai',
    label: 'CleoBot',
    description: 'Consultar o generar texto con Inteligencia Artificial',
    icon: <TemplateIcon sx={{ fontSize: 20, color: '#386c5f' }} />,
    aliases: ['ai', 'ia', 'inteligencia', 'generar', 'asistente', 'gpt', 'bot'],
    customAction: 'openAi',
  },
  {
    id: 'template',
    label: 'Plantillas',
    description: 'Insertar estructura prediseñada',
    icon: <TemplateIcon sx={{ fontSize: 20, color: '#f39c12' }} />,
    aliases: ['template', 'plantilla', 'estructura', 'modelo'],
    customAction: 'openTemplates',
  },
  {
    id: 'canvas',
    label: 'Pizarra de Dibujo / Canvas',
    description: 'Crear diagrama o boceto vectorial e incrustar imagen',
    icon: <DrawIcon sx={{ fontSize: 20, color: '#0ea5e9' }} />,
    aliases: ['canvas', 'draw', 'dibujo', 'pizarra', 'boceto', 'diagrama', 'excalidraw'],
    customAction: 'openCanvas',
  },
  {
    id: 'calc',
    label: 'Calculadora Integrada',
    description: 'Calcular operaciones matemáticas y pegar cifras',
    icon: <CalcIcon sx={{ fontSize: 20, color: '#10b981' }} />,
    aliases: ['calc', 'calculadora', 'cuenta', 'math', 'calcular', 'numero'],
    customAction: 'openCalculator',
  },
];

export default function SlashCommandsMenu({
  editor,
  open,
  anchorPosition,
  query = '',
  onClose,
  onOpenMediaPicker,
  onOpenTemplates,
  onOpenAi,
  onOpenCanvas,
  onOpenCalculator,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  const cleanQuery = query.toLowerCase().replace('/', '').trim();

  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.label.toLowerCase().includes(cleanQuery) ||
      cmd.description.toLowerCase().includes(cleanQuery) ||
      cmd.aliases.some((alias) => alias.includes(cleanQuery))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  const executeCommand = useCallback((cmd) => {
    if (!editor || !cmd) return;

    // Delete the slash query text from editor
    const { from } = editor.state.selection;
    const lineStart = Math.max(0, from - query.length);
    editor.chain().focus().deleteRange({ from: lineStart, to: from }).run();

    if (cmd.customAction === 'openMediaPicker') {
      onOpenMediaPicker?.();
    } else if (cmd.customAction === 'openTemplates') {
      onOpenTemplates?.();
    } else if (cmd.customAction === 'openCanvas') {
      onOpenCanvas?.();
    } else if (cmd.customAction === 'openCalculator') {
      onOpenCalculator?.();
    } else if (cmd.customAction === 'openAi') {
      if (onOpenAi) onOpenAi();
      else useUiStore.getState().setAiDrawerOpen(true);
    } else if (cmd.action) {
      cmd.action(editor);
    }
    onClose();
  }, [editor, query, onOpenMediaPicker, onOpenTemplates, onOpenAi, onOpenCanvas, onOpenCalculator, onClose]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, filteredCommands, selectedIndex, editor, executeCommand, onClose]);

  if (!open || filteredCommands.length === 0) return null;

  return (
    <Paper
      ref={menuRef}
      elevation={8}
      sx={{
        position: 'fixed',
        left: Math.max(20, Math.min(window.innerWidth - 320, anchorPosition?.x || 100)),
        top: Math.min(window.innerHeight - 340, (anchorPosition?.y || 200) + 24),
        width: 300,
        maxHeight: 320,
        overflowY: 'auto',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
        bgcolor: 'background.paper',
        zIndex: 1400,
        p: 0.8,
      }}
    >
      <Box sx={{ px: 1, py: 0.5, mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>
          Comandos Básicos ({filteredCommands.length})
        </Typography>
      </Box>
      <List dense disablePadding>
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <ListItemButton
              key={cmd.id}
              selected={isSelected}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              sx={{
                borderRadius: 2,
                mb: 0.3,
                py: 0.8,
                px: 1.2,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                {cmd.icon}
              </ListItemIcon>
              <ListItemText
                primary={cmd.label}
                secondary={cmd.description}
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.7rem', noWrap: true }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
