import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  ExitToApp as LogoutIcon,
  PhotoCamera as PhotoCameraIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  AutoAwesome as SparklesIcon,
  Bolt as QuickNoteIcon,
  NoteAlt as ScratchpadIcon,
  Widgets as WidgetsIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import CoverImage from './CoverImage';
import ProfileDialog from './ProfileDialog';
import NotificationBell from './NotificationBell';
import QuickNoteModal from './QuickNoteModal';
import { getAvatarUrl } from '../utils/text';
import logoImage from '../assets/logo notitas.png';
import textoImage from '../assets/notitas-texto.png';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: '350px',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

export default function Navbar() {
  const { user, logout, updateAvatar } = useAuthStore();
  const {
    darkMode,
    toggleDarkMode,
    searchQuery,
    setSearchQuery,
    setCurrentProject,
    setShowWelcome,
    setWelcomeUser,
    sidebarMobileOpen,
    setSidebarMobileOpen,
    toggleAiDrawer,
    aiDrawerOpen,
    currentProjectId,
    scratchpadOpen,
    toggleScratchpad,
  } = useUiStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const avatarInputRef = useRef(null);

  // Atajo global para abrir creación rápida de nota (Alt+N o Ctrl+Alt+N)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && (e.key === 'n' || e.key === 'N')) || (e.ctrlKey && e.altKey && (e.key === 'n' || e.key === 'N'))) {
        e.preventDefault();
        setQuickNoteOpen(true);
      }
    };
    const handleOpenEvent = () => setQuickNoteOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('notitas:quick-note', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('notitas:quick-note', handleOpenEvent);
    };
  }, []);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    // Snapshot del usuario antes de borrar la sesión, para la pantalla de despedida
    setWelcomeUser(user);
    setShowWelcome(true, 'logout');
    logout();
    // Limpia la caché de React Query y el estado de UI: evita que el siguiente
    // usuario que inicie sesión en este navegador vea datos del anterior.
    queryClient.clear();
    setCurrentProject(null);
    setSearchQuery('');
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() !== '') {
      setCurrentProject('search');
    } else {
      setCurrentProject(null);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateAvatar(res.data.avatar);
      handleClose();
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      console.error('Error uploading avatar', err);
      toast.error('Error al subir la foto de perfil');
    }
  };

  const userAvatarUrl = getAvatarUrl(user?.avatar);

  const searchBar = (
    <Search sx={isMobile ? { width: '100% !important', marginRight: 0, marginLeft: 0 } : undefined}>
      <SearchIconWrapper>
        <SearchIcon color="action" />
      </SearchIconWrapper>
      <StyledInputBase
        placeholder="Buscar notas..."
        inputProps={{ 'aria-label': 'search' }}
        value={searchQuery}
        onChange={handleSearchChange}
      />
    </Search>
  );

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        zIndex: 1201,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(26, 26, 53, 0.75)' : 'rgba(240, 243, 248, 0.88)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          minHeight: { xs: '56px', sm: '64px' },
          flexWrap: 'wrap',
          px: { xs: 1, sm: 2, md: 3 },
          py: isMobile ? 0.75 : 0,
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Fila principal: hamburguesa (móvil) + logo + acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flex: 1, minWidth: 0 }}>
          {isMobile && (
            <Tooltip title={sidebarMobileOpen ? "Cerrar menú" : "Abrir menú"}>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
                  aria-label="Menú de navegación"
                  sx={{
                    mr: 0.5,
                    p: { xs: 0.75, sm: 1 },
                    borderRadius: '12px',
                    bgcolor: (theme) =>
                      sidebarMobileOpen
                        ? (theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.28)' : 'rgba(56, 108, 95, 0.14)')
                        : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    border: '1px solid',
                    borderColor: (theme) =>
                      sidebarMobileOpen
                        ? 'primary.main'
                        : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(230, 232, 242, 0.8)'),
                    color: sidebarMobileOpen ? 'primary.main' : 'text.primary',
                    boxShadow: sidebarMobileOpen ? '0 4px 14px rgba(56, 108, 95, 0.25)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <motion.div
                    animate={{ rotate: sidebarMobileOpen ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MenuIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                  </motion.div>
                </IconButton>
              </motion.div>
            </Tooltip>
          )}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, cursor: 'pointer', minWidth: 0 }}
            onClick={() => setCurrentProject(null)}
          >
            {/* Logo oficial de Notitas */}
            <Box
              sx={{
                width: { xs: 34, sm: 40 },
                height: { xs: 34, sm: 40 },
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={logoImage}
                alt="Notitas Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 6px rgba(56,108,95,0.3))',
                }}
              />
            </Box>
            <Box
              sx={{
                height: { xs: 22, sm: 28 },
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
              }}
            >
              <img
                src={textoImage}
                alt="Notitas"
                style={{
                  height: '100%',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 2px rgba(56,108,95,0.2))',
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Búsqueda (escritorio) */}
        {!isMobile && searchBar}

        {/* Barra de herramientas / Acciones de cabecera */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 0.9, md: 1.2 }, flexShrink: 0 }}>
          {/* Botón de Menú de Herramientas Desplegable (Modo Móvil) */}
          {user && (
            <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
              <Tooltip title="Herramientas">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                  <IconButton
                    onClick={(e) => setToolsAnchorEl(e.currentTarget)}
                    aria-label="Menú desplegable de herramientas"
                    sx={{
                      bgcolor: Boolean(toolsAnchorEl)
                        ? 'primary.main'
                        : (theme) => (theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.28)' : 'rgba(56, 108, 95, 0.14)'),
                      color: Boolean(toolsAnchorEl) ? '#fff' : 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      p: 0.7,
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      boxShadow: Boolean(toolsAnchorEl) ? '0 4px 14px rgba(56, 108, 95, 0.35)' : 'none',
                    }}
                  >
                    <WidgetsIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </motion.div>
              </Tooltip>

              {/* Menú Desplegable de Herramientas para Móvil */}
              <Menu
                id="menu-tools-mobile"
                anchorEl={toolsAnchorEl}
                open={Boolean(toolsAnchorEl)}
                onClose={() => setToolsAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 230,
                    borderRadius: 3,
                    boxShadow: '0 16px 36px rgba(0,0,0,0.22)',
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 0.6,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(26, 32, 44, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(14px)',
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setToolsAnchorEl(null);
                    setQuickNoteOpen(true);
                  }}
                  sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                >
                  <QuickNoteIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Nota Rápida</Typography>
                    <Typography variant="caption" color="text.secondary">Crear al vuelo (Alt+N)</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setToolsAnchorEl(null);
                    toggleScratchpad();
                  }}
                  sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                >
                  <ScratchpadIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Bloc Rápido</Typography>
                    <Typography variant="caption" color="text.secondary">Apunte efímero (Alt+S)</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setToolsAnchorEl(null);
                    toggleAiDrawer();
                  }}
                  sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                >
                  <SparklesIcon sx={{ color: '#845EC2', fontSize: 20 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Asistente de IA</Typography>
                    <Typography variant="caption" color="text.secondary">CleoBot (Ctrl+J)</Typography>
                  </Box>
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setToolsAnchorEl(null);
                    toggleDarkMode();
                  }}
                  sx={{ borderRadius: 2, py: 1, gap: 1.5 }}
                >
                  {darkMode ? <LightIcon sx={{ color: '#f59e0b', fontSize: 20 }} /> : <DarkIcon sx={{ color: 'text.secondary', fontSize: 20 }} />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</Typography>
                    <Typography variant="caption" color="text.secondary">Alternar apariencia</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            </Box>
          )}

          {/* Herramientas individuales (Tablet y Escritorio >= sm) */}
          {user && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: { sm: 0.8, md: 1.2 } }}>
              <Tooltip title="Nota rápida (Alt+N)">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                  <IconButton
                    onClick={() => setQuickNoteOpen(true)}
                    aria-label="Crear nota rápida"
                    sx={{
                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.25)' : 'rgba(56, 108, 95, 0.12)'),
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      p: 0.85,
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(56, 108, 95, 0.35)',
                      },
                    }}
                  >
                    <QuickNoteIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </motion.div>
              </Tooltip>

              <Tooltip title="Bloc Rápido (Alt+S)">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                  <IconButton
                    onClick={toggleScratchpad}
                    aria-label="Abrir bloc rápido"
                    sx={{
                      bgcolor: scratchpadOpen
                        ? 'warning.main'
                        : (theme) => (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)'),
                      color: scratchpadOpen ? '#fff' : 'warning.main',
                      border: '1px solid',
                      borderColor: 'warning.main',
                      p: 0.85,
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      boxShadow: scratchpadOpen ? '0 4px 14px rgba(245, 158, 11, 0.35)' : 'none',
                      '&:hover': {
                        bgcolor: 'warning.main',
                        color: '#fff',
                      },
                    }}
                  >
                    <ScratchpadIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </motion.div>
              </Tooltip>

              <Tooltip title="Asistente de IA (Ctrl+J)">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                  <IconButton
                    onClick={toggleAiDrawer}
                    aria-label="Abrir asistente de IA"
                    sx={{
                      bgcolor: aiDrawerOpen
                        ? 'primary.main'
                        : (theme) => (theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.25)' : 'rgba(56, 108, 95, 0.12)'),
                      color: aiDrawerOpen ? '#fff' : 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      p: 0.85,
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      boxShadow: aiDrawerOpen ? '0 4px 14px rgba(56, 108, 95, 0.35)' : 'none',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        color: '#fff',
                      },
                    }}
                  >
                    <SparklesIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </motion.div>
              </Tooltip>

              <Tooltip title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
                <IconButton onClick={toggleDarkMode} color="inherit" aria-label="Cambiar tema" sx={{ p: 0.85 }}>
                  {darkMode ? <LightIcon sx={{ fontSize: 20 }} /> : <DarkIcon sx={{ fontSize: 20 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {user && <NotificationBell />}

          {user && (
            <>
              <Tooltip title={user.name}>
                <IconButton onClick={handleMenu} sx={{ p: 0 }} aria-label="Menú de usuario">
                  <CoverImage
                    src={userAvatarUrl}
                    alt={user.name}
                    sx={{
                      width: { xs: 32, sm: 38 },
                      height: { xs: 32, sm: 38 },
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: 'primary.main',
                    }}
                    fallback={
                      <Avatar sx={{ width: '100%', height: '100%', bgcolor: 'primary.main', fontSize: { xs: '0.8rem', sm: '0.95rem' } }}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </Avatar>
                    }
                  />
                </IconButton>
              </Tooltip>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled sx={{ opacity: 0.8, fontWeight: 'bold' }}>
                  {user.email}
                </MenuItem>

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={avatarInputRef}
                  onChange={handleAvatarFileChange}
                />
                <MenuItem onClick={() => avatarInputRef.current?.click()}>
                  <PhotoCameraIcon size="small" sx={{ mr: 1.5 }} /> Cambiar foto de perfil
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleClose();
                    setProfileOpen(true);
                  }}
                >
                  <AccountCircleIcon size="small" sx={{ mr: 1.5 }} /> Editar perfil
                </MenuItem>

                <MenuItem onClick={handleLogout}>
                  <LogoutIcon size="small" sx={{ mr: 1.5 }} /> Cerrar sesión
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Búsqueda (móvil): fila completa debajo */}
        {isMobile && <Box sx={{ flexBasis: '100%', order: 3, mt: 0.5, mb: 0.25 }}>{searchBar}</Box>}
      </Toolbar>

      {/* Remounted each open so the form state is fresh */}
      {profileOpen && <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />}
      {quickNoteOpen && (
        <QuickNoteModal
          open={quickNoteOpen}
          onClose={() => setQuickNoteOpen(false)}
          defaultProjectId={typeof currentProjectId === 'number' ? currentProjectId : null}
        />
      )}
    </AppBar>
  );
}
