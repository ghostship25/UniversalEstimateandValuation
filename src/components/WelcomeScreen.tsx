import React, { useState, useRef } from 'react';
import {
  FileCode,
  FolderPlus,
  FolderOpen,
  Clock,
  Settings as SettingsIcon,
  ArrowRight,
  Upload,
  Plus,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { MasterTemplate, UEVProject, RecentFile } from '../types';
import { STANDARD_TEMPLATES } from '../data/standardTemplates';

interface WelcomeScreenProps {
  onNewTemplate: () => void;
  onOpenTemplate: (template: MasterTemplate) => void;
  onNewProject: () => void;
  onOpenProject: (project: any) => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNavigateToSettings: () => void;
  onExitToWorkspace: () => void;
  recentFiles: RecentFile[];
  activeProject?: any;
  activeTemplate?: MasterTemplate;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNewTemplate,
  onOpenTemplate,
  onNewProject,
  onOpenProject,
  onImportFile,
  onNavigateToSettings,
  onExitToWorkspace,
  recentFiles,
  activeProject,
  activeTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'projects' | 'recent'>('templates');
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-900">
      {/* Top Header Bar */}
      <div className="bg-red-700 text-white px-6 py-4 border-b-4 border-blue-900 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-inner border border-red-200 shrink-0">
            <span className="text-xl">🇳🇵</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              Universal Estimating & Valuation (Civil Infrastructure Engine)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept=".uet,.uep,.json"
            onChange={onImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow border border-blue-700"
          >
            <Upload className="w-4 h-4 text-amber-300" />
            <span>Import File (.uet / .uep)</span>
          </button>

          {(activeProject || activeTemplate) && (
            <button
              onClick={onExitToWorkspace}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow border border-slate-700"
            >
              <span>Return to Workbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container with Horizontal Tabs at Top */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col">
        {/* Horizontal Navigation Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'templates'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-300" />
              <span>Master Templates (.uet)</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'projects'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-300" />
              <span>Project Estimates (.uep)</span>
            </button>

            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'recent'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-4 h-4 text-slate-300" />
              <span>Recent Files ({recentFiles.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pr-2">
            <button
              onClick={onNavigateToSettings}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-slate-200"
            >
              <SettingsIcon className="w-4 h-4 text-slate-600" />
              <span>System Settings</span>
            </button>
            <button
              onClick={onExitToWorkspace}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          {/* TAB 1: MASTER TEMPLATES (.uet) */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-900" />
                  Master Templates (.uet) Library
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Master templates contain departmental norms, zone rate schedules, and fiscal year configurations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={onNewTemplate}
                  className="bg-slate-50 hover:bg-blue-50/80 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 transition cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                    <Plus className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-900 transition">
                      Create New Master Template
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Start a blank departmental norms & zone rate master
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-2xl p-6 transition cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                    <FolderOpen className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-slate-800 transition">
                      Open Existing Template (.uet)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload and load a master template file from your computer
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Preloaded Standard Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STANDARD_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => onOpenTemplate(tmpl)}
                      className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-xl transition cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="bg-blue-900 text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                            {tmpl.department}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">FY {tmpl.fiscal_year}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-2 group-hover:text-blue-900 transition">
                          {tmpl.template_name}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-blue-700 font-bold pt-2 border-t border-slate-200">
                        <span>Load Template</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECT ESTIMATES (.uep) */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-red-700" />
                  Project Estimates (.uep) Workspace
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Project estimates hold measurement books, BOQ abstracts, rate analyses, and resource quantities for specific construction projects.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={onNewProject}
                  className="bg-slate-50 hover:bg-red-50/80 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-6 transition cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-700 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                    <FolderPlus className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-red-700 transition">
                      Create New Project Estimate
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Start a new estimate by attaching an active master template
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-50 hover:bg-red-50/80 border border-slate-200 hover:border-red-400 rounded-2xl p-6 transition cursor-pointer group flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                    <FolderOpen className="w-6 h-6 text-red-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-slate-800 transition">
                      Open Project File (.uep)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload and resume a saved .uep project estimate from disk
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECENT FILES */}
          {activeTab === 'recent' && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-700" />
                    Recently Opened Files
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Quickly access your recently edited templates and project estimates.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {recentFiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium">No recent files opened yet.</p>
                  </div>
                ) : (
                  recentFiles.map((rf) => (
                    <div
                      key={rf.id}
                      className="p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-red-300 rounded-xl transition flex items-center justify-between group shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {rf.file_type === 'template' ? (
                            <span className="bg-blue-900 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 rounded">
                              .AST TEMPLATE
                            </span>
                          ) : (
                            <span className="bg-red-700 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 rounded">
                              .ASP PROJECT
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition">
                            {rf.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 font-mono">
                          <span>Zone: <strong className="text-slate-700">{rf.zone}</strong></span>
                          <span>•</span>
                          <span>FY: <strong className="text-slate-700">{rf.fiscal_year}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-slate-400">{rf.last_opened}</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-700 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="bg-slate-900 text-slate-300 text-xs py-3 px-6 text-center font-medium border-t border-slate-800">
        Designed and developed by Er. Raju Acharya
      </footer>
    </div>
  );
};
