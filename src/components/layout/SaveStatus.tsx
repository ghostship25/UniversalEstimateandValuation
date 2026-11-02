import React from 'react';
import { useSaveStatus } from '../../services/saveStatus';

const DAY = 86400000;
export const SaveStatus: React.FC<{ hasData: boolean; onOpenBackup?: () => void }> = ({ hasData, onOpenBackup }) => {
  const { lastSavedAt, error, lastBackupAt } = useSaveStatus();
  const age = lastBackupAt ? Math.floor((Date.now() - lastBackupAt) / DAY) : null;
  const backupDue = hasData && (age === null || age >= 7);
  return (
    <div className="hidden sm:flex items-center space-x-2 border-l border-slate-700 pl-3" data-testid="save-status">
      {error ? (
        <button onClick={onOpenBackup} className="flex items-center gap-1.5 text-[10px] font-bold text-red-300 bg-red-950/70 border border-red-700 rounded px-1.5 py-0.5" title={error}>
          <span className="w-2 h-2 rounded-full bg-red-500" /> NOT SAVED
        </button>
      ) : (
        <span className="flex items-center gap-1.5 text-slate-300 text-[10px] font-mono" title="Changes are saved in this browser automatically">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
        </span>
      )}
      <button onClick={onOpenBackup} data-testid="backup-chip"
        className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${backupDue ? 'text-amber-300 bg-amber-950/60 border-amber-700' : 'text-slate-400 border-slate-700'}`}
        title="Open Backup & Restore">
        {age === null ? 'No backup yet' : age === 0 ? 'Backup today' : `Backup ${age}d ago`}
      </button>
    </div>
  );
};
