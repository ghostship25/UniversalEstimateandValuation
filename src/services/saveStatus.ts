import { useSyncExternalStore } from 'react';
import { LAST_BACKUP_KEY } from './fullBackup';

// Tiny store behind the "Saved ..." indicator: autosave results and the age of the last full backup.
interface State { lastSavedAt: number | null; error: string | null; version: number }
let state: State = { lastSavedAt: null, error: null, version: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch, version: state.version + 1 }; listeners.forEach((l) => l()); };

/** localStorage.setItem that reports success or failure (a full disk must never fail silently) */
export function safeSave(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    set({ lastSavedAt: Date.now(), error: null });
    return true;
  } catch (e: any) {
    set({ error: e?.name === 'QuotaExceededError' ? 'Browser storage is full: download a full backup now.' : 'Could not save to browser storage: download a full backup now.' });
    return false;
  }
}
export const lastBackupAt = (): number => { try { return Number(localStorage.getItem(LAST_BACKUP_KEY) || 0); } catch { return 0; } };
export const markBackupDone = () => { try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch { /* ignore */ } set({}); };

export function useSaveStatus() {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state.version, () => state.version);
  return { lastSavedAt: state.lastSavedAt, error: state.error, lastBackupAt: lastBackupAt() };
}
