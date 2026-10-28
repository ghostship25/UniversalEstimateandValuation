import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  X,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { ProjectEstimate, ProjectSnapshot, AuditLog, ZoneInfo } from '../types';

interface ProjectSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectEstimate;
  setProject?: (updater: ProjectEstimate | ((prev: ProjectEstimate) => ProjectEstimate)) => void;
  selectedZone?: ZoneInfo;
  selectedFY?: string;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  showToast?: (msg: string) => void;
}

export const ProjectSnapshotModal: React.FC<ProjectSnapshotModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  isLocked,
  setIsLocked,
  showToast
}) => {
  const [lockReason, setLockReason] = useState('Official Technical Sanction by Senior Division Engineer');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleDateString('ne-NP') + ' 10:30 AM',
      user: 'Er. Rajesh Acharya',
      role: 'Senior Division Engineer',
      module: 'Project Initialization',
      action: 'INITIALIZE_SNAPSHOT',
      details: 'Master norms and FY 2026/27 zone rates locked into project snapshot.'
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleDateString('ne-NP') + ' 11:15 AM',
      user: 'Er. Rajesh Acharya',
      role: 'Senior Division Engineer',
      module: 'Estimate Sanction',
      action: 'TECHNICAL_SANCTION',
      details: 'Measurement Book verified and rate analysis baseline frozen.'
    }
  ]);

  if (!isOpen) return null;

  const handleToggleLock = () => {
    const newStatus = !isLocked;
    setIsLocked(newStatus);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: 'Current Active User',
      role: 'Project In-charge',
      module: 'Project Security',
      action: newStatus ? 'PROJECT_LOCKED' : 'PROJECT_UNLOCKED',
      details: newStatus ? `Project locked: "${lockReason}"` : 'Project unlocked for administrative amendments.'
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    showToast?.(newStatus ? 'Project rates and quantities locked.' : 'Project unlocked for editing.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLocked ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              {isLocked ? <Lock className="w-5 h-5 text-white" /> : <Unlock className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-black">Project Snapshot & Audit Lock</h2>
              <span className="text-xs text-slate-300 font-mono">
                Project ID: {project.id} | Fiscal Year: {project.fiscal_year}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
            isLocked ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider block">
                {isLocked ? '🔒 AUDIT LOCKED (IMMUTABLE SNAPSHOT)' : '✏️ EDITABLE DRAFT MODE'}
              </span>
              <p className="text-xs leading-relaxed">
                {isLocked
                  ? 'All master norms, zone rates, equipment parameters, and measurements in this project are locked. Central cost library updates will NOT affect this project.'
                  : 'Project is in editable draft status. Any modifications to norms or measurements will update current totals.'}
              </p>
            </div>

            <button
              onClick={handleToggleLock}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition shrink-0 cursor-pointer ${
                isLocked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isLocked ? 'Unlock Project' : 'Lock & Freeze Snapshot'}
            </button>
          </div>

          {/* Lock Reason input if unlocking/locking */}
          {!isLocked && (
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Locking Memo / Approval Reason</label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="e.g. Technical Sanction by BLD Division Office"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
          )}

          {/* Audit History Trail */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Project Audit Log Trail
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span className="font-mono">{log.timestamp}</span>
                    <span className="bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-700">{log.action}</span>
                  </div>
                  <div className="font-bold text-slate-900">{log.user} ({log.role})</div>
                  <p className="text-slate-600 text-[11px]">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
