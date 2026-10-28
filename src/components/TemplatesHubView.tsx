import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Ruler,
  Layers,
  Award,
  PenTool,
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Eye,
  Sliders,
  Edit3,
  ListTree
} from 'lucide-react';
import {
  HeadingTemplate,
  ReportTemplate,
  DrawingTemplate,
  HEADING_TEMPLATES,
  REPORT_TEMPLATES,
  DRAWING_TEMPLATES,
  NECESSARY_ITEMS_TEMPLATES
} from '../data/templatePresets';
import { ProjectEstimate, ZoneInfo } from '../types';
import { BOQHeadingsPrintLayout } from './BOQHeadingsPrintLayout';
import { TemplateStructureFrameEditor } from './TemplateStructureFrameEditor';

interface TemplatesHubViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  onNavigateToTab?: (tab: string) => void;
  showToast?: (msg: string) => void;
  initialSection?: 'headings' | 'reports' | 'drawings' | 'necessary';
  initialModule?: 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate';
}

export const TemplatesHubView: React.FC<TemplatesHubViewProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY,
  onNavigateToTab,
  showToast,
  initialSection = 'headings',
  initialModule = 'boq',
}) => {
  const [activeSection, setActiveSection] = useState<'headings' | 'reports' | 'drawings' | 'necessary'>(initialSection);
  const [activeModuleFilter, setActiveModuleFilter] = useState<'all' | 'boq' | 'estimate' | 'mb' | 'resource' | 'valuation-mb' | 'valuation' | 'completion-certificate'>(initialModule);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Headings Sub-View:
  // 'structure_frame_editor' (Individual Component, Headings & Print Frame Structure Editor)
  // 'print_ready_boq' (Print Ready Layout with Editable Items & Values)
  // 'hierarchy_tree' (Heading Structure Tree)
  const [headingsSubView, setHeadingsSubView] = useState<'structure_frame_editor' | 'print_ready_boq' | 'hierarchy_tree'>('structure_frame_editor');

  // Selected heading template for detail view & applying
  const [selectedHeadingTemplate, setSelectedHeadingTemplate] = useState<HeadingTemplate>(HEADING_TEMPLATES[0]);
  // Selected report template for live preview modal / panel
  const [selectedReportTemplate, setSelectedReportTemplate] = useState<ReportTemplate>(REPORT_TEMPLATES[0]);
  const [isReportPreviewModalOpen, setIsReportPreviewModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const localToast = (msg: string) => {
    if (showToast) showToast(msg);
  };

  // Sync with Ribbon Tool Actions
  useEffect(() => {
    const handleFilterHeadings = (e: CustomEvent) => {
      setActiveSection('headings');
      if (e.detail) {
        setActiveModuleFilter(e.detail);
        if (e.detail === 'boq') {
          setHeadingsSubView('print_ready_boq');
        }
      }
    };

    const handleFilterReports = (e: CustomEvent) => {
      setActiveSection('reports');
      if (e.detail) {
        setActiveModuleFilter(e.detail);
      }
    };

    window.addEventListener('uev:templates-filter-headings' as any, handleFilterHeadings);
    window.addEventListener('uev:templates-filter-reports' as any, handleFilterReports);

    return () => {
      window.removeEventListener('uev:templates-filter-headings' as any, handleFilterHeadings);
      window.removeEventListener('uev:templates-filter-reports' as any, handleFilterReports);
    };
  }, []);

  // Filtered Heading Templates
  const filteredHeadings = HEADING_TEMPLATES.filter((tpl) => {
    const matchModule = activeModuleFilter === 'all' || tpl.module === activeModuleFilter;
    const matchQuery =
      !searchQuery ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchModule && matchQuery;
  });

  // Filtered Report Templates
  const filteredReports = REPORT_TEMPLATES.filter((rpt) => {
    const matchModule = activeModuleFilter === 'all' || rpt.module === activeModuleFilter;
    const matchQuery =
      !searchQuery ||
      rpt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rpt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchModule && matchQuery;
  });

  // Filtered Drawing Templates
  const filteredDrawings = DRAWING_TEMPLATES.filter((drw) => {
    return (
      !searchQuery ||
      drw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drw.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drw.category.includes(searchQuery.toLowerCase())
    );
  });

  // Apply Heading Template to Current Project
  const handleApplyHeadingTemplate = (tpl: HeadingTemplate) => {
    setProject((prev) => {
      // 1. Update document titles and custom headings in header config
      const customHeadings = tpl.headings.map((h) => ({
        id: `head_${h.code.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        label: `${h.code} ${h.title}`,
        value: ''
      }));

      const newHeaderConfig = {
        ...(prev.header_config || {}),
        document_title_estimate: tpl.defaultHeaderConfig?.document_title_estimate || prev.header_config?.document_title_estimate,
        document_title_mb: tpl.module === 'mb' ? tpl.title : prev.header_config?.document_title_mb,
        custom_headings: customHeadings
      };

      return {
        ...prev,
        header_config: newHeaderConfig,
        updated_at: new Date().toISOString()
      };
    });

    localToast(`Applied "${tpl.title}" heading template to active project!`);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    localToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ----------------------------------------------------------------------------------
  // RIBBON COMMAND LISTENERS FOR TEMPLATES HUB
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    const handleSetSection = (e: any) => {
      if (e.detail && ['headings', 'reports', 'drawings', 'necessary'].includes(e.detail)) {
        setActiveSection(e.detail);
        if (e.detail === 'headings') {
          setHeadingsSubView('structure_frame_editor');
        }
      }
    };
    const handleFilterHeadings = (e: any) => {
      if (e.detail) {
        setActiveSection('headings');
        setHeadingsSubView('structure_frame_editor');
        setActiveModuleFilter(e.detail);
      }
    };
    const handleFilterReports = (e: any) => {
      if (e.detail) {
        setActiveSection('reports');
        setActiveModuleFilter(e.detail);
      }
    };
    const handleFilterNecessary = () => {
      setActiveSection('necessary');
    };
    const handleFilterModule = (e: any) => {
      if (e.detail) {
        setActiveModuleFilter(e.detail);
      }
    };
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail || '');
    };

    window.addEventListener('uev:templates-set-section', handleSetSection as any);
    window.addEventListener('uev:templates-filter-headings', handleFilterHeadings as any);
    window.addEventListener('uev:templates-filter-reports', handleFilterReports as any);
    window.addEventListener('uev:templates-filter-necessary', handleFilterNecessary as any);
    window.addEventListener('uev:templates-filter-module', handleFilterModule as any);
    window.addEventListener('uev:templates-search', handleSearch as any);

    return () => {
      window.removeEventListener('uev:templates-set-section', handleSetSection as any);
      window.removeEventListener('uev:templates-filter-headings', handleFilterHeadings as any);
      window.removeEventListener('uev:templates-filter-reports', handleFilterReports as any);
      window.removeEventListener('uev:templates-filter-necessary', handleFilterNecessary as any);
      window.removeEventListener('uev:templates-filter-module', handleFilterModule as any);
      window.removeEventListener('uev:templates-search', handleSearch as any);
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full animate-fadeIn">
      {/* MAIN CONTENT AREA: Controlled directly via the Top Ribbon */}
      <div className="flex-1 flex flex-col">
        {/* ========================================================================= */}
        {/* SECTION 1: TEMPLATES OF HEADINGS & PRINT-READY BOQ LAYOUTS */}
        {/* ========================================================================= */}
        {activeSection === 'headings' && (
          <div className="flex flex-col flex-1 space-y-3">
            {/* Sub-view 0: Structure & Frame Component Editor (User Request) */}
            {headingsSubView === 'structure_frame_editor' && (
              <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 shadow-md min-h-[780px]">
                <TemplateStructureFrameEditor
                  project={project}
                  onUpdateProject={(updatedProj) => {
                    setProject(updatedProj);
                    localToast(`Applied template frame settings to project "${updatedProj.title}"!`);
                  }}
                  initialModule={activeModuleFilter !== 'all' ? activeModuleFilter : 'boq'}
                />
              </div>
            )}

            {/* Sub-view 1: Print-Ready BOQ Layout & Value Insertion */}
            {headingsSubView === 'print_ready_boq' && (
              <BOQHeadingsPrintLayout
                project={project}
                setProject={setProject}
                selectedZone={selectedZone}
                selectedFY={selectedFY}
                onNavigateToTab={onNavigateToTab}
                showToast={localToast}
              />
            )}

            {/* Sub-view 2: Standard Heading Sequence Tree */}
            {headingsSubView === 'hierarchy_tree' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                {/* Left: Template Cards List */}
                <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Available Heading Templates ({filteredHeadings.length})</span>
                    <span className="text-[10px] text-slate-500 font-normal">Click to preview &amp; apply</span>
                  </div>

                  {filteredHeadings.map((tpl) => {
                    const isSelected = selectedHeadingTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedHeadingTemplate(tpl)}
                        className={`p-4 rounded-xl border transition cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800">
                            {tpl.module.toUpperCase()}
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium">{tpl.authority}</span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-2">{tpl.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-mono text-[10.5px]">
                            {tpl.headings.length} Headings in hierarchy
                          </span>
                          <span className="text-blue-700 font-bold flex items-center gap-1 text-[11px]">
                            View Details <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredHeadings.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 text-slate-500">
                      <p className="text-xs">No heading templates match the current filter or search.</p>
                    </div>
                  )}
                </div>

                {/* Right: Selected Heading Template Hierarchy & Apply Panel */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-300 shadow-sm flex flex-col overflow-hidden max-h-[calc(100vh-320px)]">
                  {/* Toolbar */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded font-mono">
                          {selectedHeadingTemplate.module.toUpperCase()} PRESET
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          {selectedHeadingTemplate.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleCopyText(
                            selectedHeadingTemplate.headings.map((h) => `${h.code} ${h.title}`).join('\n'),
                            selectedHeadingTemplate.id
                          )
                        }
                        className="p-2 border border-slate-300 hover:bg-white rounded-lg text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Copy headings as plain text"
                      >
                        {copiedId === selectedHeadingTemplate.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy
                      </button>

                      <button
                        onClick={() => handleApplyHeadingTemplate(selectedHeadingTemplate)}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Apply to Active Project
                      </button>
                    </div>
                  </div>

                  {/* Headings Hierarchy List */}
                  <div className="p-5 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/40">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Structured Hierarchy Sequence ({selectedHeadingTemplate.headings.length} Sections)
                    </div>

                    {selectedHeadingTemplate.headings.map((h, idx) => (
                      <div
                        key={h.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 transition flex items-start gap-3"
                      >
                        <span className="w-14 shrink-0 px-2 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs rounded text-center border border-slate-200">
                          {h.code}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{h.title}</span>
                            {h.isMandatory && (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-extrabold">
                                Mandatory
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          Item #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Note */}
                  <div className="p-3 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>
                      Authority Reference: <strong>{selectedHeadingTemplate.authority}</strong>
                    </span>
                    <span>Clicking &quot;Apply&quot; populates the active project&apos;s chapter categories and headers.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: TEMPLATES OF REPORTS */}
        {/* ========================================================================= */}
        {activeSection === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReports.map((rpt) => (
              <div
                key={rpt.id}
                className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs hover:border-blue-400 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono bg-blue-100 text-blue-800">
                      {rpt.module.toUpperCase()}
                    </span>
                    {rpt.formNumber && (
                      <span className="text-[10.5px] font-bold text-red-700">
                        {rpt.formNumber}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{rpt.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{rpt.description}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Paper Size:</span>
                    <strong className="text-slate-900">{rpt.standardPaperSize} ({rpt.orientation})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Columns:</span>
                    <strong className="text-slate-900">{rpt.columns.length} columns</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Signatures:</span>
                    <strong className="text-slate-900">{rpt.signatories.length} officials</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedReportTemplate(rpt);
                      setIsReportPreviewModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReportTemplate(rpt);
                      window.print();
                    }}
                    className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Print this Report"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: TEMPLATES OF DRAWINGS */}
        {/* ========================================================================= */}
        {activeSection === 'drawings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Engineering Drawing Templates provide standardized geometric sections for roads, drains, culverts, retaining walls, and footings.
                </span>
              </div>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('template-drawings')}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  Open Full CAD Canvas <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrawings.map((drw) => (
                <div
                  key={drw.id}
                  className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs hover:border-amber-400 transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono bg-amber-100 text-amber-900">
                        {drw.category.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {drw.drawingCode}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{drw.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{drw.description}</p>
                  </div>

                  {/* Parameter Tags */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Configurable Dimensions:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {drw.parameters.map((p) => (
                        <span
                          key={p.symbol}
                          className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono text-slate-700"
                        >
                          {p.symbol} = {p.defaultValue} {p.unit}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1">
                    {onNavigateToTab ? (
                      <button
                        onClick={() => onNavigateToTab('template-drawings')}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5 text-amber-400" />
                        Configure &amp; Export to MB
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 text-center">Scale: {drw.standardScale}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: OTHER NECESSARY ITEMS */}
        {/* ========================================================================= */}
        {activeSection === 'necessary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {NECESSARY_ITEMS_TEMPLATES.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-300 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      {item.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.description}</p>

                  <div className="mt-3 bg-slate-900 text-emerald-300 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                    {item.content.trim()}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleCopyText(item.content, item.id)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy Document Template
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. REPORT PREVIEW MODAL */}
      {isReportPreviewModalOpen && selectedReportTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-blue-950 px-6 py-4 text-white flex items-center justify-between border-b-2 border-red-600 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded text-white font-mono">
                    REPORT PREVIEW
                  </span>
                  <h3 className="text-base font-bold">{selectedReportTemplate.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button
                  onClick={() => setIsReportPreviewModalOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <span className="text-lg font-bold">&times;</span>
                </button>
              </div>
            </div>

            {/* Printable Document Paper Simulation */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-100 text-slate-900">
              <div className="bg-white p-8 rounded-xl shadow-md border border-slate-300 max-w-3xl mx-auto space-y-6">
                {/* Official Letterhead */}
                <div className="text-center border-b-2 border-red-600 pb-4 space-y-1">
                  <div className="text-xs font-bold text-red-700">Official Form</div>
                  <h2 className="text-base font-black text-slate-900">Local Authority Office, Sample County</h2>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Project: {project.title || 'Civil Infrastructure Development Project'} | FY: {selectedFY}
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <tr>
                        {selectedReportTemplate.columns.map((col) => (
                          <th
                            key={col.key}
                            style={{ width: col.width }}
                            className={`p-2 border-r border-slate-300 last:border-r-0 ${
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {selectedReportTemplate.sampleRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {selectedReportTemplate.columns.map((col) => (
                            <td
                              key={col.key}
                              className={`p-2 border-r border-slate-200 last:border-r-0 font-sans ${
                                col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'
                              }`}
                            >
                              {row[col.key] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatories Footer */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
                  {selectedReportTemplate.signatories.map((sig, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <div className="border-b border-dotted border-slate-400 w-32 mx-auto mb-2 h-8"></div>
                      <div className="text-xs font-bold text-slate-800">{sig.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
