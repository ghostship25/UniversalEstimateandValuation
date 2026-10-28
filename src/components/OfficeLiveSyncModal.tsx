import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Monitor,
  Globe,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  X,
  FileCheck,
  Zap,
  HelpCircle,
  ExternalLink,
  Code
} from 'lucide-react';
import { ProjectEstimate, ZoneInfo, ValuationMBRow } from '../types';
import {
  isElectronAvailable,
  generateMBExcelArrayBuffer,
  parseExcelBufferToMBUpdates
} from '../services/officeSyncService';

interface OfficeLiveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  zone: ZoneInfo;
  fiscalYear: string;
  showToast: (msg: string) => void;
  valuationRows?: ValuationMBRow[];
  setValuationRows?: React.Dispatch<React.SetStateAction<ValuationMBRow[]>>;
  activeBookId?: string;
}

export const OfficeLiveSyncModal: React.FC<OfficeLiveSyncModalProps> = ({
  isOpen,
  onClose,
  project,
  setProject,
  zone,
  fiscalYear,
  showToast,
  valuationRows,
  setValuationRows,
  activeBookId
}) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchedFilePath, setWatchedFilePath] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    const desktopMode = isElectronAvailable();
    setIsDesktop((prev) => (prev !== desktopMode ? desktopMode : prev));

    if (!isOpen) return;

    if (desktopMode && window.electronAPI) {
      // Listen for background file updates from MS Excel / LibreOffice
      const cleanup = window.electronAPI.onXlsxUpdated((data) => {
        try {
          const { updatedProject, updatedValuationRows, updatedCount } = parseExcelBufferToMBUpdates(data.buffer, project, valuationRows, activeBookId);
          if (updatedCount > 0) {
            setProject(updatedProject);
            if (updatedValuationRows && setValuationRows) {
              setValuationRows(updatedValuationRows);
            }
            setSyncCount((prev) => prev + updatedCount);
            const timeStr = new Date().toLocaleTimeString();
            setLastSyncTime(timeStr);
            showToast(`⚡ Auto-Synced ${updatedCount} measurement sub-rows from MS Excel / LibreOffice! (${timeStr})`);
          }
        } catch (err) {
          console.error('Failed to parse watched Excel file update:', err);
        }
      });
      return () => {
        cleanup();
      };
    }
  }, [isOpen, project, setProject, valuationRows, setValuationRows, activeBookId, showToast]);

  if (!isOpen) return null;

  // Handle Export & Launch in MS Excel / LibreOffice / OnlyOffice
  const handleExportAndLaunch = async () => {
    setIsProcessing(true);
    try {
      const { buffer, fileName } = generateMBExcelArrayBuffer(project, zone, fiscalYear, valuationRows, activeBookId);

      if (isDesktop && window.electronAPI) {
        // Desktop Electron Mode: Write to disk & open native app
        const launchResult = await window.electronAPI.saveAndOpenXlsx(fileName, buffer);
        if (launchResult.success && launchResult.filePath) {
          setWatchedFilePath(launchResult.filePath);
          showToast(`🚀 Opened in local spreadsheet app: ${fileName}`);

          // Start auto-watcher
          const watchRes = await window.electronAPI.startWatchingXlsx(launchResult.filePath);
          if (watchRes.success) {
            setIsWatching(true);
            showToast('🟢 Live Excel file watching active! Save changes in Excel to auto-sync back.');
          }
        } else {
          showToast(`❌ Could not open native app: ${launchResult.error || 'Unknown error'}`);
        }
      } else {
        // Web Browser Mode: Trigger file download
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`📥 Exported "${fileName}". Open it in Excel or LibreOffice, then drop it back here to sync!`);
      }
    } catch (err) {
      showToast(`❌ Error launching Excel export: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Manual File Upload / Import (Web Mode or Manual Select)
  const handleFileProcess = async (fileBuffer: ArrayBuffer, fileName: string) => {
    setIsProcessing(true);
    try {
      const { updatedProject, updatedValuationRows, updatedCount } = parseExcelBufferToMBUpdates(fileBuffer, project, valuationRows, activeBookId);
      setProject(updatedProject);
      if (updatedValuationRows && setValuationRows) {
        setValuationRows(updatedValuationRows);
      }
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);
      setSyncCount((prev) => prev + updatedCount);
      showToast(`✅ Successfully synced ${updatedCount} measurement updates from "${fileName}"!`);
    } catch (err) {
      showToast(`❌ Failed to parse Excel file: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleFileProcess(evt.target.result as ArrayBuffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleFileProcess(evt.target.result as ArrayBuffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSelectLocalNativeFile = async () => {
    if (isDesktop && window.electronAPI) {
      const res = await window.electronAPI.selectFile();
      if (res) {
        handleFileProcess(res.buffer, res.filePath);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">MS Excel / LibreOffice Live Sync</h2>
              <p className="text-xs text-emerald-200/80">
                Direct integration with desktop spreadsheet applications (MS Excel, LibreOffice, OnlyOffice)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Runtime Environment Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isDesktop ? (
              <span className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Monitor className="w-3.5 h-3.5" />
                <span>Electron Standalone Desktop Mode</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                <Globe className="w-3.5 h-3.5" />
                <span>Web Browser Mode</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Primary Action Panel */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>1-Click Launch & Auto-Sync</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      {isDesktop
                        ? 'Export MB spreadsheet and launch directly in your installed MS Excel, LibreOffice, or OnlyOffice with real-time file watching.'
                        : 'Export MB spreadsheet for Excel/LibreOffice editing. Once edited and saved, drop the file below to sync updates into Universal Estimating & Valuation.'}
                    </p>
                  </div>
                  {isWatching && (
                    <span className="flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Live Watching Active</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportAndLaunch}
                    disabled={isProcessing}
                    className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDesktop ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Open & Live-Sync in Excel / Office</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Export & Open in Excel / LibreOffice</span>
                      </>
                    )}
                  </button>

                  {isDesktop && (
                    <button
                      type="button"
                      onClick={handleSelectLocalNativeFile}
                      className="px-4 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold rounded-xl text-xs flex items-center space-x-2 cursor-pointer transition-colors"
                    >
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Select Edited File</span>
                    </button>
                  )}
                </div>

                {watchedFilePath && (
                  <div className="text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-emerald-200 text-slate-700 truncate">
                    📍 Watched File: <span className="font-semibold">{watchedFilePath}</span>
                  </div>
                )}
              </div>

              {/* Status Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Total Synced Rows</span>
                    <span className="text-sm font-bold text-slate-800">{syncCount} updates synced</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Last Sync Timestamp</span>
                    <span className="text-sm font-bold text-slate-800">{lastSyncTime || 'Not synced yet'}</span>
                  </div>
                </div>
              </div>

              {/* Supported Dynamic Excel Edits */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Dynamic Excel Structural Edits Supported</span>
                </h4>
                <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                  <li><strong>Insert New Rows & Sub-Measurements:</strong> Insert new sub-rows anywhere under an item in Excel to create new sub-measurement rows in Universal Estimating & Valuation.</li>
                  <li><strong>Add Section Headings:</strong> Add rows with <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-bold">📌 Section Name</code> or blank dimensions to auto-create heading rows.</li>
                  <li><strong>Insert Custom Columns:</strong> Add new columns between Height (H) and Quantity to automatically populate custom formula fields.</li>
                  <li><strong>Edit Descriptions & Units:</strong> Change item descriptions, units, or measurement particulars directly inside Excel.</li>
                </ul>
              </div>

              {/* Drag & Drop Import Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Sync Edited Excel / CSV File Back to Universal Estimating & Valuation
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Drag and drop your saved <span className="text-emerald-700 font-bold">.xlsx</span> or{' '}
                    <span className="text-emerald-700 font-bold">.csv</span> file here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Or click below to browse from your computer
                  </p>
                  <label className="mt-3 inline-block px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-colors">
                    Browse Excel File
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Supported formats: MS Excel (.xlsx), LibreOffice Calc (.ods/.xlsx), OnlyOffice (.xlsx), CSV
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
