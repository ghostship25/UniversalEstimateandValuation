import { describe, it, expect } from 'vitest';
import { buildBackup, validateBackup, arrayBufferToBase64, base64ToArrayBuffer, BACKUP_VERSION } from '../src/services/fullBackup';

describe('full backup', () => {
  const sheet: any = { id: 's1', projectKey: 'p1:estimate', name: 'plan.pdf', kind: 'pdf', data: new Uint8Array([0, 1, 2, 250, 255]).buffer, pageScales: { 1: 0.1 }, outUnit: 'm', measurements: [], updatedAt: 1 };
  const entries = {
    uev_projects_v1: JSON.stringify([{ id: 'p1', items: [{}, {}, {}] }, { id: 'p2', items: [{}] }]),
    uev_contract_v1: JSON.stringify({ retention_percent: 7 }),
    uev_initiation_lock_pwd_v1: 'secret',
    uev_last_backup_at: '123',
    other_app_key: 'x',
  };
  it('keeps uev data, never the password or foreign keys, and counts the content', () => {
    const b = buildBackup(entries, [sheet]);
    expect(Object.keys(b.local_storage).sort()).toEqual(['uev_contract_v1', 'uev_projects_v1']);
    expect(b.summary).toMatchObject({ projects: 2, items: 4, takeoff_sheets: 1, keys: 2 });
  });
  it('round-trips drawing bytes through base64', () => {
    const b = buildBackup(entries, [sheet]);
    const back = new Uint8Array(base64ToArrayBuffer(b.takeoff_sheets[0].data_b64));
    expect(Array.from(back)).toEqual([0, 1, 2, 250, 255]);
    expect(arrayBufferToBase64(new Uint8Array([72, 105]).buffer)).toBe('SGk=');
  });
  it('accepts its own output', () => expect(validateBackup(JSON.parse(JSON.stringify(buildBackup(entries, [sheet])))).ok).toBe(true));
  it('rejects wrong or damaged files', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({ file_type: 'SOMETHING' }).ok).toBe(false);
    expect(validateBackup({ file_type: 'UEV_FULL_BACKUP', version: BACKUP_VERSION + 1, local_storage: {}, takeoff_sheets: [] }).ok).toBe(false);
    expect(validateBackup({ file_type: 'UEV_FULL_BACKUP', version: 1, local_storage: { uev_projects_v1: '[{broken' }, takeoff_sheets: [] }).ok).toBe(false);
    expect(validateBackup({ file_type: 'UEV_FULL_BACKUP', version: 1, local_storage: { evil_key: '1' }, takeoff_sheets: [] }).ok).toBe(false);
  });
});
