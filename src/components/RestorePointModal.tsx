import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Plus,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
  FileJson,
  AlertCircle
} from 'lucide-react';
import {
  ZoneInfo,
  ResourceMaster,
  RateNormItem,
  ProjectEstimate
} from '../types';

export interface RestorePointItem {
  id: string;
  name: string;
  createdAt: string;
  notes: string;
  data: {
    zones: ZoneInfo[];
    fiscalYears: string[];
    selectedZoneId: string;
    selectedFY: string;
    resources: ResourceMaster[];
    norms: RateNormItem[];
    project: ProjectEstimate;
  };
}

interface RestorePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: ZoneInfo[];
  setZones: React.Dispatch<React.SetStateAction<ZoneInfo[]>>;
  fiscalYears: string[];
  setFiscalYears: React.Dispatch<React.SetStateAction<string[]>>;
  selectedZone: ZoneInfo;
  setSelectedZone: (d: ZoneInfo) => void;
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  resources: ResourceMaster[];
  setResources: React.Dispatch<React.SetStateAction<ResourceMaster[]>>;
  norms: RateNormItem[];
  setNorms: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  showToast: (msg: string) => void;
}

const STORAGE_KEY = 'uev_system_restore_points';

export const RestorePointModal: React.FC<RestorePointModalProps> = ({
  isOpen,
  onClose,
  zones,
  setZones,
  fiscalYears,
  setFiscalYears,
  selectedZone,
  setSelectedZone,
  selectedFY,
  setSelectedFY,
  resources,
  setResources,
  norms,
  setNorms,
  project,
  setProject,
  showToast
}) => {
  const [restorePoints, setRestorePoints] = useState<RestorePointItem[]>([]);
  const [newPointName, setNewPointName] = useState('');
  const [newPointNotes, setNewPointNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load restore points from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRestorePoints(parsed);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load restore points from localStorage:', e);
    }

    // Default Baseline Checkpoint if none exists
    const initialBaseline: RestorePointItem = {
      id: 'rp_baseline_v1',
      name: 'Milestone Baseline (v1.0)',
      createdAt: new Date().toISOString(),
      notes: 'Official system baseline checkpoint with Norms, Zone Rates, MB, and BOQ Engine.',
      data: {
        zones,
        fiscalYears,
        selectedZoneId: selectedZone.id,
        selectedFY,
        resources,
        norms,
        project
      }
    };

    setRestorePoints([initialBaseline]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialBaseline]));
  }, []);

  if (!isOpen) return null;

  // Save current system state as a new Restore Point
  const handleCreateRestorePoint = () => {
    const pointName = newPointName.trim() || `Checkpoint ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    const newPoint: RestorePointItem = {
      id: `rp_${Date.now()}`,
      name: pointName,
      createdAt: new Date().toISOString(),
      notes: newPointNotes.trim() || 'User created system restore point.',
      data: {
        zones,
        fiscalYears,
        selectedZoneId: selectedZone.id,
        selectedFY,
        resources,
        norms,
        project
      }
    };

    const updatedPoints = [newPoint, ...restorePoints];
    setRestorePoints(updatedPoints);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPoints));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    setNewPointName('');
    setNewPointNotes('');
    setIsCreating(false);
    showToast(`Restore point "${pointName}" successfully created.`);
  };

  // Restore state from a selected restore point
  const handleApplyRestorePoint = (point: RestorePointItem) => {
    if (!window.confirm(`Are you sure you want to restore system state to "${point.name}"? Unsaved changes will be replaced.`)) {
      return;
    }

    try {
      const d = point.data;
      if (d.zones && Array.isArray(d.zones)) setZones(d.zones);
      if (d.fiscalYears && Array.isArray(d.fiscalYears)) setFiscalYears(d.fiscalYears);
      if (d.resources && Array.isArray(d.resources)) setResources(d.resources);
      if (d.norms && Array.isArray(d.norms)) setNorms(d.norms);
      if (d.project) setProject(d.project);

      if (d.selectedZoneId) {
        const foundDist = (d.zones || zones).find((x) => x.id === d.selectedZoneId);
        if (foundDist) setSelectedZone(foundDist);
      }
      if (d.selectedFY) setSelectedFY(d.selectedFY);

      showToast(`System restored to checkpoint: "${point.name}".`);
      onClose();
    } catch (err) {
      alert('Error applying restore point: Invalid data structure.');
      console.error(err);
    }
  };

  // Delete a restore point from list
  const handleDeleteRestorePoint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = restorePoints.filter((p) => p.id !== id);
    setRestorePoints(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    showToast('Restore point deleted.');
  };

  // Export a Restore Point to downloadable JSON file
  const handleExportRestorePoint = (point: RestorePointItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(point, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeName = point.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `RESTORE_POINT_${safeName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported "${point.name}" JSON restore file.`);
  };

  // Import a Restore Point JSON file from user PC
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Check if it's a single restore point or system snapshot
        let importedPoint: RestorePointItem;

        if (parsed.data && parsed.data.resources && parsed.data.norms) {
          importedPoint = {
            id: `rp_imp_${Date.now()}`,
            name: parsed.name || `Imported Point (${file.name})`,
            createdAt: parsed.createdAt || new Date().toISOString(),
            notes: parsed.notes || `Imported from file ${file.name}`,
            data: parsed.data
          };
        } else if (parsed.resources && parsed.norms) {
          // Plain state snapshot
          importedPoint = {
            id: `rp_imp_${Date.now()}`,
            name: `Imported Snapshot (${file.name})`,
            createdAt: new Date().toISOString(),
            notes: `Imported system backup file ${file.name}`,
            data: {
              zones: parsed.zones || zones,
              fiscalYears: parsed.fiscalYears || fiscalYears,
              selectedZoneId: parsed.selectedZoneId || selectedZone.id,
              selectedFY: parsed.selectedFY || selectedFY,
              resources: parsed.resources,
              norms: parsed.norms,
              project: parsed.project || project
            }
          };
        } else {
          alert('Invalid Restore Point JSON file format.');
          return;
        }

        const updated = [importedPoint, ...restorePoints];
        setRestorePoints(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Prompt to apply immediately
        if (window.confirm(`Restore Point "${importedPoint.name}" imported! Apply now?`)) {
          handleApplyRestorePoint(importedPoint);
        } else {
          showToast(`Restore point "${importedPoint.name}" imported to list.`);
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
        console.error(err);
      }
    };
    reader.readAsText(file);

    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">System Restore Point Manager</h3>
              <p className="text-[11px] text-slate-500">Create system snapshots and restore state anytime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Top Control Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setIsCreating(true)}
            className="p-3.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 rounded-xl text-left transition flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-xs font-bold text-blue-950 group-hover:text-blue-700">
                Create New Restore Point
              </strong>
              <span className="text-[11px] text-blue-700">Snapshot current data & settings</span>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-left transition flex items-center gap-3 shadow-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-xs font-bold text-amber-950 group-hover:text-amber-700">
                Upload & Import JSON Backup
              </strong>
              <span className="text-[11px] text-amber-700">Restore from saved file on PC</span>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Form: Create New Restore Point */}
        {isCreating && (
          <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-3 animate-fadeIn">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              New System Snapshot Setup
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Restore Point Title</label>
                <input
                  type="text"
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  placeholder="e.g. Before Importing Capital City Zone Rates"
                  className="w-full p-2.5 border rounded-xl font-semibold bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  value={newPointNotes}
                  onChange={(e) => setNewPointNotes(e.target.value)}
                  placeholder="e.g. Validated BLD norms and initial MB quantities"
                  className="w-full p-2.5 border rounded-xl bg-white text-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-1.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRestorePoint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Save Restore Point
              </button>
            </div>
          </div>
        )}

        {/* Restore Points List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>Available System Checkpoints ({restorePoints.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">Click any point to restore</span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {restorePoints.map((point) => {
              const isBaseline = point.id === 'rp_baseline_v1';

              return (
                <div
                  key={point.id}
                  className="p-3.5 border rounded-xl bg-white hover:bg-slate-50 border-slate-200 transition flex items-center justify-between gap-3 shadow-sm group"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        {point.name}
                      </strong>
                      {isBaseline && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-300">
                          Baseline
                        </span>
                      )}
                    </div>
                    {point.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{point.notes}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(point.createdAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>Norms: {point.data?.norms?.length || 0}</span>
                      <span>•</span>
                      <span>BOQ Items: {point.data?.project?.items?.length || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Restore Button */}
                    <button
                      onClick={() => handleApplyRestorePoint(point)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                      title="Restore system state to this checkpoint"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>

                    {/* Export JSON Button */}
                    <button
                      onClick={(e) => handleExportRestorePoint(point, e)}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition"
                      title="Export as JSON Backup file"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete Button (non-baseline) */}
                    {!isBaseline && (
                      <button
                        onClick={(e) => handleDeleteRestorePoint(point.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete restore point"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t text-xs">
          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Restore points are saved in local browser storage and exportable as JSON files.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
