import React, { useState, useMemo } from 'react';
import {
  Box,
  Popover,
  InputBase,
  Typography,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Casino as RandomIcon,
  DeleteOutline as RemoveIcon,
} from '@mui/icons-material';

const EMOJI_CATEGORIES = {
  Populares: ['📝', '💡', '🚀', '⭐', '🔥', '📌', '✨', '🎯', '📊', '📂', '💻', '⚡', '☕', '🌱', '🎨'],
  Trabajo: ['📋', '📊', '📈', '📉', '📂', '📁', '🗂️', '📅', '📆', '🗓️', '⏱️', '⏰', '⌛', '💼', '📌', '📎', '✏️', '✒️', '🔍', '🔎', '🏷️', '🔑', '🔒', '💡', '🎯'],
  Tecnología: ['💻', '🖥️', '⌨️', '🖱️', '📱', '🕹️', '💾', '💿', '🔌', '📡', '⚙️', '🛠️', '🔧', '🔨', '🤖', '👾', '🚀', '🛸', '⚡', '🔋'],
  Símbolos: ['⭐', '🌟', '✨', '⚡', '🔥', '💥', '💎', '🎨', '🏆', '🥇', '🥈', '🥉', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '✔️', '❌', '⚠️', '🚩', '🏁'],
  Caras: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '🤔', '🤫', '😴'],
  Naturaleza: ['🌱', '🌿', '☘️', '🍀', '🌴', '🌲', '🌳', '🍂', '🍁', '🍄', '🌸', '🌹', '🌻', '🌼', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌈', '⚡', '❄️', '🌙', '🌊', '🐱', '🐶', '🦊', '🦁'],
  Comida: ['☕', '🍵', '🧃', '🥤', '🍕', '🍔', '🍟', '🥪', '🌮', '🍣', '🍱', '🍙', '🍩', '🍪', '🎂', '🍰', '🍫', '🍬', '🍎', '🍓', '🥑'],
};

const ALL_EMOJIS = Array.from(new Set(Object.values(EMOJI_CATEGORIES).flat()));

export default function EmojiPickerPopover({
  anchorEl,
  open,
  onClose,
  onSelectEmoji,
  currentEmoji,
}) {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('Populares');

  const filteredEmojis = useMemo(() => {
    const query = search.trim();
    if (!query) {
      return EMOJI_CATEGORIES[selectedTab] || [];
    }
    // Filter all emojis
    return ALL_EMOJIS.filter((e) => e.includes(query));
  }, [search, selectedTab]);

  const handleRandom = () => {
    const random = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
    onSelectEmoji(random);
    onClose();
  };

  const handleRemove = () => {
    onSelectEmoji(null);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            maxHeight: 400,
            borderRadius: 3,
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
            bgcolor: 'background.paper',
            backdropFilter: 'blur(16px)',
          },
        },
      }}
    >
      {/* Search & Actions Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            px: 1.2,
            py: 0.4,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.8 }} />
          <InputBase
            placeholder="Buscar emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: '0.85rem', flex: 1 }}
            autoFocus
          />
          {search && (
            <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        <Tooltip title="Emoji aleatorio">
          <IconButton size="small" onClick={handleRandom} sx={{ bgcolor: 'action.hover' }}>
            <RandomIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {currentEmoji && (
          <Tooltip title="Quitar icono">
            <IconButton size="small" onClick={handleRemove} sx={{ bgcolor: 'action.hover', color: 'error.main' }}>
              <RemoveIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Categories Tabs */}
      {!search && (
        <Tabs
          value={selectedTab}
          onChange={(_, val) => setSelectedTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 28,
            mb: 1,
            '& .MuiTab-root': {
              minHeight: 28,
              py: 0.4,
              px: 1,
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <Tab key={cat} label={cat} value={cat} />
          ))}
        </Tabs>
      )}

      {/* Emojis Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 0.6,
          maxHeight: 220,
          overflowY: 'auto',
          p: 0.5,
        }}
      >
        {filteredEmojis.map((emoji, idx) => (
          <Button
            key={`${emoji}-${idx}`}
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
            sx={{
              minWidth: 0,
              width: '100%',
              height: 40,
              fontSize: '1.35rem',
              p: 0,
              borderRadius: 2,
              bgcolor: currentEmoji === emoji ? 'action.selected' : 'transparent',
              border: currentEmoji === emoji ? '1.5px solid' : '1px solid transparent',
              borderColor: currentEmoji === emoji ? 'primary.main' : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                transform: 'scale(1.15)',
              },
            }}
          >
            {emoji}
          </Button>
        ))}

        {filteredEmojis.length === 0 && (
          <Box sx={{ gridColumn: 'span 6', py: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              No se encontraron emojis
            </Typography>
          </Box>
        )}
      </Box>
    </Popover>
  );
}
