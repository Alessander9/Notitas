import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import {
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  StrikethroughS as StrikeIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Title as H2Icon,
} from '@mui/icons-material';

/**
 * Floating toolbar that appears on text selection inside the TipTap editor.
 * Positions itself above the selection using the Selection API.
 */
export default function FloatingSelectionToolbar({ editor }) {
  const toolbarRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!editor || !toolbarRef.current) return;
    const { from, to } = editor.state.selection;
    if (from === to) { setVisible(false); return; }

    // Only show for text selections (not node selections)
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) { setVisible(false); return; }

    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) { setVisible(false); return; }

    const range = domSel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width) { setVisible(false); return; }

    const toolbarW = toolbarRef.current.offsetWidth || 320;
    const toolbarH = toolbarRef.current.offsetHeight || 40;
    const margin = 8;

    let left = rect.left + rect.width / 2 - toolbarW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - toolbarW - margin));
    const top = rect.top - toolbarH - margin;

    setPos({ top: Math.max(margin, top), left });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      // Delay slightly so TipTap state is updated
      setTimeout(updatePosition, 10);
    };
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    document.addEventListener('selectionchange', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
      document.removeEventListener('selectionchange', handler);
    };
  }, [editor, updatePosition]);

  const btn = (title, icon, active, action) => (
    <Tooltip title={title} placement="top">
      <IconButton
        size="small"
        onMouseDown={(e) => { e.preventDefault(); action(); }}
        sx={{
          p: 0.5,
          borderRadius: 1,
          color: active ? 'primary.main' : 'text.primary',
          bgcolor: active ? 'primary.main' + '1a' : 'transparent',
          '&:hover': { bgcolor: active ? 'primary.main' + '33' : 'action.hover' },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  const handleLink = (e) => {
    e.preventDefault();
    const url = window.prompt('URL del enlace:');
    if (!url) return;
    if (url === '') {
      editor.chain().focus().unsetLink?.().run();
    } else {
      editor.chain().focus().setLink?.({ href: url, target: '_blank' }).run();
    }
  };

  if (!editor || !visible) return null;

  return (
    <Box
      ref={toolbarRef}
      onMouseDown={(e) => e.preventDefault()}
      sx={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 0.3,
        px: 0.8,
        py: 0.5,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30,30,45,0.97)' : 'rgba(255,255,255,0.98)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'all',
      }}
    >
      {btn('Negrita (Ctrl+B)', <BoldIcon sx={{ fontSize: 17 }} />, editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run())}
      {btn('Cursiva (Ctrl+I)', <ItalicIcon sx={{ fontSize: 17 }} />, editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run())}
      {btn('Subrayado (Ctrl+U)', <UnderlineIcon sx={{ fontSize: 17 }} />, editor.isActive('underline'),
        () => editor.chain().focus().toggleUnderline?.().run())}
      {btn('Tachado', <StrikeIcon sx={{ fontSize: 17 }} />, editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run())}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />
      {btn('Encabezado 2', <H2Icon sx={{ fontSize: 17 }} />, editor.isActive('heading', { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn('Código inline', <CodeIcon sx={{ fontSize: 17 }} />, editor.isActive('code'),
        () => editor.chain().focus().toggleCode().run())}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.3 }} />
      {btn('Enlace', <LinkIcon sx={{ fontSize: 17 }} />, editor.isActive('link'), handleLink)}
    </Box>
  );
}
