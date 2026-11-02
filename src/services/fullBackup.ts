// Full backup and restore: every project, rate table, contract, bill, variation, setting and the takeoff drawings.
import type { TakeoffSheet } from '../modules/takeoff/takeoffStore';
import { listAllSheets, replaceAllSheets } from '../modules/takeoff/takeoffStore';

export const BACKUP_VERSION = 1;
/** never written to a backup file (a password or a bookkeeping value) */
const EXCLUDED_KEYS = new Set(['uev_initiation_lock_pwd_v1', 'uev_last_backup_at']);
export const LAST_BACKUP_KEY = 'uev_last_backup_at';

type PackedSheet = Omit<TakeoffSheet, 'data'> & { data_b64: string };
export interface FullBackup {
  file_type: 'UEV_FULL_BACKUP';
  version: number;
  created_at: string;
  app: string;
  local_storage: Record<string, string>;
  takeoff_sheets: PackedSheet[];
  summary: { keys: number; projects: number; items: number; takeoff_sheets: number };
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin);
}
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function buildBackup(entries: Record<string, string>, sheets: TakeoffSheet[]): FullBackup {
  const local: Record<string, string> = {};
  Object.entries(entries).forEach(([k, v]) => { if (k.startsWith('uev_') && !EXCLUDED_KEYS.has(k)) local[k] = v; });
  let projects = 0, items = 0;
  try {
    const arr = JSON.parse(local['uev_projects_v1'] || '[]');
    if (Array.isArray(arr)) { projects = arr.length; arr.forEach((p) => { items += Array.isArray(p?.items) ? p.items.length : 0; }); }
  } catch { /* summary only */ }
  return {
    file_type: 'UEV_FULL_BACKUP',
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    app: 'Universal Estimating & Valuation',
    local_storage: local,
    takeoff_sheets: sheets.map(({ data, ...rest }) => ({ ...rest, data_b64: arrayBufferToBase64(data) })),
    summary: { keys: Object.keys(local).length, projects, items, takeoff_sheets: sheets.length },
  };
}

export function validateBackup(obj: unknown): { ok: true; backup: FullBackup } | { ok: false; error: string } {
  const b = obj as Partial<FullBackup> | null;
  if (!b || typeof b !== 'object') return { ok: false, error: 'This is not a backup file.' };
  if (b.file_type !== 'UEV_FULL_BACKUP') return { ok: false, error: 'This file is not a UEV full backup (wrong file type).' };
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' };
  if (!b.local_storage || typeof b.local_storage !== 'object') return { ok: false, error: 'The backup has no data section.' };
  for (const [k, v] of Object.entries(b.local_storage)) {
    if (!k.startsWith('uev_') || typeof v !== 'string') return { ok: false, error: `The backup contains an unexpected entry (${k}).` };
    if (k !== 'uev_active_project_id_v1' && k !== 'uev_selected_fy_v1' && k !== 'uev_current_fy_v1') {
      try { JSON.parse(v); } catch { /* some keys hold plain strings: only reject clearly broken JSON objects/arrays */ if (/^[[{]/.test(v)) return { ok: false, error: `The backup data for "${k}" is damaged.` }; }
    }
  }
  if (!Array.isArray(b.takeoff_sheets)) return { ok: false, error: 'The backup has no drawings section.' };
  return { ok: true, backup: b as FullBackup };
}

export async function collectBackup(): Promise<FullBackup> {
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith('uev_')) entries[k] = localStorage.getItem(k) || '';
  }
  return buildBackup(entries, await listAllSheets());
}

export function downloadBackup(b: FullBackup, label = 'uev_backup') {
  const stamp = b.created_at.replace(/[:T]/g, '-').slice(0, 16);
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${label}_${stamp}.uevbackup.json`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function restoreBackup(b: FullBackup): Promise<void> {
  // remove current app data first so nothing stale is left behind
  const old: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith('uev_') && !EXCLUDED_KEYS.has(k)) old.push(k); }
  old.forEach((k) => localStorage.removeItem(k));
  Object.entries(b.local_storage).forEach(([k, v]) => localStorage.setItem(k, v));
  await replaceAllSheets(b.takeoff_sheets.map(({ data_b64, ...rest }) => ({ ...rest, data: base64ToArrayBuffer(data_b64) }) as TakeoffSheet));
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
}
