import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Tooltip,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Add as AddIcon,
  Alarm as ReminderIcon,
  EditCalendar as UpdatedIcon,
  EventNote as CreatedIcon,
  Schedule as TimelineIcon,
} from '@mui/icons-material';
import { getReminderForNote, getReminders } from '../hooks/useNoteReminders';
import { formatShortDate } from '../utils/text';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Formatea una fecha local a clave YYYY-MM-DD sin desfase de zona horaria UTC */
const formatDateKey = (d) => {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function CalendarTimelineView({ notes = [], onNoteClick, onCreateNote }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateField, setDateField] = useState('created'); // 'created' | 'updated' | 'reminders'
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'timeline'

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Mapeo de notas a fechas
  const notesByDate = useMemo(() => {
    const map = {};
    const reminders = getReminders();

    notes.forEach((note) => {
      let targetDateStr = null;

      if (dateField === 'reminders') {
        const rem = reminders.find((r) => r.noteId === note.id);
        if (rem && rem.remindAt) {
          targetDateStr = formatDateKey(rem.remindAt);
        }
      } else if (dateField === 'updated') {
        if (note.updatedAt) {
          targetDateStr = formatDateKey(note.updatedAt);
        }
      } else {
        // 'created'
        const rawDate = note.createdAt || note.created_at;
        if (rawDate) {
          targetDateStr = formatDateKey(rawDate);
        }
      }

      if (targetDateStr) {
        if (!map[targetDateStr]) map[targetDateStr] = [];
        map[targetDateStr].push(note);
      }
    });

    return map;
  }, [notes, dateField]);

  // Días para la cuadrícula del mes
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Ajuste para que lunes sea 0 (domingo = 6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = lastDayOfMonth.getDate();
    const days = [];

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = formatDateKey(prevDate);
      days.push({
        dayNumber: d,
        date: prevDate,
        dateStr,
        isCurrentMonth: false,
        notes: notesByDate[dateStr] || [],
      });
    }

    // Días del mes actual
    for (let i = 1; i <= totalDays; i++) {
      const thisDate = new Date(year, month, i);
      const dateStr = formatDateKey(thisDate);
      days.push({
        dayNumber: i,
        date: thisDate,
        dateStr,
        isCurrentMonth: true,
        notes: notesByDate[dateStr] || [],
      });
    }

    // Días del mes siguiente para completar cuadrícula de 35 o 42 casillas
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = formatDateKey(nextDate);
      days.push({
        dayNumber: i,
        date: nextDate,
        dateStr,
        isCurrentMonth: false,
        notes: notesByDate[dateStr] || [],
      });
    }

    return days;
  }, [year, month, notesByDate]);

  const todayStr = formatDateKey(new Date());

  // Lista para vista Timeline ordenada
  const timelineItems = useMemo(() => {
    const list = [];
    const reminders = getReminders();

    notes.forEach((note) => {
      let dateVal = null;
      let labelType = 'Creada';

      if (dateField === 'reminders') {
        const rem = reminders.find((r) => r.noteId === note.id);
        if (rem && rem.remindAt) {
          dateVal = new Date(rem.remindAt);
          labelType = 'Recordatorio';
        }
      } else if (dateField === 'updated') {
        dateVal = new Date(note.updatedAt || note.createdAt);
        labelType = 'Actualizada';
      } else {
        dateVal = new Date(note.createdAt || note.updatedAt);
        labelType = 'Creada';
      }

      if (dateVal && !isNaN(dateVal.getTime())) {
        list.push({ note, dateVal, labelType });
      }
    });

    return list.sort((a, b) => b.dateVal - a.dateVal);
  }, [notes, dateField]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: { xs: 1, sm: 2 } }}>
      {/* ── Controles de Cabecera del Calendario ─────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Mes y botones de navegación */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ minWidth: 160, textTransform: 'capitalize' }}>
            {MONTHS[month]} {year}
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            <IconButton size="small" onClick={handlePrevMonth}>
              <PrevIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleToday}>
              <TodayIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleNextMonth}>
              <NextIcon fontSize="small" />
            </IconButton>
          </ButtonGroup>
        </Box>

        {/* Filtro de Criterio de Fecha y Toggle de Vista */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
              sx={{ height: 32, fontSize: '0.8rem', borderRadius: 2 }}
            >
              <MenuItem value="created">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <CreatedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  Fecha de creación
                </Box>
              </MenuItem>
              <MenuItem value="updated">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <UpdatedIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                  Última edición
                </Box>
              </MenuItem>
              <MenuItem value="reminders">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <ReminderIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  Recordatorios
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <ButtonGroup size="small" variant="outlined" sx={{ height: 32 }}>
            <Button
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('month')}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('timeline')}
              startIcon={<TimelineIcon sx={{ fontSize: 14 }} />}
              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Timeline
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* ── Vista Mensual (Grid) ────────────────────────────────────── */}
      {viewMode === 'month' ? (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          {/* Fila de días de la semana */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            {DAYS_OF_WEEK.map((day) => (
              <Box key={day} sx={{ py: 1, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {day}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Cuadrícula de días */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridAutoRows: 'minmax(90px, 1fr)',
              flexGrow: 1,
            }}
          >
            {calendarDays.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              return (
                <Box
                  key={idx}
                  sx={{
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid' : 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    p: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    bgcolor: isToday
                      ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(56, 108, 95, 0.15)' : 'rgba(56, 108, 95, 0.08)')
                      : cell.isCurrentMonth
                        ? 'transparent'
                        : 'action.hover',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    transition: 'background 0.15s ease',
                    '&:hover': {
                      bgcolor: isToday ? undefined : 'action.selected',
                    },
                  }}
                >
                  {/* Cabecera del día */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography
                      variant="caption"
                      fontWeight={isToday ? 900 : 700}
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isToday ? 'primary.main' : 'transparent',
                        color: isToday ? '#fff' : 'text.primary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {cell.dayNumber}
                    </Typography>

                    {onCreateNote && cell.isCurrentMonth && (
                      <Tooltip title={`Crear nota el ${cell.dayNumber} de ${MONTHS[month]}`}>
                        <IconButton
                          size="small"
                          onClick={() => onCreateNote(cell.date)}
                          sx={{ p: 0.2, opacity: 0.3, '&:hover': { opacity: 1, color: 'primary.main' } }}
                        >
                          <AddIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {/* Lista de notas del día */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, overflowY: 'auto', maxHeight: 85 }}>
                    {cell.notes.map((note) => {
                      const hasReminder = Boolean(getReminderForNote(note.id));
                      return (
                        <Paper
                          key={note.id}
                          elevation={0}
                          onClick={() => onNoteClick(note.id)}
                          sx={{
                            px: 0.75,
                            py: 0.3,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 2px 8px rgba(56, 108, 95, 0.2)',
                            },
                          }}
                        >
                          {note.icon ? (
                            <Typography sx={{ fontSize: '0.75rem', lineHeight: 1 }}>{note.icon}</Typography>
                          ) : hasReminder ? (
                            <ReminderIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                          ) : (
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          )}
                          <Typography variant="caption" noWrap fontWeight={600} sx={{ fontSize: '0.7rem', flexGrow: 1 }}>
                            {note.title || 'Sin título'}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        /* ── Vista Cronológica (Timeline) ────────────────────────────── */
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
          {timelineItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <TimelineIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">No hay notas registradas para este filtro</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 640, mx: 'auto' }}>
              {timelineItems.map(({ note, dateVal, labelType }) => (
                <Paper
                  key={note.id}
                  elevation={0}
                  onClick={() => onNoteClick(note.id)}
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateX(4px)',
                      boxShadow: '0 4px 14px rgba(56, 108, 95, 0.2)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 80,
                      textAlign: 'center',
                      p: 0.75,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      {dateVal.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                      {dateVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {note.icon && <Typography sx={{ fontSize: '0.9rem' }}>{note.icon}</Typography>}
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {note.title || 'Sin título'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {labelType} · {formatShortDate(dateVal.toISOString())}
                    </Typography>
                  </Box>

                  {note.tags && note.tags.length > 0 && (
                    <Chip label={`#${note.tags[0]}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
