import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  Check,
  Search,
  Cpu,
  Sparkles,
  X,
  ArrowRight,
  Plus,
  Star,
  Trash2,
  Copy,
  Download,
  Upload,
  UploadCloud,
  Layers,
  Edit3,
  BookmarkCheck,
  Info
} from 'lucide-react';
import { APP_FOLDER_CAD_TEMPLATES } from './templates';
import { CADTemplateDef, CADDimensionField } from './templates/types';
import { DrawingCategory } from './types';
import {
  loadUserCustomCADTemplates,
  saveOrUpdateCustomCADTemplate,
  deleteUserCustomCADTemplate,
  getDefaultCADTemplateIds,
  toggleDefaultCADTemplateStatus,
  exportCADTemplatesToJSON,
  parseAndImportCADTemplatesJSON
} from '../../services/templateStorage';

interface CADFolderTemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  activeTemplateId: string;
  onSelectTemplate: (template: CADTemplateDef) => void;
  category: DrawingCategory;
  onOpenUploadModal?: () => void;
  uploadedCount?: number;
  currentViewportParams?: Record<string, any>;
  onSaveAsCustomTemplate?: () => void;
}

export const CADFolderTemplateBrowser: React.FC<CADFolderTemplateBrowserProps> = ({
  isOpen,
  onClose,
  activeTemplateId,
  onSelectTemplate,
  category,
  onOpenUploadModal,
  uploadedCount = 0,
  currentViewportParams,
  onSaveAsCustomTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all'); // 'all', 'defaults', 'custom', or specific folderPath
  
  // Custom templates & defaults state
  const [customTemplates, setCustomTemplates] = useState<CADTemplateDef[]>([]);
  const [defaultTemplateIds, setDefaultTemplateIds] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // New Template Modal state
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState<{
    name: string;
    category: DrawingCategory;
    variantKey: string;
    description: string;
    tags: string;
    setAsDefault: boolean;
  }>({
    name: '',
    category: 'protection_wall',
    variantKey: 'rcc_l_wall',
    description: '',
    tags: 'Custom, CAD, Drawing',
    setAsDefault: true
  });

  // Import JSON modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Load user custom CAD templates and default IDs on open
  useEffect(() => {
    if (isOpen) {
      setCustomTemplates(loadUserCustomCADTemplates());
      setDefaultTemplateIds(getDefaultCADTemplateIds());
    }
  }, [isOpen]);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  if (!isOpen) return null;

  // Combine standard built-in templates with user custom templates
  const allTemplates: CADTemplateDef[] = [
    ...customTemplates,
    ...APP_FOLDER_CAD_TEMPLATES
  ];

  // Unique folders list
  const folders = Array.from(new Set(APP_FOLDER_CAD_TEMPLATES.map((t) => t.folderPath)));

  // Filter templates
  const filteredTemplates = allTemplates.filter((tpl) => {
    let matchesTab = true;
    if (activeFilterTab === 'defaults') {
      matchesTab = defaultTemplateIds.includes(tpl.id);
    } else if (activeFilterTab === 'custom') {
      matchesTab = Boolean(tpl.is_custom);
    } else if (activeFilterTab !== 'all') {
      matchesTab = tpl.folderPath === activeFilterTab;
    }

    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // Handle Toggle Default
  const handleToggleDefault = (templateId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowDefault = toggleDefaultCADTemplateStatus(templateId);
    setDefaultTemplateIds(getDefaultCADTemplateIds());
    showFeedback(
      isNowDefault ? '⭐ Set as Default Template!' : 'Removed from Default Templates.',
      'info'
    );
  };

  // Handle Delete Custom Template
  const handleDeleteCustom = (templateId: string, templateName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom template "${templateName}"?`)) {
      const updated = deleteUserCustomCADTemplate(templateId);
      setCustomTemplates(updated);
      setDefaultTemplateIds(getDefaultCADTemplateIds());
      showFeedback(`Deleted custom template "${templateName}".`, 'info');
    }
  };

  // Handle Duplicate Template to Custom
  const handleDuplicateToCustom = (tpl: CADTemplateDef, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `custom_cad_${Date.now()}`;
    const duplicated: CADTemplateDef = {
      ...tpl,
      id: newId,
      name: `${tpl.name} (Custom Copy)`,
      description: `Customized from ${tpl.name}. ${tpl.description}`,
      is_custom: true,
      folderPath: '/user/custom/drawings/',
      fileName: `Custom_${tpl.variantKey}_${newId.slice(-4)}.cad`,
      tags: [...(tpl.tags || []), 'Custom', 'UserCopy'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = saveOrUpdateCustomCADTemplate(duplicated);
    setCustomTemplates(updated);
    showFeedback(`Created custom copy "${duplicated.name}"!`, 'success');
  };

  // Export Custom Templates to JSON
  const handleExportJSON = () => {
    const templatesToExport = customTemplates.length > 0 ? customTemplates : allTemplates;
    exportCADTemplatesToJSON(templatesToExport, `cad_templates_export_${new Date().toISOString().slice(0, 10)}.json`);
    showFeedback(`Exported ${templatesToExport.length} CAD templates to JSON file!`, 'success');
  };

  // Import JSON Submit
  const handleImportJSONSubmit = () => {
    if (!importJsonText.trim()) return;
    try {
      const imported = parseAndImportCADTemplatesJSON(importJsonText);
      setCustomTemplates(loadUserCustomCADTemplates());
      setDefaultTemplateIds(getDefaultCADTemplateIds());
      setIsImportModalOpen(false);
      setImportJsonText('');
      showFeedback(`Successfully imported ${imported.length} custom CAD templates!`, 'success');
    } catch (err: any) {
      showFeedback(`Import error: ${err?.message || 'Invalid JSON format'}`, 'error');
    }
  };

  // Create New Custom Template from Scratch or Current Viewport
  const handleCreateNewTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateForm.name.trim()) return;

    // Find prototype template for default dimension fields & geometry defaults
    const proto = APP_FOLDER_CAD_TEMPLATES.find((t) => t.variantKey === newTemplateForm.variantKey) ||
      APP_FOLDER_CAD_TEMPLATES.find((t) => t.category === newTemplateForm.category) ||
      APP_FOLDER_CAD_TEMPLATES[0];

    const newId = `custom_cad_${Date.now()}`;
    const initialParams = (currentViewportParams && newTemplateForm.category === category)
      ? { ...currentViewportParams }
      : { ...proto.defaultParams };

    const newCADTemplate: CADTemplateDef = {
      id: newId,
      name: newTemplateForm.name.trim(),
      category: newTemplateForm.category,
      variantKey: newTemplateForm.variantKey,
      folderPath: '/user/custom/drawings/',
      fileName: `User_${newTemplateForm.category}_${newId.slice(-4)}.cad`,
      description: newTemplateForm.description.trim() || `User-created custom drawing template for ${newTemplateForm.name}.`,
      dimensionFields: proto.dimensionFields.map((f) => ({
        ...f,
        defaultValue: initialParams[f.key] !== undefined ? initialParams[f.key] : f.defaultValue
      })),
      defaultParams: initialParams,
      tags: newTemplateForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_custom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = saveOrUpdateCustomCADTemplate(newCADTemplate);
    setCustomTemplates(updated);

    if (newTemplateForm.setAsDefault) {
      toggleDefaultCADTemplateStatus(newId);
      setDefaultTemplateIds(getDefaultCADTemplateIds());
    }

    setIsNewTemplateModalOpen(false);
    showFeedback(`Created custom CAD template "${newCADTemplate.name}"!`, 'success');

    // Auto-select and load new template
    onSelectTemplate(newCADTemplate);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-2xl shadow-md shadow-indigo-600/30">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  CAD 2D Drawing Templates & Default Catalog
                </h3>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {allTemplates.length} Templates ({customTemplates.length} Custom)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Create user-defined drawing templates, set preferred default templates (⭐), and live-sync dimensions to the Measurement Book.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action: Create New CAD Template */}
            <button
              onClick={() => setIsNewTemplateModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
              title="Create a new custom template drawing"
            >
              <Plus className="w-4 h-4" />
              <span>Make New Template</span>
            </button>

            {/* Quick Action: Save Current Viewport as Template */}
            {onSaveAsCustomTemplate && (
              <button
                onClick={() => {
                  onClose();
                  onSaveAsCustomTemplate();
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition"
                title="Save current drawing section in viewport as a template"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Save Viewport Drawing</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-bold flex items-center justify-between transition-all shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-600 text-white'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation, Search & Controls Ribbon */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search template name, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs font-bold pb-1 md:pb-0">
            <button
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1 ${
                activeFilterTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>📁 All ({allTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveFilterTab('defaults')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeFilterTab === 'defaults'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>⭐ Default Templates ({defaultTemplateIds.length})</span>
            </button>

            <button
              onClick={() => setActiveFilterTab('custom')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeFilterTab === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>🎨 Custom Templates ({customTemplates.length})</span>
            </button>

            {folders.map((folder) => {
              const folderName = folder.split('/').filter(Boolean).pop() || folder;
              return (
                <button
                  key={folder}
                  onClick={() => setActiveFilterTab(folder)}
                  className={`px-2.5 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1 font-mono text-[11px] ${
                    activeFilterTab === folder
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Folder className="w-3 h-3 text-amber-500" />
                  <span>{folderName}/</span>
                </button>
              );
            })}
          </div>

          {/* Backup / Export / Import / Upload Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportJSON}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Export CAD templates as JSON backup file"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Import CAD templates from JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {onOpenUploadModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal();
                }}
                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                title="Upload external CAD DWG/DXF/PDF drawings"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload DWF/DXF ({uploadedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* CAD Templates Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Folder className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-extrabold text-sm text-slate-600">No template drawings match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Create a new template drawing or clear active filters.</p>
              <button
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Make First Custom Template</span>
              </button>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isActive = tpl.id === activeTemplateId;
              const isDefault = defaultTemplateIds.includes(tpl.id);
              const isCustom = Boolean(tpl.is_custom);

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                    isActive
                      ? 'bg-indigo-50/90 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Path, Custom Tag, Default Star */}
                    <div className="flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1 font-semibold truncate">
                          <FileCode className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">{tpl.folderPath}{tpl.fileName}</span>
                        </span>

                        {isCustom && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" />
                            <span>User Custom</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* ⭐ Star / Set as Default Button */}
                        <button
                          onClick={(e) => handleToggleDefault(tpl.id, e)}
                          className={`p-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1 transition ${
                            isDefault
                              ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={isDefault ? 'Designated as Default Template. Click to unstar.' : 'Click to Set as Default Template'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isDefault ? 'text-amber-500 fill-amber-500' : ''}`} />
                          <span className="text-[10px]">{isDefault ? 'Default' : 'Set Default'}</span>
                        </button>

                        {isActive && (
                          <span className="bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px]">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                        <span>{tpl.name}</span>
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Dimensions List Preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                        ⚡ Editable CAD Dimensions:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {tpl.dimensionFields.slice(0, 6).map((df) => (
                          <span
                            key={df.key}
                            className="bg-white border border-slate-200 font-mono text-[10px] font-bold text-slate-800 px-2 py-0.5 rounded-md"
                          >
                            {df.label}: <span className="text-indigo-700">{df.defaultValue}{df.unit}</span>
                          </span>
                        ))}
                        {tpl.dimensionFields.length > 6 && (
                          <span className="text-[10px] text-slate-400 font-mono self-center">
                            +{tpl.dimensionFields.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags & Action Buttons Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 gap-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {tpl.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Duplicate to Custom */}
                      <button
                        onClick={(e) => handleDuplicateToCustom(tpl, e)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Duplicate as user custom template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete if custom */}
                      {isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(tpl.id, tpl.name, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Load Button */}
                      <button
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 text-white group-hover:bg-indigo-600'
                        }`}
                      >
                        <span>Load Template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-slate-900 text-slate-300 text-xs flex items-center justify-between shrink-0 border-t border-slate-800 font-mono">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>CAD Template Engine • Marked Default Templates Auto-load in Estimation Projects</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-sans font-semibold">
              Tip: Star (⭐) templates to make them your default templates!
            </span>
          </div>
        </div>
      </div>

      {/* CREATE NEW TEMPLATE MODAL */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Create Custom Template Drawing</h4>
                  <p className="text-xs text-slate-500">Design a reusable CAD section template for your projects</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 3.0m Battered Cantilever Protection Wall"
                  value={newTemplateForm.name}
                  onChange={(e) => setNewTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Structure Category
                  </label>
                  <select
                    value={newTemplateForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as DrawingCategory;
                      let defaultVariant = 'rcc_l_wall';
                      if (cat === 'drain') defaultVariant = 'rectangular';
                      else if (cat === 'road') defaultVariant = 'flexible_asphalt';
                      else if (cat === 'culvert') defaultVariant = 'box_single';
                      setNewTemplateForm((p) => ({ ...p, category: cat, variantKey: defaultVariant }));
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="protection_wall">Protection Wall</option>
                    <option value="drain">Roadside Drain</option>
                    <option value="road">Road Cross-Section</option>
                    <option value="culvert">Culvert Cross-Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Geometry Base Variant
                  </label>
                  <select
                    value={newTemplateForm.variantKey}
                    onChange={(e) => setNewTemplateForm((p) => ({ ...p, variantKey: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    {newTemplateForm.category === 'protection_wall' && (
                      <>
                        <option value="stone_masonry">1. Stone Masonry Wall</option>
                        <option value="rcc_l_wall">2. RCC L Protection Wall (Bed PCC + Wall Component)</option>
                        <option value="plum_concrete_equal">3. Equal Width Plum Concrete Wall (Vertical)</option>
                        <option value="plum_concrete_unequal">4. Unequal Width Plum Concrete Wall (Battered)</option>
                        <option value="brick_masonry">5. Brick Masonry Wall</option>
                        <option value="custom_wall">6. Custom Protection Wall</option>
                      </>
                    )}
                    {newTemplateForm.category === 'drain' && (
                      <>
                        <option value="rectangular">Rectangular RCC/PCC Drain</option>
                        <option value="trapezoidal">Trapezoidal Masonry Drain</option>
                      </>
                    )}
                    {newTemplateForm.category === 'road' && (
                      <>
                        <option value="flexible_asphalt">Flexible Asphalt Road</option>
                        <option value="rigid_concrete">Rigid Concrete Pavement</option>
                      </>
                    )}
                    {newTemplateForm.category === 'culvert' && (
                      <>
                        <option value="box_single">Single Cell Box Culvert</option>
                        <option value="pipe_rcc">RCC NP3/NP4 Pipe Culvert</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Heavy duty cantilever retaining wall designed for 3m cutting with 0.5m toe & 1:4 stone soling..."
                  value={newTemplateForm.description}
                  onChange={(e) => setNewTemplateForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Protection Wall, RCC, Default, Mountain"
                  value={newTemplateForm.tags}
                  onChange={(e) => setNewTemplateForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-900">Mark as Default Template (⭐)</span>
                </div>
                <input
                  type="checkbox"
                  checked={newTemplateForm.setAsDefault}
                  onChange={(e) => setNewTemplateForm((p) => ({ ...p, setAsDefault: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
                >
                  Save & Load Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT JSON MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Import CAD Templates JSON</h4>
                  <p className="text-xs text-slate-500">Paste exported templates JSON or load a backup</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                rows={8}
                placeholder="Paste CAD templates JSON content here..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJSONSubmit}
                  disabled={!importJsonText.trim()}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition"
                >
                  Import Templates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
