import React from 'react';
import { ShieldCheck, Clock, FileText, Activity } from 'lucide-react';
import { AuditLog } from '../../types';
import { currencyCode } from '../../services/currency';

export const AuditLogsView: React.FC = () => {
  const auditLogs: AuditLog[] = [
    {
      id: 'log_1',
      timestamp: '2026-07-23 13:42:10',
      user: 'Er. S. N. Adhikari',
      role: 'Senior Division Engineer',
      module: 'Rate Analysis',
      action: 'UPDATE_RATE_ANALYSIS',
      details: 'Updated Zone Rate multiplier for Capital City (Labor: 1.0, Material: 1.0)'
    },
    {
      id: 'log_2',
      timestamp: '2026-07-23 12:15:30',
      user: 'Er. B. K. Sharma',
      role: 'Site Engineer',
      module: 'Measurement Book',
      action: 'ADD_MB_ROW',
      details: 'Logged 12.5 Cu.m. of M20 RCC Footing in Measurement Book'
    },
    {
      id: 'log_3',
      timestamp: '2026-07-23 10:05:00',
      user: 'System Admin',
      role: 'System Administrator',
      module: 'Restore Point Manager',
      action: 'CREATE_RESTORE_POINT',
      details: 'Created system checkpoint "UEV Milestone Baseline (v1.0)"'
    },
    {
      id: 'log_4',
      timestamp: '2026-07-22 16:30:00',
      user: 'Mr. Ramesh Karki',
      role: 'Accountant',
      module: 'IPC Bills',
      action: 'APPROVE_IPC',
      details: `Approved IPC #1 Net Disbursement ${currencyCode()} 240,125.00`
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              ADMINISTRATION
            </span>
            <span className="text-blue-200 text-xs font-mono">• Audit Log & History</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">System Audit Log & Trail</h2>
          <p className="text-xs text-blue-100 mt-1">
            Immutable log of all rate modifications, MB entries, contract approvals, and restore point actions for financial auditing.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          Recent Action Log Entries
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User & Role</th>
                <th className="p-2.5">Module</th>
                <th className="p-2.5">Action Code</th>
                <th className="p-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono text-slate-500">{log.timestamp}</td>
                  <td className="p-2.5">
                    <strong className="text-slate-900 block">{log.user}</strong>
                    <span className="text-[10px] text-slate-400 font-bold">{log.role}</span>
                  </td>
                  <td className="p-2.5 font-bold text-blue-700">{log.module}</td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-700">{log.action}</td>
                  <td className="p-2.5 text-slate-800">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
