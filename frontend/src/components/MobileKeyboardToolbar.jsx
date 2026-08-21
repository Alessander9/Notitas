import React from 'react';
import { Box, IconButton, Divider, Tooltip } from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatStrikethrough as StrikeIcon,
  PlaylistAddCheck as ChecklistIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  FormatQuote as QuoteIcon,
  Code as CodeIcon,
  Title as TitleIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';

export default function MobileKeyboardToolbar({ editor }) {
  if (!editor) return null;

  const btnStyle = (isActive) => ({
    p: 0.8,
    borderRadius: 2,
    minWidth: 36,
    height: 36,
    color: isActive ? 'primary.main' : 'text.secondary',
    bgcolor: isActive ? 'action.selected' : 'transparent',
    transition: 'all 0.15s ease',
    '&:active': { transform: 'scale(0.92)' },
  });

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        left: { xs: 8, sm: 16 },
        right: { xs: 8, sm: 16 },
        maxWidth: 580,
        mx: 'auto',
        zIndex: 1200,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.6,
        borderRadius: 4,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(20, 20, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 12px 36px rgba(0, 0, 0, 0.55)'
            : '0 12px 36px rgba(56, 108, 95, 0.18)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Tooltip title="Negrita">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          sx={btnStyle(editor.isActive('bold'))}
        >
          <BoldIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Cursiva">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          sx={btnStyle(editor.isActive('italic'))}
        >
          <ItalicIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Tachado">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          sx={btnStyle(editor.isActive('strike'))}
        >
          <StrikeIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.3, my: 0.8 }} />

      <Tooltip title="Lista de Tareas">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          sx={btnStyle(editor.isActive('taskList'))}
        >
          <ChecklistIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Lista con Viñetas">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          sx={btnStyle(editor.isActive('bulletList'))}
        >
          <BulletListIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Lista Numerada">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          sx={btnStyle(editor.isActive('orderedList'))}
        >
          <NumberedListIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.3, my: 0.8 }} />

      <Tooltip title="Título H1">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          sx={btnStyle(editor.isActive('heading', { level: 1 }))}
        >
          <TitleIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Cita">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          sx={btnStyle(editor.isActive('blockquote'))}
        >
          <QuoteIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Código">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          sx={btnStyle(editor.isActive('codeBlock'))}
        >
          <CodeIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.3, my: 0.8 }} />

      <Tooltip title="Deshacer">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          sx={btnStyle(false)}
        >
          <UndoIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Rehacer">
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          sx={btnStyle(false)}
        >
          <RedoIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
