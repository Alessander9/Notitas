import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Animation as GifIcon,
  PhotoCamera as PhotoIcon,
  Wallpaper as WallpaperIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import { searchGifs, searchPhotos, CURATED_GIF_COLLECTIONS, GRADIENT_COLLECTIONS } from '../services/gifService';

export default function MediaPickerModal({
  open,
  onClose,
  onSelectMedia,
  onUploadFile,
  title = 'Elegir Portada o Imagen',
  initialTab = 'gifs',
}) {
  const [tab, setTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Lofi');
  const [gifs, setGifs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cargar medios al buscar o cambiar de pestaña o categoría
  useEffect(() => {
    if (!open) return;
    let isCancelled = false;

    const fetchResults = async () => {
      setLoadingMedia(true);

      if (tab === 'gifs') {
        const queryToUse = debouncedQuery.trim() || selectedCategory;
        const results = await searchGifs(queryToUse);
        if (!isCancelled) {
          setGifs(results);
          setLoadingMedia(false);
        }
      } else if (tab === 'photos') {
        const queryToUse = debouncedQuery.trim() || 'aesthetic wallpaper';
        const results = await searchPhotos(queryToUse);
        if (!isCancelled) {
          setPhotos(results);
          setLoadingMedia(false);
        }
      } else {
        setLoadingMedia(false);
      }
    };

    fetchResults();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, selectedCategory, tab, open]);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSearchQuery('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      onSelectMedia(customUrl.trim());
      onClose();
    }
  };

  const handleApplyFile = () => {
    if (selectedFile && onUploadFile) {
      onUploadFile(selectedFile);
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
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(22, 26, 40, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          px: 3,
          pt: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <SparklesIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
            {title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setSearchQuery('');
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              gap: 0.8,
            },
          }}
        >
          <Tab value="gifs" icon={<GifIcon sx={{ fontSize: 18 }} />} label="GIFs Animados (GIPHY)" />
          <Tab value="photos" icon={<PhotoIcon sx={{ fontSize: 18 }} />} label="Fotos & Fondos HD" />
          <Tab value="gradients" icon={<WallpaperIcon sx={{ fontSize: 18 }} />} label="Gradientes Mesh" />
          <Tab value="upload" icon={<UploadIcon sx={{ fontSize: 18 }} />} label="Subir o Enlace" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: 400, maxHeight: '65vh' }}>
        {/* PESTAÑA 1: GIFS ANIMADOS */}
        {tab === 'gifs' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar GIFs animados (ej. gatos, lofi, anime, cyberpunk, coding)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                },
              }}
            />

            {/* Categorías sugeridas */}
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
                Colecciones:
              </Typography>
              {Object.keys(CURATED_GIF_COLLECTIONS).map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  clickable
                  variant={selectedCategory === cat && !searchQuery ? 'filled' : 'outlined'}
                  color={selectedCategory === cat && !searchQuery ? 'primary' : 'default'}
                  onClick={() => handleSelectCategory(cat)}
                  sx={{ borderRadius: 1.8, fontSize: '0.78rem', fontWeight: 600 }}
                />
              ))}
            </Box>

            {/* Cuadrícula de GIFs */}
            {loadingMedia ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, gap: 1.5 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Cargando GIFs animados...
                </Typography>
              </Box>
            ) : gifs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  No se encontraron GIFs para tu búsqueda. Prueba con otra categoría o término.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 1.5,
                  overflowY: 'auto',
                  maxHeight: 330,
                  pr: 0.5,
                }}
              >
                {gifs.map((gif) => (
                  <Box
                    key={gif.id || gif.url}
                    onClick={() => {
                      onSelectMedia(gif.url);
                      onClose();
                    }}
                    sx={{
                      position: 'relative',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      height: 120,
                      cursor: 'pointer',
                      bgcolor: 'action.hover',
                      border: '2px solid transparent',
                      transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        borderColor: 'primary.main',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        zIndex: 2,
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={gif.preview || gif.url}
                      alt={gif.title}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'flex-end',
                        p: 1,
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600, noWrap: true }}>
                        {gif.title}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* PESTAÑA 2: FOTOS & FONDOS HD */}
        {tab === 'photos' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar millones de fotos reales (ej. montañas, sunset, minimal, oficina, cafe)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                },
              }}
            />

            {loadingMedia ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, gap: 1.5 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Buscando fotos en alta resolución...
                </Typography>
              </Box>
            ) : photos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  No se encontraron fotos. Intenta con otro término de búsqueda.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: 1.5,
                  overflowY: 'auto',
                  maxHeight: 330,
                  pr: 0.5,
                }}
              >
                {photos.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => {
                      onSelectMedia(item.url);
                      onClose();
                    }}
                    sx={{
                      position: 'relative',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      height: 120,
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'all 0.2s ease-out',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        borderColor: 'primary.main',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        zIndex: 2,
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={item.preview || item.url}
                      alt={item.title}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 1,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.72rem', noWrap: true }}>
                        {item.title}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* PESTAÑA 3: GRADIENTES MESH */}
        {tab === 'gradients' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 2,
              overflowY: 'auto',
              maxHeight: 340,
            }}
          >
            {GRADIENT_COLLECTIONS.map((item) => (
              <Box
                key={item.id}
                onClick={() => {
                  onSelectMedia(item.url);
                  onClose();
                }}
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: 130,
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease-out',
                  '&:hover': {
                    transform: 'scale(1.03)',
                    borderColor: 'primary.main',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={item.preview}
                  alt={item.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 1,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                    {item.name}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* PESTAÑA 4: SUBIR ARCHIVO O ENLACE */}
        {tab === 'upload' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
            {/* Opción 1: Enlace URL */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Pegar enlace directo de imagen o GIF:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="https://ejemplo.com/imagen.gif o enlace de Giphy/Tenor"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  disabled={!customUrl.trim()}
                  onClick={handleApplyCustomUrl}
                  sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
                >
                  Aplicar
                </Button>
              </Box>
            </Box>

            {/* Opción 2: Subir archivo */}
            {onUploadFile && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  O subir archivo desde tu dispositivo:
                </Typography>
                <Box
                  component="label"
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'action.hover',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: 'primary.main' },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*,.gif,.webp"
                    onChange={handleFileChange}
                  />
                  <UploadIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                  <Typography variant="body2" fontWeight={600}>
                    {selectedFile ? selectedFile.name : 'Haz clic o arrastra una imagen/GIF aquí'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG, GIF, WebP hasta 10MB
                  </Typography>
                </Box>
                {filePreview && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
                    <Box
                      component="img"
                      src={filePreview}
                      alt="Preview"
                      sx={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 1.5 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleApplyFile}
                      sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
                    >
                      Subir y Aplicar
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
