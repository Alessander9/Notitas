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
  } = useUiStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px', flexWrap: 'wrap', py: isMobile ? 1 : 0 }}>
        {/* Fila principal: hamburguesa (móvil) + logo + acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
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
                    p: 1,
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
                    <MenuIcon sx={{ fontSize: 22 }} />
                  </motion.div>
                </IconButton>
              </motion.div>
            </Tooltip>
          )}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', minWidth: 0 }}
            onClick={() => setCurrentProject(null)}
          >
            {/* Logo oficial de Notitas */}
            <Box
              sx={{
                width: 40,
                height: 40,
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
                height: 28,
                display: 'flex',
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

        {/* Acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexShrink: 0 }}>
          {user && (
            <Tooltip title="Asistente de IA (Ctrl+J)">
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <IconButton
                  onClick={toggleAiDrawer}
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
          )}

          {user && <NotificationBell />}

          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <LightIcon /> : <DarkIcon />}
          </IconButton>

          {user && (
            <>
              <Tooltip title={user.name}>
                <IconButton onClick={handleMenu} sx={{ p: 0 }}>
                  <CoverImage
                    src={userAvatarUrl}
                    alt={user.name}
                    sx={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid', borderColor: 'primary.main' }}
                    fallback={
                      <Avatar sx={{ width: '100%', height: '100%', bgcolor: 'primary.main', fontSize: '0.95rem' }}>
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
        {isMobile && <Box sx={{ flexBasis: '100%', order: 3, mt: 0.5 }}>{searchBar}</Box>}
      </Toolbar>

      {/* Remounted each open so the form state is fresh */}
      {profileOpen && <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />}
    </AppBar>
  );
}
