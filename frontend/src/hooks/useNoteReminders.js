import { useEffect } from 'react';
import { toast } from '../store/toastStore';

const STORAGE_KEY = 'notitas-reminders';

export function getReminders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function saveReminder(noteId, noteTitle, remindAt) {
  const reminders = getReminders().filter(r => r.noteId !== noteId);
  if (remindAt) reminders.push({ noteId, noteTitle, remindAt: new Date(remindAt).toISOString() });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); } catch {}
}

export function removeReminder(noteId) {
  const reminders = getReminders().filter(r => r.noteId !== noteId);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); } catch {}
}

export function getReminderForNote(noteId) {
  return getReminders().find(r => r.noteId === noteId) || null;
}

/**
 * Checks reminders every minute and shows toast for due ones.
 */
export function useNoteReminders() {
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const reminders = getReminders();
      const due = reminders.filter(r => new Date(r.remindAt).getTime() <= now);
      if (!due.length) return;

      due.forEach(r => {
        toast.info(`Recordatorio: "${r.noteTitle || 'Nota'}"`);
        removeReminder(r.noteId);
      });
    };

    check(); // check immediately
    const id = setInterval(check, 60_000); // every minute
    return () => clearInterval(id);
  }, []);
}
