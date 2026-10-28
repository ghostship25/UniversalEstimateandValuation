import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  FileText,
  Edit3,
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Save,
  RotateCcw,
  Printer,
  CheckCircle2,
  Sparkles,
  Columns,
  Table,
  PenTool,
  Sliders,
  Settings,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Building2,
  FileSpreadsheet,
  Ruler,
  Boxes,
  Receipt,
  Award,
  Download,
  Upload,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import {
  PrintFrameTemplate,
  DEFAULT_FRAME_TEMPLATES,
  loadAllFrameTemplates,
  saveFrameTemplate,
  resetFrameTemplateToDefault,
  PrintFrameColumn,
  PrintFrameSignatory
} from '../data/frameTemplatePresets';
import { HeadingItem } from '../data/templatePresets';
import { ProjectEstimate } from '../types';
import { currencyCode } from '../services/currency';

interface TemplateStructureFrameEditorProps {
  project?: ProjectEstimate;
  onUpdateProject?: (updatedProject: ProjectEstimate) => void;
  initialModule?: 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate';
}

export const TemplateStructureFrameEditor: React.FC<TemplateStructureFrameEditorProps> = ({
  project,
  onUpdateProject,
  initialModule = 'boq'
}) => {
  // All templates in memory/storage
  const [allTemplates, setAllTemplates] = useState<PrintFrameTemplate[]>(() => loadAllFrameTemplates());
  const [selectedModule, setSelectedModule] = useState<'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate'>(initialModule);
  
  // Active template being edited
  const activeTemplate = useMemo(() => {
    const found = allTemplates.find((t) => t.module === selectedModule);
    return found || allTemplates[0] || DEFAULT_FRAME_TEMPLATES[0];
  }, [allTemplates, selectedModule]);

  // Working copy of current template for editing
  const [currentTemplate, setCurrentTemplate] = useState<PrintFrameTemplate>(() => JSON.parse(JSON.stringify(activeTemplate)));

  // When module changes, update working copy
  useEffect(() => {
    const found = allTemplates.find((t) => t.module === selectedModule) || DEFAULT_FRAME_TEMPLATES.find((t) => t.module === selectedModule) || DEFAULT_FRAME_TEMPLATES[0];
    setCurrentTemplate(JSON.parse(JSON.stringify(found)));
  }, [selectedModule, allTemplates]);

  // Active component editing tab:
  // 'headings' | 'header' | 'columns' | 'summary' | 'signatories' | 'layout'
  const [activeTab, setActiveTab] = useState<'headings' | 'header' | 'columns' | 'summary' | 'signatories' | 'layout'>('headings');

  // Preview zoom level & layout view mode
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewViewMode, setPreviewViewMode] = useState<'split' | 'preview_only' | 'editor_only'>('split');
  // Content mode: default to 'blank' clean ruled lines with no placeholder numbers or mock data
  const [sheetContentMode, setSheetContentMode] = useState<'blank' | 'sample'>('blank');

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ----------------------------------------------------------------------------------
  // SAVE / RESET / APPLY ACTIONS
  // ----------------------------------------------------------------------------------

  const handleSaveTemplate = () => {
    const updatedList = saveFrameTemplate(currentTemplate);
    setAllTemplates(updatedList);
    showToast(`Template structure "${currentTemplate.name}" saved successfully to system storage!`);
  };

  const handleResetToDefault = () => {
    if (window.confirm(`Reset "${currentTemplate.name}" to Government Standard Default? Custom changes will be restored to official presets.`)) {
      const reset = resetFrameTemplateToDefault(currentTemplate.id);
      setCurrentTemplate(JSON.parse(JSON.stringify(reset)));
      const updatedList = loadAllFrameTemplates();
      setAllTemplates(updatedList);
      showToast(`Template restored to Standard template.`);
    }
  };

  const handleApplyToActiveProject = () => {
    if (!project || !onUpdateProject) {
      showToast('No active project found to apply template.');
      return;
    }

    const updated = {
      ...project,
      header_config: {
        ...(project.header_config || {}),
        office_name: currentTemplate.header.office_name,
        department_name: currentTemplate.header.department_text,
        ministry_name: currentTemplate.header.ministry_text,
        location: currentTemplate.header.location_text,
        document_title: currentTemplate.header.document_title_en,
        form_number: currentTemplate.header.form_number,
      },
      // If template contains signatories, update project signatories
      signatories: currentTemplate.signatories.map((s, idx) => ({
        id: s.id || `sig_${idx}`,
        name: s.designation_en || 'Officer',
        designation: `${s.role_en} (${s.designation_en})`,
        role: (idx === 0 ? 'prepared' : idx === 1 ? 'checked' : 'approved') as any,
        date: new Date().toISOString().split('T')[0]
      }))
    };

    onUpdateProject(updated);
    showToast(`Applied "${currentTemplate.name}" frame & letterhead to Active Project "${project.title}"!`);
  };

  const handlePrintPreview = () => {
    window.print();
  };

  // Export as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentTemplate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentTemplate.id}_structure_frame.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Template JSON exported.');
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && parsed.header && parsed.headings && parsed.columns) {
          setCurrentTemplate(parsed);
          saveFrameTemplate(parsed);
          setAllTemplates(loadAllFrameTemplates());
          showToast('Custom template frame imported successfully.');
        } else {
          alert('Invalid template JSON structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // ----------------------------------------------------------------------------------
  // RIBBON COMMAND LISTENERS
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    const handleSave = () => handleSaveTemplate();
    const handleApply = () => handleApplyToActiveProject();
    const handleReset = () => handleResetToDefault();
    const handlePrint = () => handlePrintPreview();
    const handleExport = () => handleExportJSON();
    const handleSetModule = (e: any) => {
      if (e.detail && ['boq', 'estimate', 'mb', 'resource', 'valuation-mb', 'valuation', 'completion-certificate'].includes(e.detail)) {
        setSelectedModule(e.detail);
      }
    };
    const handleSetTab = (e: any) => {
      if (e.detail && ['headings', 'header', 'columns', 'summary', 'signatories', 'layout'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    const handleToggleContentMode = () => {
      setSheetContentMode((prev) => {
        const next = prev === 'blank' ? 'sample' : 'blank';
        showToast(next === 'blank' ? 'Switched to Default Blank Ruled Sheet' : 'Switched to Sample Values preview');
        return next;
      });
    };
    const handleSetViewMode = (e: any) => {
      if (e.detail && ['split', 'preview_only', 'editor_only'].includes(e.detail)) {
        setPreviewViewMode(e.detail);
      }
    };

    window.addEventListener('uev:frame-editor-save', handleSave);
    window.addEventListener('uev:frame-editor-apply', handleApply);
    window.addEventListener('uev:frame-editor-reset', handleReset);
    window.addEventListener('uev:frame-editor-print', handlePrint);
    window.addEventListener('uev:frame-editor-export', handleExport);
    window.addEventListener('uev:frame-editor-set-module', handleSetModule as any);
    window.addEventListener('uev:frame-editor-set-tab', handleSetTab as any);
    window.addEventListener('uev:frame-editor-toggle-content-mode', handleToggleContentMode);
    window.addEventListener('uev:frame-editor-set-view-mode', handleSetViewMode as any);

    return () => {
      window.removeEventListener('uev:frame-editor-save', handleSave);
      window.removeEventListener('uev:frame-editor-apply', handleApply);
      window.removeEventListener('uev:frame-editor-reset', handleReset);
      window.removeEventListener('uev:frame-editor-print', handlePrint);
      window.removeEventListener('uev:frame-editor-export', handleExport);
      window.removeEventListener('uev:frame-editor-set-module', handleSetModule as any);
      window.removeEventListener('uev:frame-editor-set-tab', handleSetTab as any);
      window.removeEventListener('uev:frame-editor-toggle-content-mode', handleToggleContentMode);
      window.removeEventListener('uev:frame-editor-set-view-mode', handleSetViewMode as any);
    };
  }, [currentTemplate, project, sheetContentMode, allTemplates, selectedModule]);

  // ----------------------------------------------------------------------------------
  // HEADING MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handleHeadingChange = (index: number, field: keyof HeadingItem, value: any) => {
    const updated = [...currentTemplate.headings];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentTemplate({ ...currentTemplate, headings: updated });
  };

  const handleAddHeading = () => {
    const nextIndex = currentTemplate.headings.length + 1;
    const newHeading: HeadingItem = {
      id: `h_${Date.now()}`,
      code: `${nextIndex}.0`,
      title: 'New Section / Chapter Heading',
      description: 'Specifications and execution standards for this section',
      isMandatory: false
    };
    setCurrentTemplate({
      ...currentTemplate,
      headings: [...currentTemplate.headings, newHeading]
    });
  };

  const handleDeleteHeading = (index: number) => {
    if (currentTemplate.headings.length <= 1) {
      alert('A template must have at least one heading / section.');
      return;
    }
    const updated = currentTemplate.headings.filter((_, i) => i !== index);
    setCurrentTemplate({ ...currentTemplate, headings: updated });
  };

  const handleDuplicateHeading = (index: number) => {
    const target = currentTemplate.headings[index];
    const cloned: HeadingItem = {
      ...JSON.parse(JSON.stringify(target)),
      id: `h_${Date.now()}`,
      code: `${target.code} (Copy)`,
      title: `${target.title} (Duplicate)`
    };
    const updated = [...currentTemplate.headings];
    updated.splice(index + 1, 0, cloned);
    setCurrentTemplate({ ...currentTemplate, headings: updated });
  };

  const handleMoveHeading = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentTemplate.headings.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...currentTemplate.headings];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCurrentTemplate({ ...currentTemplate, headings: updated });
  };

  // ----------------------------------------------------------------------------------
  // HEADER & LETTERHEAD MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handleHeaderFieldChange = (field: keyof typeof currentTemplate.header, value: any) => {
    setCurrentTemplate({
      ...currentTemplate,
      header: { ...currentTemplate.header, [field]: value }
    });
  };

  const handleMetaFieldChange = (index: number, field: 'label_np' | 'label_en' | 'defaultValue' | 'visible', value: any) => {
    const updated = [...currentTemplate.header.meta_fields];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentTemplate({
      ...currentTemplate,
      header: { ...currentTemplate.header, meta_fields: updated }
    });
  };

  const handleAddMetaField = () => {
    const newField = {
      id: `meta_${Date.now()}`,
      label_en: 'New Field Label:',
      defaultValue: 'Default Placeholder Text',
      visible: true
    };
    setCurrentTemplate({
      ...currentTemplate,
      header: {
        ...currentTemplate.header,
        meta_fields: [...currentTemplate.header.meta_fields, newField]
      }
    });
  };

  const handleDeleteMetaField = (index: number) => {
    const updated = currentTemplate.header.meta_fields.filter((_, i) => i !== index);
    setCurrentTemplate({
      ...currentTemplate,
      header: { ...currentTemplate.header, meta_fields: updated }
    });
  };

  // ----------------------------------------------------------------------------------
  // COLUMN MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handleColumnChange = (index: number, field: keyof PrintFrameColumn, value: any) => {
    const updated = [...currentTemplate.columns];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentTemplate({ ...currentTemplate, columns: updated });
  };

  const handleAddColumn = () => {
    const newCol: PrintFrameColumn = {
      id: `col_${Date.now()}`,
      key: `custom_${Date.now()}`,
      label_en: 'Custom Col',
      width: '90px',
      align: 'center',
      visible: true
    };
    setCurrentTemplate({
      ...currentTemplate,
      columns: [...currentTemplate.columns, newCol]
    });
  };

  const handleDeleteColumn = (index: number) => {
    if (currentTemplate.columns.length <= 2) {
      alert('A table frame must have at least 2 columns.');
      return;
    }
    const updated = currentTemplate.columns.filter((_, i) => i !== index);
    setCurrentTemplate({ ...currentTemplate, columns: updated });
  };

  // ----------------------------------------------------------------------------------
  // SUMMARY MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handleSummaryChange = (field: keyof typeof currentTemplate.summary, value: any) => {
    setCurrentTemplate({
      ...currentTemplate,
      summary: { ...currentTemplate.summary, [field]: value }
    });
  };

  const handleNoteChange = (index: number, value: string) => {
    const updated = [...currentTemplate.summary.notes];
    updated[index] = value;
    setCurrentTemplate({
      ...currentTemplate,
      summary: { ...currentTemplate.summary, notes: updated }
    });
  };

  const handleAddNote = () => {
    setCurrentTemplate({
      ...currentTemplate,
      summary: {
        ...currentTemplate.summary,
        notes: [...currentTemplate.summary.notes, 'New technical note']
      }
    });
  };

  const handleDeleteNote = (index: number) => {
    const updated = currentTemplate.summary.notes.filter((_, i) => i !== index);
    setCurrentTemplate({
      ...currentTemplate,
      summary: { ...currentTemplate.summary, notes: updated }
    });
  };

  // ----------------------------------------------------------------------------------
  // SIGNATORY MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handleSignatoryChange = (index: number, field: keyof PrintFrameSignatory, value: any) => {
    const updated = [...currentTemplate.signatories];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentTemplate({ ...currentTemplate, signatories: updated });
  };

  const handleAddSignatory = () => {
    const newSig: PrintFrameSignatory = {
      id: `sig_${Date.now()}`,
      role_en: 'Recommended By',
      designation_en: 'Engineer / Finance Officer',
      office_text: 'Planning and Administration Section',
      show_date: true
    };
    setCurrentTemplate({
      ...currentTemplate,
      signatories: [...currentTemplate.signatories, newSig]
    });
  };

  const handleDeleteSignatory = (index: number) => {
    if (currentTemplate.signatories.length <= 1) {
      alert('At least one signatory box must exist.');
      return;
    }
    const updated = currentTemplate.signatories.filter((_, i) => i !== index);
    setCurrentTemplate({ ...currentTemplate, signatories: updated });
  };

  // ----------------------------------------------------------------------------------
  // PAGE STYLE MUTATION HANDLERS
  // ----------------------------------------------------------------------------------

  const handlePageStyleChange = (field: keyof typeof currentTemplate.pageStyle, value: any) => {
    setCurrentTemplate({
      ...currentTemplate,
      pageStyle: { ...currentTemplate.pageStyle, [field]: value }
    });
  };

  // ----------------------------------------------------------------------------------
  // MODULE NAVIGATION PILLS
  // ----------------------------------------------------------------------------------
  const modulesList = [
    { id: 'boq', label: 'BOQ Structure', icon: FileSpreadsheet,},
    { id: 'estimate', label: 'Estimate Frame', icon: Building2,},
    { id: 'mb', label: 'MB Structure', icon: Ruler,},
    { id: 'resource', label: 'Resource Frame', icon: Boxes,},
    { id: 'valuation-mb', label: 'Valuation MB', icon: Receipt,},
    { id: 'valuation', label: 'Valuation / IPC', icon: FileText,},
    { id: 'completion-certificate', label: 'Completion Certificate', icon: Award,},
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans">
      {/* Toast alert banner */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-emerald-400 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Template Structure & Print Frame Editor</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                Structure Component Level
              </span>
              {currentTemplate.is_custom && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-900/50 text-amber-300 border border-amber-700">
                  Custom Modified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Directly edit individual headings, letterhead fields, table column definitions, summary totals, and signatory blocks for printing.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleSaveTemplate}
            id="btn_save_frame_template"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
            title="Save changes to local browser storage"
          >
            <Save className="w-4 h-4" />
            Save Structure
          </button>

          {project && (
            <button
              onClick={handleApplyToActiveProject}
              id="btn_apply_frame_to_project"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition"
              title="Apply this letterhead and frame structure to active project"
            >
              <Sparkles className="w-4 h-4" />
              Apply to Project
            </button>
          )}

          <button
            onClick={handleResetToDefault}
            id="btn_reset_frame_template"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition"
            title="Reset this template back to government standard defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>

          <button
            onClick={handlePrintPreview}
            id="btn_print_frame_preview"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded transition"
            title="Print test document"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>

          <div className="h-5 w-px bg-slate-700 mx-1" />

          {/* JSON Export/Import */}
          <button
            onClick={handleExportJSON}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            title="Export Template Frame as JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <label
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer"
            title="Import Template Frame JSON"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </header>

      {/* Module Selector Ribbon */}
      <div className="bg-slate-850 border-b border-slate-700/80 px-5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex-shrink-0">
          Select Module:
        </span>
        {modulesList.map((m) => {
          const Icon = m.icon;
          const isActive = selectedModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id as any)}
              id={`module_btn_${m.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition flex-shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: The Component Editor */}
        <div className={`flex flex-col bg-slate-900 border-r border-slate-700 ${
          previewViewMode === 'editor_only' ? 'w-full' : previewViewMode === 'preview_only' ? 'hidden' : 'w-1/2 lg:w-5/12'
        } overflow-hidden transition-all duration-200`}>
          
          {/* Sub-component Navigation Tabs */}
          <div className="bg-slate-800 border-b border-slate-700 flex overflow-x-auto scrollbar-none px-2 pt-2">
            {[
              { id: 'headings', label: 'Headings & Sections', icon: Layers, count: currentTemplate.headings.length },
              { id: 'header', label: 'Document Letterhead', icon: Building2 },
              { id: 'columns', label: 'Table Columns', icon: Columns, count: currentTemplate.columns.filter(c => c.visible).length },
              { id: 'summary', label: 'Summary & Totals', icon: Table },
              { id: 'signatories', label: 'Signatories', icon: PenTool, count: currentTemplate.signatories.length },
              { id: 'layout', label: 'Page & Styling', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  id={`tab_comp_${tab.id}`}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-indigo-400 bg-slate-850'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-indigo-900/60 text-indigo-300' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: HEADINGS & SECTIONS HIERARCHY                          */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'headings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Template Chapter / Section Headings ({currentTemplate.headings.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Individual headings, codes, and descriptions.
                    </p>
                  </div>
                  <button
                    onClick={handleAddHeading}
                    id="btn_add_heading"
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Heading
                  </button>
                </div>

                <div className="space-y-3">
                  {currentTemplate.headings.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 hover:border-slate-600 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-bold">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={h.code}
                            onChange={(e) => handleHeadingChange(idx, 'code', e.target.value)}
                            placeholder="Code (e.g. 1.0)"
                            className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-indigo-500"
                            title="Heading Code / Chapter Number"
                          />
                        </div>

                        {/* Order & Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveHeading(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveHeading(idx, 'down')}
                            disabled={idx === currentTemplate.headings.length - 1}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateHeading(idx)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
                            title="Duplicate this heading"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHeading(idx)}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition"
                            title="Delete this heading"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* English Title */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          English Title / Heading
                        </label>
                        <input
                          type="text"
                          value={h.title}
                          onChange={(e) => handleHeadingChange(idx, 'title', e.target.value)}
                          placeholder="Heading title in English"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Title */}

                      {/* Description / Scope */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                          Scope / Specification Summary
                        </label>
                        <input
                          type="text"
                          value={h.description || ''}
                          onChange={(e) => handleHeadingChange(idx, 'description', e.target.value)}
                          placeholder="Brief technical description"
                          className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: DOCUMENT LETTERHEAD & HEADER FRAME                     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'header' && (
              <div className="space-y-4">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Official Letterhead & Authority Header
                  </h3>
                  
                  {/* Crest toggle */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-700">
                    <span className="text-xs text-slate-300 font-medium">Show National Emblem / Office Seal</span>
                    <button
                      onClick={() => handleHeaderFieldChange('authority_crest', !currentTemplate.header.authority_crest)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        currentTemplate.header.authority_crest ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {currentTemplate.header.authority_crest ? 'Enabled (Active)' : 'Disabled'}
                    </button>
                  </div>

                  {/* Level 1: Country */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
 Country / Governing Level (e.g.)
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.country_text}
                      onChange={(e) => handleHeaderFieldChange('country_text', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Level 2: Ministry */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Ministry / Council / Zone Coordination
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.ministry_text}
                      onChange={(e) => handleHeaderFieldChange('ministry_text', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Level 3: Office Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
 Office / Local Authority Name
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.office_name}
                      onChange={(e) => handleHeaderFieldChange('office_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Level 4: Department */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
 Department / Section / Ward No.
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.department_text}
                      onChange={(e) => handleHeaderFieldChange('department_text', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Office Location / Zone
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.location_text}
                      onChange={(e) => handleHeaderFieldChange('location_text', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Document Main Titles */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Document Main Title & Form Number
                  </h3>


                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Main Document Title (English)
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.document_title_en}
                      onChange={(e) => handleHeaderFieldChange('document_title_en', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
 Form Number / Statutory Annex
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.header.form_number}
                      onChange={(e) => handleHeaderFieldChange('form_number', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Project Metadata Fields */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Project Information Metadata Labels
                    </h3>
                    <button
                      onClick={handleAddMetaField}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                      Add Field
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentTemplate.header.meta_fields.map((field, idx) => (
                      <div
                        key={field.id || idx}
                        className="bg-slate-900 p-2 rounded border border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={field.label_en}
                            onChange={(e) => handleMetaFieldChange(idx, 'label_en', e.target.value)}
                            placeholder="English Label"
                            className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          />
                          <button
                            onClick={() => handleMetaFieldChange(idx, 'visible', !field.visible)}
                            className={`p-1 rounded ${field.visible ? 'text-indigo-400' : 'text-slate-600'}`}
                            title={field.visible ? 'Visible' : 'Hidden'}
                          >
                            {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteMetaField(idx)}
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                            title="Delete this field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={field.defaultValue}
                          onChange={(e) => handleMetaFieldChange(idx, 'defaultValue', e.target.value)}
                          placeholder="Default Value / Sample"
                          className="w-full px-2 py-0.5 bg-slate-800/60 border border-slate-700/60 rounded text-[11px] text-slate-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: TABLE COLUMNS & FRAME STRUCTURE                        */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'columns' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Table Column Definitions ({currentTemplate.columns.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure column titles, width, alignment, and visibility.
                    </p>
                  </div>
                  <button
                    onClick={handleAddColumn}
                    id="btn_add_column"
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Column
                  </button>
                </div>

                <div className="space-y-2">
                  {currentTemplate.columns.map((col, idx) => (
                    <div
                      key={col.id || idx}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                          Col #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleColumnChange(idx, 'visible', !col.visible)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                              col.visible ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {col.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{col.visible ? 'Active in Print' : 'Hidden'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(idx)}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition"
                            title="Delete this column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400">English Header Label</label>
                          <input
                            type="text"
                            value={col.label_en}
                            onChange={(e) => handleColumnChange(idx, 'label_en', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400">Width (e.g. 50px, 15%, auto)</label>
                          <input
                            type="text"
                            value={col.width}
                            onChange={(e) => handleColumnChange(idx, 'width', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400">Alignment</label>
                          <select
                            value={col.align}
                            onChange={(e) => handleColumnChange(idx, 'align', e.target.value as any)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                          >
                            <option value="left">Left Align</option>
                            <option value="center">Center Align</option>
                            <option value="right">Right Align</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: SUMMARY & TOTALS FRAME                                 */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Financial Summary & Subtotal Headings
                  </h3>


                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Direct Cost Subtotal Label (English)
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.summary.direct_cost_label_en}
                      onChange={(e) => handleSummaryChange('direct_cost_label_en', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>

                  {/* Contingency */}
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Physical Contingency</span>
                      <button
                        onClick={() => handleSummaryChange('contingency_enabled', !currentTemplate.summary.contingency_enabled)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          currentTemplate.summary.contingency_enabled ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {currentTemplate.summary.contingency_enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    {currentTemplate.summary.contingency_enabled && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={currentTemplate.summary.contingency_label}
                            onChange={(e) => handleSummaryChange('contingency_label', e.target.value)}
                            placeholder="Contingency Label"
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-2 py-1">
                            <input
                              type="number"
                              step="0.1"
                              value={currentTemplate.summary.contingency_percent}
                              onChange={(e) => handleSummaryChange('contingency_percent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent text-xs text-amber-300 font-mono focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tax */}
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Tax (Tax)</span>
                      <button
                        onClick={() => handleSummaryChange('tax_enabled', !currentTemplate.summary.tax_enabled)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          currentTemplate.summary.tax_enabled ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {currentTemplate.summary.tax_enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    {currentTemplate.summary.tax_enabled && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={currentTemplate.summary.tax_label}
                            onChange={(e) => handleSummaryChange('tax_label', e.target.value)}
                            placeholder="Tax Label"
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-2 py-1">
                            <input
                              type="number"
                              step="0.1"
                              value={currentTemplate.summary.tax_percent}
                              onChange={(e) => handleSummaryChange('tax_percent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent text-xs text-amber-300 font-mono focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grand Total Labels */}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Grand Total Label (English)
                    </label>
                    <input
                      type="text"
                      value={currentTemplate.summary.grand_total_label_en}
                      onChange={(e) => handleSummaryChange('grand_total_label_en', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white"
                    />
                  </div>
                </div>

                {/* Notes & Declarations */}
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Print Notes & Technical Declarations
                    </h3>
                    <button
                      onClick={handleAddNote}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                      Add Note
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentTemplate.summary.notes.map((note, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">{idx + 1}.</span>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => handleNoteChange(idx, e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleDeleteNote(idx)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: SIGNATORY / ENDORSEMENT BLOCK                          */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'signatories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Signature Boxes ({currentTemplate.signatories.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure authority roles, designations, office texts, and date lines.
                    </p>
                  </div>
                  <button
                    onClick={handleAddSignatory}
                    id="btn_add_signatory"
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Signatory
                  </button>
                </div>

                <div className="space-y-3">
                  {currentTemplate.signatories.map((sig, idx) => (
                    <div
                      key={sig.id || idx}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-bold">
                          Signatory Box #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sig.show_date}
                              onChange={(e) => handleSignatoryChange(idx, 'show_date', e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                            />
                            <span>Show Date Line</span>
                          </label>
                          <button
                            onClick={() => handleDeleteSignatory(idx)}
                            className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition"
                            title="Delete this signatory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400">Role Title (English)</label>
                          <input
                            type="text"
                            value={sig.role_en}
                            onChange={(e) => handleSignatoryChange(idx, 'role_en', e.target.value)}
                            placeholder="e.g. Prepared By"
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400">Designation (English)</label>
                          <input
                            type="text"
                            value={sig.designation_en}
                            onChange={(e) => handleSignatoryChange(idx, 'designation_en', e.target.value)}
                            placeholder="e.g. Sub-Engineer"
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400">Branch / Section / Office</label>
                        <input
                          type="text"
                          value={sig.office_text || ''}
                          onChange={(e) => handleSignatoryChange(idx, 'office_text', e.target.value)}
                          placeholder="e.g. Planning Section"
                          className="w-full px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 6: PAGE & FRAME LAYOUT STYLING                            */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Paper & Frame Dimensions
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Paper Size
                      </label>
                      <select
                        value={currentTemplate.pageStyle.paper_size}
                        onChange={(e) => handlePageStyleChange('paper_size', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="A4">A4 (Standard Engineering Sheet)</option>
                        <option value="A3">A3 (Wide Format Sheet)</option>
                        <option value="Legal">Legal (8.5 × 14 inch)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Page Orientation
                      </label>
                      <select
                        value={currentTemplate.pageStyle.orientation}
                        onChange={(e) => handlePageStyleChange('orientation', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Page Margins
                      </label>
                      <select
                        value={currentTemplate.pageStyle.margins}
                        onChange={(e) => handlePageStyleChange('margins', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="compact">Compact (10 mm)</option>
                        <option value="normal">Normal (15 mm)</option>
                        <option value="wide">Wide (20 mm)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Outer Border Style
                      </label>
                      <select
                        value={currentTemplate.pageStyle.border_style}
                        onChange={(e) => handlePageStyleChange('border_style', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="double">Government Double Line Border</option>
                        <option value="single">Single Solid 1px Line</option>
                        <option value="classic">Classic Heavy Frame</option>
                        <option value="none">No Outer Border</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Typography Scale
                      </label>
                      <select
                        value={currentTemplate.pageStyle.font_scale}
                        onChange={(e) => handlePageStyleChange('font_scale', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="compact">Compact (9-10pt for dense data)</option>
                        <option value="normal">Normal (10-11pt standard)</option>
                        <option value="large">Large (11-12pt clear)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Table Grid Style
                      </label>
                      <select
                        value={currentTemplate.pageStyle.table_grid_style}
                        onChange={(e) => handlePageStyleChange('table_grid_style', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="full">Full Grid (All Horizontal & Vertical Borders)</option>
                        <option value="horizontal_only">Horizontal Dividers Only</option>
                        <option value="striped">Alternating Row Fills</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Interactive Live Frame Preview */}
        <div className={`flex-1 flex flex-col bg-slate-950 overflow-hidden ${
          previewViewMode === 'editor_only' ? 'hidden' : 'flex'
        }`}>
          {/* Preview Control Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                Live Frame & Layout Preview: {currentTemplate.name}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {currentTemplate.pageStyle.paper_size} · {currentTemplate.pageStyle.orientation}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom */}
              <div className="flex items-center gap-1 bg-slate-800 rounded p-0.5 border border-slate-700">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 w-10 text-center">{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(150, z + 10))}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sheet content mode: Blank Sheet (Default) vs Sample Values */}
              <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSheetContentMode('blank')}
                  className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer transition ${
                    sheetContentMode === 'blank'
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Default: Blank clean ruled rows without any placeholder numbers or mock data"
                >
                  <FileText className="w-3 h-3" />
                  Blank Sheet (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setSheetContentMode('sample')}
                  className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 cursor-pointer transition ${
                    sheetContentMode === 'sample'
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Preview with sample dummy numbers"
                >
                  <Eye className="w-3 h-3" />
                  Sample Values
                </button>
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
                <button
                  onClick={() => setPreviewViewMode('split')}
                  className={`px-2 py-1 text-[11px] rounded ${previewViewMode === 'split' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
                >
                  Split View
                </button>
                <button
                  onClick={() => setPreviewViewMode('preview_only')}
                  className={`px-2 py-1 text-[11px] rounded ${previewViewMode === 'preview_only' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
                >
                  Full Frame
                </button>
                <button
                  onClick={() => setPreviewViewMode('editor_only')}
                  className={`px-2 py-1 text-[11px] rounded ${previewViewMode === 'editor_only' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}
                >
                  Editor Only
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Sheet Display Container */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/80">
            <div
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className={`bg-white text-black shadow-2xl transition-all duration-150 ${
                currentTemplate.pageStyle.orientation === 'landscape'
                  ? 'w-[1080px] min-h-[760px]'
                  : 'w-[800px] min-h-[1050px]'
              } ${
                currentTemplate.pageStyle.border_style === 'double'
                  ? 'border-4 border-double border-slate-900 p-8'
                  : currentTemplate.pageStyle.border_style === 'single'
                  ? 'border border-slate-800 p-8'
                  : currentTemplate.pageStyle.border_style === 'classic'
                  ? 'border-2 border-slate-900 p-8'
                  : 'p-8'
              }`}
            >
              {/* ------------------------------------------------------------- */}
              {/* PRINT FRAME HEADER / LETTERHEAD                               */}
              {/* ------------------------------------------------------------- */}
              <div
                onClick={() => setActiveTab('header')}
                className="cursor-pointer group relative border-2 border-transparent hover:border-indigo-400 hover:bg-indigo-50/20 p-2 rounded transition"
                title="Click to edit Letterhead & Header component"
              >
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                  Edit Letterhead
                </div>

                <div className="text-center space-y-0.5">
                  {currentTemplate.header.authority_crest && (
                    <div className="flex justify-center mb-1">
                      <div className="w-10 h-10 rounded-full border border-red-700/60 flex items-center justify-center text-red-700 bg-red-50 text-[9px] font-bold">
                        Seal
                      </div>
                    </div>
                  )}
                  <div className="text-sm font-semibold tracking-wide text-slate-800">
                    {currentTemplate.header.country_text}
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    {currentTemplate.header.ministry_text}
                  </div>
                  <div className="text-base font-extrabold text-slate-900 tracking-tight">
                    {currentTemplate.header.office_name}
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {currentTemplate.header.department_text}
                  </div>
                  <div className="text-xs text-slate-600">
                    {currentTemplate.header.location_text}
                  </div>
                </div>

                {/* Form Number and Document Title Banner */}
                <div className="mt-3 pt-2 border-t border-slate-400 flex flex-col items-center">
                  <div className="w-full flex justify-between text-[11px] text-slate-700 font-medium">
                    <span>{currentTemplate.header.form_number}</span>
                    <span>Fiscal Year</span>
                  </div>

                  <div className="my-2 text-center">
                    <div className="text-xs font-bold text-slate-700 tracking-wider">
                      ({currentTemplate.header.document_title_en})
                    </div>
                  </div>
                </div>

                {/* Metadata Fields 2-Column Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 text-[11px] border border-slate-300 bg-slate-50/70 p-2.5 rounded">
                  {currentTemplate.header.meta_fields
                    .filter((f) => f.visible)
                    .map((field) => (
                      <div key={field.id} className="flex items-baseline gap-1">
                        <span className="font-bold text-slate-800 whitespace-nowrap">
                          {field.label_en}:
                        </span>
                        <span className="text-slate-700 border-b border-dotted border-slate-400 flex-1 px-1 min-h-[16px]">
                          {sheetContentMode === 'blank' ? '' : field.defaultValue}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* PRINT FRAME TABLE WITH COLUMNS & HEADINGS                     */}
              {/* ------------------------------------------------------------- */}
              <div className="mt-4">
                <table className="w-full border-collapse border border-slate-900 text-xs">
                  {/* Table Column Headers */}
                  <thead>
                    <tr
                      onClick={() => setActiveTab('columns')}
                      className="bg-slate-100 cursor-pointer hover:bg-indigo-50/50 transition group"
                      title="Click to edit Table Column Definitions"
                    >
                      {currentTemplate.columns
                        .filter((c) => c.visible)
                        .map((col) => (
                          <th
                            key={col.id}
                            style={{ width: col.width }}
                            className={`border border-slate-900 px-2 py-1.5 text-${col.align} font-bold text-slate-900`}
                          >
                            <div className="text-[10px] font-medium text-slate-600">({col.label_en})</div>
                          </th>
                        ))}
                    </tr>
                  </thead>

                  {/* Body Showing Individual Headings and Clean Ruled Blank Rows */}
                  <tbody>
                    {currentTemplate.headings.map((heading, hIdx) => {
                      const visibleColsCount = currentTemplate.columns.filter((c) => c.visible).length;
                      return (
                        <React.Fragment key={heading.id || hIdx}>
                          {/* Heading / Chapter Banner */}
                          <tr
                            onClick={() => setActiveTab('headings')}
                            className="bg-slate-200/90 font-bold text-slate-900 cursor-pointer hover:bg-indigo-100/60 transition group"
                            title="Click to edit Headings"
                          >
                            <td
                              colSpan={visibleColsCount}
                              className="border border-slate-900 px-2.5 py-1.5 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-slate-900 text-white px-1.5 py-0.2 rounded text-[11px]">
                                    {heading.code}
                                  </span>
                                  <span className="font-extrabold text-sm">{heading.title}</span>
                                </div>
                                {heading.isMandatory && (
                                  <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded font-normal">
Mandatory
                                  </span>
                                )}
                              </div>
                              {heading.description && (
                                <div className="text-[10px] text-slate-600 font-normal mt-0.5">
                                  {heading.description}
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Rows: Clean Ruled Blank Lines (Default) vs Sample Values */}
                          {sheetContentMode === 'blank' ? (
                            // Clean, empty ruled lines (2 ruled blank rows per heading)
                            [1, 2].map((rIndex) => (
                              <tr key={`empty_row_${hIdx}_${rIndex}`} className="h-7 border border-slate-300 hover:bg-slate-50/40">
                                {currentTemplate.columns
                                  .filter((c) => c.visible)
                                  .map((col) => (
                                    <td
                                      key={col.id}
                                      className={`border border-slate-300 px-2 py-1.5 text-${col.align} text-[11px] text-slate-300 font-mono`}
                                    >
                                      &nbsp;
                                    </td>
                                  ))}
                              </tr>
                            ))
                          ) : (
                            /* Sample Item Row Previewing Column Structure */
                            <tr className="border border-slate-300 text-slate-700 hover:bg-slate-50">
                              {currentTemplate.columns
                                .filter((c) => c.visible)
                                .map((col) => {
                                  let sampleVal = '-';
                                  if (col.key === 'sn') sampleVal = `${hIdx + 1}.1`;
                                  else if (col.key === 'item_code' || col.key === 'norm_code') sampleVal = `${heading.code}.01`;
                                  else if (col.key === 'description' || col.key === 'particulars') sampleVal = `Standard works under ${heading.title} as per specifications`;
                                  else if (col.key === 'unit') sampleVal = 'm³';
                                  else if (col.key === 'quantity' || col.key === 'total_qty') sampleVal = '100.00';
                                  else if (col.key === 'rate' || col.key === 'contract_rate') sampleVal = '2,450.00';
                                  else if (col.key === 'amount' || col.key === 'total_cost') sampleVal = '2,45,000.00';
                                  else if (col.key === 'remarks') sampleVal = 'BLD';

                                  return (
                                    <td
                                      key={col.id}
                                      className={`border border-slate-800 px-2 py-1 text-${col.align} text-[11px]`}
                                    >
                                      {sampleVal}
                                    </td>
                                  );
                                })}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Table Summary & Financial Totals Block */}
                  <tfoot
                    onClick={() => setActiveTab('summary')}
                    className="cursor-pointer hover:bg-indigo-50/40 transition group"
                    title="Click to edit Financial Summary & Totals"
                  >
                    {/* Direct Cost */}
                    <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                      <td
                        colSpan={currentTemplate.columns.filter((c) => c.visible).length - 2}
                        className="border border-slate-900 px-3 py-1.5 text-right"
                      >
                        {currentTemplate.summary.direct_cost_label_en}
                      </td>
                      <td className="border border-slate-900 px-3 py-1.5 text-right font-mono text-xs">
                        {sheetContentMode === 'blank' ? '—' : '1,245,000.00'}
                      </td>
                      <td className="border border-slate-900"></td>
                    </tr>

                    {/* Contingency */}
                    {currentTemplate.summary.contingency_enabled && (
                      <tr className="bg-slate-50 font-medium">
                        <td
                          colSpan={currentTemplate.columns.filter((c) => c.visible).length - 2}
                          className="border border-slate-900 px-3 py-1 text-right text-[11px]"
                        >
                          {currentTemplate.summary.contingency_label} ({currentTemplate.summary.contingency_percent}%):
                        </td>
                        <td className="border border-slate-900 px-3 py-1 text-right font-mono text-xs text-slate-700">
                          {sheetContentMode === 'blank' ? '—' : `${currencyCode()} 37,350.00`}
                        </td>
                        <td className="border border-slate-900"></td>
                      </tr>
                    )}

                    {/* Tax */}
                    {currentTemplate.summary.tax_enabled && (
                      <tr className="bg-slate-50 font-medium">
                        <td
                          colSpan={currentTemplate.columns.filter((c) => c.visible).length - 2}
                          className="border border-slate-900 px-3 py-1 text-right text-[11px]"
                        >
                          {currentTemplate.summary.tax_label} ({currentTemplate.summary.tax_percent}%):
                        </td>
                        <td className="border border-slate-900 px-3 py-1 text-right font-mono text-xs text-slate-700">
                          {sheetContentMode === 'blank' ? '—' : `${currencyCode()} 166,705.50`}
                        </td>
                        <td className="border border-slate-900"></td>
                      </tr>
                    )}

                    {/* Grand Total */}
                    <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-200 font-extrabold text-sm">
                      <td
                        colSpan={currentTemplate.columns.filter((c) => c.visible).length - 2}
                        className="border border-slate-900 px-3 py-2 text-right"
                      >
                        {currentTemplate.summary.grand_total_label_en}
                      </td>
                      <td className="border border-slate-900 px-3 py-2 text-right font-mono text-sm text-slate-950">
                        {sheetContentMode === 'blank' ? '—' : '1,449,055.50'}
                      </td>
                      <td className="border border-slate-900"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in Words & Notes */}
                <div
                  onClick={() => setActiveTab('summary')}
                  className="mt-3 p-2.5 border border-slate-400 bg-slate-50 rounded text-xs space-y-1.5 cursor-pointer hover:border-indigo-400"
                >
                  <div className="font-bold text-slate-900">
                    {sheetContentMode === 'blank' ? (
                      <span className="font-mono text-slate-400 font-normal">
                        ................................................................................................................................
                      </span>
                    ) : (
                      <span>One Million Four Hundred Forty-Nine Thousand Fifty-Five and Fifty Cents Only.</span>
                    )}
                  </div>
                  {currentTemplate.summary.notes.length > 0 && (
                    <div className="pt-1 border-t border-slate-300 text-[11px] text-slate-600 space-y-0.5">
                      <div className="font-semibold text-slate-800">Special Notes:</div>
                      {currentTemplate.summary.notes.map((n, i) => (
                        <div key={i}>• {n}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* PRINT FRAME SIGNATORY ENDORSEMENT BLOCKS                      */}
              {/* ------------------------------------------------------------- */}
              <div
                onClick={() => setActiveTab('signatories')}
                className="mt-10 pt-6 border-t border-slate-300 cursor-pointer group hover:bg-indigo-50/20 p-2 rounded transition"
                title="Click to edit Signatories Block"
              >
                <div
                  className="grid gap-4 text-center"
                  style={{
                    gridTemplateColumns: `repeat(${currentTemplate.signatories.length}, minmax(0, 1fr))`
                  }}
                >
                  {currentTemplate.signatories.map((sig, idx) => (
                    <div key={sig.id || idx} className="space-y-1">
                      <div className="h-12 flex items-end justify-center">
                        <div className="w-3/4 border-b border-dotted border-slate-600"></div>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {sig.role_en}
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium">
                        {sig.designation_en}
                      </div>
                      {sig.office_text && (
                        <div className="text-[10px] text-slate-500">
                          {sig.office_text}
                        </div>
                      )}
                      {sig.show_date && (
                        <div className="text-[10px] text-slate-500 pt-1">
 (Date): ..........................
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Page Footer */}
              <div className="mt-8 pt-2 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
                <span>Universal Estimating & Valuation Engineering Engine · Template: {currentTemplate.id}</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
