import React, { useState, useEffect } from 'react';
import { Database, Download, Terminal, RefreshCw, Layers, CheckCircle2, Copy, FileText, X } from 'lucide-react';
import { ProjectEstimate } from '../types';
import {
  executeRawSQL,
  downloadSQLiteDatabaseFile,
  generatePostgreSQLMigrationSQL,
  syncProjectToSQLite
} from '../db/sqliteEngine';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectEstimate;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, project }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'query' | 'postgresql'>('tables');
  const [sqlInput, setSqlInput] = useState<string>('SELECT * FROM boq_items LIMIT 10;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [tableStats, setTableStats] = useState<{ name: string; count: number }[]>([]);
  const [copiedPgSql, setCopiedPgSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      handleSyncAndRefresh();
    }
  }, [isOpen, project]);

  const handleSyncAndRefresh = async () => {
    setIsSyncing(true);
    try {
      await syncProjectToSQLite(project);
      const tables = ['projects', 'boq_items', 'mb_rows', 'zone_rates'];
      const stats = [];
      for (const t of tables) {
        try {
          const res = await executeRawSQL(`SELECT COUNT(*) AS total FROM ${t};`);
          const count = res.values[0] ? Number(res.values[0][0]) : 0;
          stats.push({ name: t, count });
        } catch {
          stats.push({ name: t, count: 0 });
        }
      }
      setTableStats(stats);
      runQuery(sqlInput);
    } catch (err: any) {
      console.error('[DatabaseModal] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const runQuery = async (queryStr: string) => {
    setQueryError(null);
    try {
      const res = await executeRawSQL(queryStr);
      setQueryResult(res);
    } catch (err: any) {
      setQueryError(err.message || 'Error executing SQL statement');
      setQueryResult(null);
    }
  };

  const pgSqlScript = generatePostgreSQLMigrationSQL(project);

  const handleCopyPgSql = () => {
    navigator.clipboard.writeText(pgSqlScript);
    setCopiedPgSql(true);
    setTimeout(() => setCopiedPgSql(false), 2000);
  };

  const handleDownloadPgSql = () => {
    const blob = new Blob([pgSqlScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_')}_postgresql.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                SQLite & PostgreSQL Database Console
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Offline Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Client-side SQLite engine with IndexedDB persistence & PostgreSQL migration export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAndRefresh}
              disabled={isSyncing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              title="Sync current project to SQLite DB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              Sync DB
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 bg-slate-950 border-b border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'tables'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            SQLite Tables & Schema
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'query'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            SQL Query Terminal
          </button>
          <button
            onClick={() => setActiveTab('postgresql')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'postgresql'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            PostgreSQL Migration Export
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tableStats.map((st) => (
                  <div key={st.name} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 block uppercase font-bold">{st.name}</span>
                    <span className="text-xl font-extrabold text-indigo-300">{st.count} <span className="text-xs font-normal text-slate-400">rows</span></span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>SQLite Offline Backup (.sqlite File)</span>
                  <button
                    onClick={() => downloadSQLiteDatabaseFile(`${(project.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_')}.sqlite`)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .sqlite Database
                  </button>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your project estimates, MB rows, rate analyses, and zone rates are compiled into a standalone SQLite binary database stored in IndexedDB. You can download the binary <code className="text-indigo-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">.sqlite</code> file anytime for offline local archiving.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'query' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Execute SQL Query (SQLite Engine)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSqlInput('SELECT * FROM boq_items LIMIT 10;'); runQuery('SELECT * FROM boq_items LIMIT 10;'); }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-indigo-300 border border-slate-700"
                    >
                      BOQ Items
                    </button>
                    <button
                      onClick={() => { setSqlInput('SELECT * FROM mb_rows LIMIT 10;'); runQuery('SELECT * FROM mb_rows LIMIT 10;'); }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-indigo-300 border border-slate-700"
                    >
                      MB Rows
                    </button>
                  </div>
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={sqlInput}
                    onChange={(e) => setSqlInput(e.target.value)}
                    rows={3}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter SQL statement..."
                  />
                  <button
                    onClick={() => runQuery(sqlInput)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition"
                  >
                    <Terminal className="w-4 h-4" />
                    Run Query
                  </button>
                </div>
              </div>

              {queryError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-mono">
                  ❌ Error: {queryError}
                </div>
              )}

              {queryResult && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 flex justify-between items-center">
                    <span>Query Output ({queryResult.values.length} rows returned)</span>
                  </div>
                  <div className="max-h-60 overflow-auto rounded-xl border border-slate-700 bg-slate-950">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                          {queryResult.columns.map((col) => (
                            <th key={col} className="p-2 border-r border-slate-700/50 font-bold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.values.length === 0 ? (
                          <tr>
                            <td colSpan={queryResult.columns.length || 1} className="p-4 text-center text-slate-500 italic">
                              No rows returned.
                            </td>
                          </tr>
                        ) : (
                          queryResult.values.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-800/60 hover:bg-slate-800/40 text-slate-300">
                              {row.map((cell: any, cIdx: number) => (
                                <td key={cIdx} className="p-2 border-r border-slate-800/60 whitespace-nowrap">
                                  {cell !== null && cell !== undefined ? String(cell) : <span className="text-slate-600">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'postgresql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">PostgreSQL Cloud Migration DDL Script</h3>
                  <p className="text-xs text-slate-400">Ready-to-execute SQL file containing DDL schema and current project data inserts.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPgSql}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedPgSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPgSql ? 'Copied!' : 'Copy SQL'}
                  </button>
                  <button
                    onClick={handleDownloadPgSql}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .sql File
                  </button>
                </div>
              </div>

              <textarea
                value={pgSqlScript}
                readOnly
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-indigo-300 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center px-5">
          <span>⚡ Universal Estimating & Valuation UEV Local Database Engine • Zero Latency • Works 100% Offline</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
