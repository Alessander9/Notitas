import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Save as SaveIcon,
  Key as KeyIcon,
  Badge as BadgeIcon,
  Mail as MailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FolderZip as BackupIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { getAvatarUrl } from '../utils/text';
import { exportWorkspaceBackup } from '../utils/exportWorkspace';
import { toast } from '../store/toastStore';

function TabPanel({ value, index, children }) {
  return (
    <AnimatePresence mode="wait">
      {value === index && (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Box sx={{ pt: 2.5 }}>{children}</Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ProfileDialog({ open, onClose }) {
  const { user, updateProfile, changePassword } = useAuthStore();
  const [tab, setTab] = useState(0);

  // Perfil
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profilePending, setProfilePending] = useState(false);

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdPending, setPwdPending] = useState(false);
  const [backupPending, setBackupPending] = useState(false);

  const handleDownloadBackup = async () => {
    setBackupPending(true);
    try {
      await exportWorkspaceBackup();
      toast.success('Copia de seguridad descargada exitosamente');
    } catch (err) {
      console.error('Error generating backup:', err);
      toast.error('No se pudo generar la copia de seguridad');
    } finally {
      setBackupPending(false);
    }
  };

  // El Navbar re-monta este diálogo en cada apertura, así que los useState
  // se inicializan frescos con los datos actuales del usuario.

  const handleClose = () => {
    if (profilePending || pwdPending) return;
    onClose();
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfilePending(true);
    const result = await updateProfile(name, email);
    setProfilePending(false);
    setProfileMsg({ type: result.success ? 'success' : 'error', text: result.message });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setPwdPending(true);
    const result = await changePassword(currentPassword, newPassword);
    setPwdPending(false);
    setPwdMsg({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const avatarUrl = getAvatarUrl(user?.avatar);
  const firstName = (user?.name || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #386c5f 0%, #264e44 100%)',
          pt: 3,
          pb: 3,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -40, right: -20, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: 100, width: 170, height: 170, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
          style={{ position: 'relative' }}
        >
          <Box sx={{ position: 'relative', width: 72, height: 72 }}>
            <Box
              sx={{
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)',
              }}
            />
            <Avatar
              src={avatarUrl}
              sx={{
                position: 'relative',
                width: 72,
                height: 72,
                fontSize: '1.7rem',
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '2.5px solid rgba(255,255,255,0.55)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              }}
            >
              {firstName[0]?.toUpperCase()}
            </Avatar>
          </Box>
        </motion.div>
        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} color="#fff" sx={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)', lineHeight: 1.2 }}>
            Mi perfil
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.15)', mt: 0.4 }}>
            Gestiona tu información personal y tu contraseña
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: 'relative',
            ml: 'auto',
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.18)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.32)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          px: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { py: 1.4, fontWeight: 700 },
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
        }}
      >
        <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Perfil" />
        <Tab icon={<LockIcon fontSize="small" />} iconPosition="start" label="Contraseña" />
        <Tab icon={<BackupIcon fontSize="small" />} iconPosition="start" label="Copia de Seguridad" />
      </Tabs>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
        {/* ── Tab Perfil ─────────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Box component="form" onSubmit={handleProfileSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            <TextField
              label="Nombre"
              fullWidth
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              InputProps={{
                startAdornment: (
                  <BadgeIcon sx={{ mr: 1, fontSize: 19, color: 'text.disabled' }} />
                ),
              }}
            />
            <TextField
              label="Email"
              fullWidth
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              InputProps={{
                startAdornment: (
                  <MailIcon sx={{ mr: 1, fontSize: 19, color: 'text.disabled' }} />
                ),
              }}
            />
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Si cambias tu email, iniciarás sesión con el nuevo correo a partir de ahora.
            </Alert>
            {profileMsg && (
              <Alert severity={profileMsg.type} sx={{ borderRadius: 2 }}>
                {profileMsg.text}
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={profilePending || !name.trim() || !email.trim()}
                startIcon={profilePending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                sx={{ minWidth: 170, borderRadius: 2 }}
              >
                {profilePending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab Contraseña ─────────────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            <TextField
              label="Contraseña actual"
              fullWidth
              required
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <TextField
              label="Nueva contraseña"
              fullWidth
              required
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              helperText="Mínimo 6 caracteres"
            />
            <TextField
              label="Confirmar nueva contraseña"
              fullWidth
              required
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              error={confirmPassword.length > 0 && newPassword !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? 'Las contraseñas no coinciden'
                  : 'Repite la nueva contraseña'
              }
            />
            <Tooltip title={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'} placement="top">
              <Button
                size="small"
                variant="text"
                onClick={() => setShowPasswords((s) => !s)}
                startIcon={showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
              >
                {showPasswords ? 'Ocultar' : 'Mostrar'} contraseñas
              </Button>
            </Tooltip>
            {pwdMsg && (
              <Alert severity={pwdMsg.type} sx={{ borderRadius: 2 }}>
                {pwdMsg.text}
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={pwdPending || !currentPassword || !newPassword || !confirmPassword}
                startIcon={pwdPending ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
                sx={{ minWidth: 210, borderRadius: 2 }}
              >
                {pwdPending ? 'Cambiando...' : 'Cambiar contraseña'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* ── Tab Copia de Seguridad ────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BackupIcon color="primary" /> Exportación Completa en Markdown (.ZIP)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Descarga una copia de seguridad con todos tus proyectos estructurados en carpetas y cada una de tus notas en archivos estándar <strong>.md (Markdown)</strong>, compatible con Obsidian, Notion o Visual Studio Code.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDownloadBackup}
                disabled={backupPending}
                startIcon={backupPending ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                sx={{ borderRadius: 2.5, px: 3, py: 1, fontWeight: 700, textTransform: 'none' }}
              >
                {backupPending ? 'Generando archivo .ZIP...' : 'Descargar todas mis notas (.ZIP)'}
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 0.5 }}>
        <Button onClick={handleClose} color="inherit" sx={{ borderRadius: 2 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
