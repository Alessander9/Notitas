import React, { useState, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
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
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import api from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import CoverImage from './CoverImage';
import ProfileDialog from './ProfileDialog';
import { getAvatarUrl } from '../utils/text';

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
  const { darkMode, toggleDarkMode, searchQuery, setSearchQuery, setCurrentProject, setShowWelcome, setWelcomeUser, setSidebarMobileOpen } = useUiStore();
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();

  // Ctrl+K / Cmd+K para enfocar la búsqueda
  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        placeholder="Buscar notas globalmente... (Ctrl+K)"
        inputProps={{ 'aria-label': 'search' }}
        value={searchQuery}
        onChange={handleSearchChange}
        inputRef={searchInputRef}
      />
    </Search>
  );

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ zIndex: 1201 }}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px', flexWrap: 'wrap', py: isMobile ? 1 : 0 }}>
        {/* Fila principal: hamburguesa (móvil) + logo + acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
          {isMobile && (
            <Tooltip title="Menú">
              <IconButton edge="start" color="inherit" onClick={() => setSidebarMobileOpen(true)} aria-label="Abrir menú">
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
          <Box
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', minWidth: 0 }}
            onClick={() => setCurrentProject(null)}
          >
            <Typography variant="h5" fontWeight="bold" color="primary" sx={{ letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              Notitas
            </Typography>
          </Box>
        </Box>

        {/* Búsqueda (escritorio) */}
        {!isMobile && searchBar}

        {/* Acciones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
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
