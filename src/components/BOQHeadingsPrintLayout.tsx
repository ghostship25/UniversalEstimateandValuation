import React, { useState } from 'react';
import {
  Printer,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sliders,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Edit3,
  Eye,
  Building2,
  Compass,
  AlertCircle
} from 'lucide-react';
import {
  BOQ_PRINT_PRESETS,
  BOQPrintTemplatePreset,
  EditableBOQChapter,
  EditableBOQTemplateItem
} from '../data/boqTemplatePresets';
import { ProjectEstimate, BOQItem, ZoneInfo } from '../types';
import { formatCurrencyValue, DEFAULT_FORMAT_CONFIG } from '../services/formatPreferences';
import { currencyCode } from '../services/currency';

interface BOQHeadingsPrintLayoutProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  selectedZone: ZoneInfo;
  selectedFY: string;
  onNavigateToTab?: (tab: string) => void;
  showToast?: (msg: string) => void;
}

export const BOQHeadingsPrintLayout: React.FC<BOQHeadingsPrintLayoutProps> = ({
  project,
  setProject,
  selectedZone,
  selectedFY,
  onNavigateToTab,
  showToast
}) => {
  // Active Preset Selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>(BOQ_PRINT_PRESETS[0].id);
  const activePreset = BOQ_PRINT_PRESETS.find((p) => p.id === selectedPresetId) || BOQ_PRINT_PRESETS[0];

  // Editable Chapters & Items State
  const [chapters, setChapters] = useState<EditableBOQChapter[]>(() =>
    JSON.parse(JSON.stringify(activePreset.chapters))
  );

  // Layout View Mode: 'edit' (inline inputs) vs 'print_preview' (pure paper document)
  const [viewMode, setViewMode] = useState<'edit' | 'print_preview'>('edit');

  // Metadata for the Print Document Header
  const [docHeader, setDocHeader] = useState({
    officeName: project.header_config?.office_name || 'Local Authority Office, Infrastructure Development Section',
    projectName: project.title || activePreset.defaultProjectName,
    location: project.implementation_location || activePreset.defaultLocation,
    zone: selectedZone?.name_en || project.zone,
    fiscalYear: selectedFY || project.fiscal_year || '2026/27',
    contractId: project.header_config?.contract_no || 'NCB/WORKS-081/82-01',
    contingencyPercent: activePreset.contingencyPercent,
    taxPercent: activePreset.taxPercent,
  });

  // Modal State for Inserting into Project
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [insertMode, setInsertMode] = useState<'append' | 'replace'>('append');

  // When preset changes, reload chapters
  const handleSelectPreset = (presetId: string) => {
    const found = BOQ_PRINT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(presetId);
    setChapters(JSON.parse(JSON.stringify(found.chapters)));
    setDocHeader((prev) => ({
      ...prev,
      projectName: found.defaultProjectName,
      location: found.defaultLocation,
      contingencyPercent: found.contingencyPercent,
      taxPercent: found.taxPercent
    }));
    if (showToast) showToast(`Loaded "${found.name}" print layout!`);
  };

  // Reset to original preset
  const handleResetToPreset = () => {
    if (window.confirm('Reset all edited items back to the original preset defaults?')) {
      setChapters(JSON.parse(JSON.stringify(activePreset.chapters)));
      if (showToast) showToast('Reset template items to default.');
    }
  };

  // Edit item field
  const handleUpdateItem = (
    chapterId: string,
    itemId: string,
    field: keyof EditableBOQTemplateItem,
    val: any
  ) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== chapterId) return ch;
        return {
          ...ch,
          items: ch.items.map((it) => {
            if (it.id !== itemId) return it;
            const updated = { ...it, [field]: val };
            if (field === 'quantity' || field === 'rate') {
              const q = field === 'quantity' ? Number(val) || 0 : it.quantity;
              const r = field === 'rate' ? Number(val) || 0 : it.rate;
              updated.amount = Math.round(q * r * 100) / 100;
            }
            return updated;
          })
        };
      })
    );
  };

  // Add new item to a chapter
  const handleAddItem = (chapterId: string) => {
    const newItem: EditableBOQTemplateItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_code: `ITEM-${Date.now().toString().slice(-3)}`,
      description: 'New custom construction / civil work item description...',
      unit: 'm³',
      quantity: 1,
      rate: 1000,
      amount: 1000,
      remarks: 'Added item'
    };

    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== chapterId) return ch;
        return {
          ...ch,
          items: [...ch.items, newItem]
        };
      })
    );

    if (showToast) showToast('Added new item row. You can now edit its values.');
  };

  // Duplicate an item
  const handleDuplicateItem = (chapterId: string, item: EditableBOQTemplateItem) => {
    const duplicated: EditableBOQTemplateItem = {
      ...item,
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_code: `${item.item_code}-COPY`,
      description: `${item.description} (Copy)`
    };

    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== chapterId) return ch;
        return {
          ...ch,
          items: [...ch.items, duplicated]
        };
      })
    );

    if (showToast) showToast('Duplicated item.');
  };

  // Delete an item
  const handleDeleteItem = (chapterId: string, itemId: string) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== chapterId) return ch;
        return {
          ...ch,
          items: ch.items.filter((it) => it.id !== itemId)
        };
      })
    );
  };

  // Add a brand new chapter / heading
  const handleAddChapter = () => {
    const nextCode = `${chapters.length + 1}.0`;
    const newChapter: EditableBOQChapter = {
      id: `ch_${Date.now()}`,
      code: nextCode,
      title: `Part ${nextCode}: Custom Section Title`,
      items: [
        {
          id: `it_${Date.now()}`,
          item_code: `C${chapters.length + 1}-01`,
          description: 'Specification and description of work under this new heading...',
          unit: 'm³',
          quantity: 1,
          rate: 2500,
          amount: 2500,
          remarks: ''
        }
      ]
    };

    setChapters((prev) => [...prev, newChapter]);
    if (showToast) showToast(`Added new Chapter ${nextCode}`);
  };

  // Calculations
  const allItems = chapters.flatMap((c) => c.items);
  const totalDirectCost = allItems.reduce((sum, it) => sum + (it.amount || 0), 0);
  const contingencyAmount = Math.round((totalDirectCost * docHeader.contingencyPercent) / 100 * 100) / 100;
  const taxableTotal = totalDirectCost + contingencyAmount;
  const taxAmount = Math.round((taxableTotal * docHeader.taxPercent) / 100 * 100) / 100;
  const grandTotal = Math.round((taxableTotal + taxAmount) * 100) / 100;

  // Execute insertion into active Project Estimate items
  const handleConfirmInsert = () => {
    const newBOQItems: BOQItem[] = [];

    chapters.forEach((ch, chIdx) => {
      ch.items.forEach((it, itIdx) => {
        const uniqueId = `boq_tpl_${Date.now()}_${chIdx}_${itIdx}`;
        newBOQItems.push({
          id: uniqueId,
          item_id: Date.now() + chIdx * 100 + itIdx,
          item_code: it.item_code,
          code: it.item_code,
          description: it.description,
          unit: it.unit,
          estimated_quantity: Number(it.quantity) || 0,
          calculated_unit_rate: Number(it.rate) || 0,
          user_rate: Number(it.rate) || 0,
          contractor_rate: Number(it.rate) || 0,
          total_amount: Number(it.amount) || 0,
          chapter: `${ch.code} ${ch.title}`,
          // Create an initial linked Measurement Book row so MB is populated immediately
          mb_rows: [
            {
              id: `mb_${uniqueId}`,
              particulars: it.description,
              no_of_units: 1,
              length: Number(it.quantity) || 1,
              breadth: 1,
              height: 1,
              quantity: Number(it.quantity) || 0,
              remarks: it.remarks || ''
            }
          ]
        });
      });
    });

    setProject((prev) => {
      const updatedItems = insertMode === 'replace'
        ? newBOQItems
        : [...prev.items, ...newBOQItems];

      return {
        ...prev,
        title: prev.title || docHeader.projectName,
        implementation_location: prev.implementation_location || docHeader.location,
        items: updatedItems,
        contingency_percent: docHeader.contingencyPercent,
        tax_percent: docHeader.taxPercent,
        updated_at: new Date().toISOString()
      };
    });

    setIsInsertModalOpen(false);
    if (showToast) {
      showToast(
        `Successfully ${insertMode === 'replace' ? 'replaced with' : 'inserted'} ${newBOQItems.length} items (Total:. ${grandTotal.toLocaleString('en-US')}) into active project!`
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-fadeIn flex flex-col flex-1">
      {/* 1. TOP CONTROLS & PRESET TOOLBAR (Hidden during print) */}
      <div className="print:hidden bg-white border border-slate-300 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            BOQ Preset:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-blue-600 cursor-pointer text-slate-800"
          >
            {BOQ_PRINT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.authority})
              </option>
            ))}
          </select>

          <button
            onClick={handleResetToPreset}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md border border-slate-200 transition cursor-pointer text-xs flex items-center gap-1"
            title="Reset to default items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* View Mode Toggle: Edit Mode vs Print Preview */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'edit'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit &amp; Add Values
          </button>
          <button
            onClick={() => setViewMode('print_preview')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'print_preview'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Print Ready Document View
          </button>
        </div>

        {/* Primary Actions: Insert to Project & Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInsertModalOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            Insert Items into Active Project BOQ ({allItems.length} Items)
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* 2. THE PRINT-READY DOCUMENT CONTAINER */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-md p-6 sm:p-8 md:p-10 flex-1 overflow-x-auto text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0">
        {/* Printable Official Government Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-5 text-center relative">
          <div className="flex items-center justify-between">
            {/* Left National Emblem / Seal placeholder */}
            <div className="hidden sm:flex flex-col items-center justify-center w-20 text-center opacity-80">
              <span className="text-[9px] font-extrabold text-red-700 tracking-wider">Government</span>
              <span className="text-[8px] text-slate-500 font-mono">OFFICIAL SEAL</span>
            </div>

            {/* Central Office & Document Titles */}
            <div className="flex-1 px-4 space-y-1">
              <div className="text-xs font-extrabold text-red-700 tracking-wider uppercase">
. (Standard Format)
              </div>
              {viewMode === 'edit' ? (
                <input
                  type="text"
                  value={docHeader.officeName}
                  onChange={(e) => setDocHeader({ ...docHeader, officeName: e.target.value })}
                  className="text-base sm:text-lg font-black text-center w-full border-b border-dashed border-slate-300 focus:outline-hidden focus:border-blue-600 bg-transparent"
                  title="Click to edit office name"
                />
              ) : (
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  {docHeader.officeName}
                </h1>
              )}

              <div className="text-sm font-extrabold text-blue-950 uppercase tracking-wide">
                BILL OF QUANTITIES (BOQ) &amp; COST ESTIMATE
              </div>
              <div className="text-xs font-bold text-slate-600">
                Cost estimate and rate analysis form
              </div>
            </div>

            {/* Right Document Meta */}
            <div className="hidden sm:flex flex-col items-end text-[10.5px] text-slate-600 font-mono space-y-0.5">
              <span>FY: <strong>{docHeader.fiscalYear}</strong></span>
              <span>Zone: <strong>{selectedZone?.name_en || project.zone}</strong></span>
              <span>Page: <strong>1 of 1</strong></span>
            </div>
          </div>

          {/* Project Details Grid Banner */}
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-left text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Project Title:</span>
              {viewMode === 'edit' ? (
                <input
                  type="text"
                  value={docHeader.projectName}
                  onChange={(e) => setDocHeader({ ...docHeader, projectName: e.target.value })}
                  className="font-bold text-slate-900 text-xs w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                />
              ) : (
                <span className="font-bold text-slate-900">{docHeader.projectName}</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Location (.):</span>
              {viewMode === 'edit' ? (
                <input
                  type="text"
                  value={docHeader.location}
                  onChange={(e) => setDocHeader({ ...docHeader, location: e.target.value })}
                  className="font-bold text-slate-900 text-xs w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                />
              ) : (
                <span className="font-bold text-slate-900">{docHeader.location}</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Contract / ID No.:</span>
              {viewMode === 'edit' ? (
                <input
                  type="text"
                  value={docHeader.contractId}
                  onChange={(e) => setDocHeader({ ...docHeader, contractId: e.target.value })}
                  className="font-bold text-slate-900 text-xs w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden font-mono"
                />
              ) : (
                <span className="font-bold text-slate-900 font-mono">{docHeader.contractId}</span>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Fiscal Year &amp; Zone:</span>
              <span className="font-bold text-slate-900">{docHeader.fiscalYear} • {docHeader.zone}</span>
            </div>
          </div>
        </div>

        {/* 3. THE PRINT-READY BOQ TABLE */}
        <table className="w-full border-collapse border-2 border-slate-800 text-xs print:text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-800 font-black">
              <th className="border border-slate-400 p-2 text-center w-12 shrink-0">S.No.<br/><span className="text-[10px] font-normal">S.N.</span></th>
              <th className="border border-slate-400 p-2 text-center w-20 shrink-0">Item code<br/><span className="text-[10px] font-normal">Code</span></th>
              <th className="border border-slate-400 p-2 text-left">Work description<br/><span className="text-[10px] font-normal">Description of Works &amp; Specifications</span></th>
              <th className="border border-slate-400 p-2 text-center w-16 shrink-0">Unit<br/><span className="text-[10px] font-normal">Unit</span></th>
              <th className="border border-slate-400 p-2 text-right w-24 shrink-0">Quantity<br/><span className="text-[10px] font-normal">Quantity</span></th>
              <th className="border border-slate-400 p-2 text-right w-24 shrink-0">Rate ({currencyCode()})<br/><span className="text-[10px] font-normal">Rate ({currencyCode()})</span></th>
              <th className="border border-slate-400 p-2 text-right w-28 shrink-0">Total amount ({currencyCode()})<br/><span className="text-[10px] font-normal">Amount ({currencyCode()})</span></th>
              <th className="border border-slate-400 p-2 text-center w-24 shrink-0">Remarks<br/><span className="text-[10px] font-normal">Remarks</span></th>
              {viewMode === 'edit' && (
                <th className="print:hidden border border-slate-400 p-2 text-center w-16 shrink-0 bg-blue-50 text-blue-900">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter, chIdx) => {
              const chapterSubtotal = chapter.items.reduce((s, it) => s + (it.amount || 0), 0);

              return (
                <React.Fragment key={chapter.id}>
                  {/* Chapter Section Heading Row */}
                  <tr className="bg-slate-200/90 font-black border-y-2 border-slate-700">
                    <td colSpan={viewMode === 'edit' ? 9 : 8} className="p-2 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[11px] font-mono">
                            {chapter.code}
                          </span>
                          {viewMode === 'edit' ? (
                            <input
                              type="text"
                              value={chapter.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setChapters((prev) =>
                                  prev.map((c) => (c.id === chapter.id ? { ...c, title: val } : c))
                                );
                              }}
                              className="font-black text-slate-900 text-xs sm:text-sm bg-white/70 px-2 py-0.5 rounded border border-slate-300 focus:outline-hidden focus:border-blue-600 min-w-[280px]"
                            />
                          ) : (
                            <span className="text-xs sm:text-sm text-slate-900 font-black">
                              {chapter.title}
                            </span>
                          )}
                        </div>

                        <div className="text-right text-[11px] font-mono font-bold text-slate-800 pr-2">
 Subtotal:. {chapterSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Chapter Line Items */}
                  {chapter.items.map((item, itIdx) => {
                    const snLabel = `${chIdx + 1}.${itIdx + 1}`;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 border-b border-slate-300 transition-colors"
                      >
                        {/* S.N. */}
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-700">
                          {snLabel}
                        </td>

                        {/* Item Code */}
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-blue-900">
                          {viewMode === 'edit' ? (
                            <input
                              type="text"
                              value={item.item_code}
                              onChange={(e) =>
                                handleUpdateItem(chapter.id, item.id, 'item_code', e.target.value)
                              }
                              className="w-full text-center text-xs font-mono font-bold border border-slate-200 rounded px-1 py-1 focus:bg-white focus:border-blue-600 bg-transparent"
                            />
                          ) : (
                            item.item_code
                          )}
                        </td>

                        {/* Description */}
                        <td className="border border-slate-300 p-2 text-slate-900 text-left">
                          {viewMode === 'edit' ? (
                            <div className="space-y-1">
                              <textarea
                                value={item.description}
                                rows={2}
                                onChange={(e) =>
                                  handleUpdateItem(chapter.id, item.id, 'description', e.target.value)
                                }
                                className="w-full text-xs text-slate-900 border border-slate-200 rounded p-1.5 focus:bg-white focus:border-blue-600 leading-relaxed"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium leading-relaxed">{item.description}</div>
                            </div>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="border border-slate-300 p-1.5 text-center">
                          {viewMode === 'edit' ? (
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                handleUpdateItem(chapter.id, item.id, 'unit', e.target.value)
                              }
                              className="w-14 text-center text-xs font-bold border border-slate-200 rounded p-1 focus:bg-white focus:border-blue-600 bg-transparent"
                            />
                          ) : (
                            <span className="font-bold text-slate-800">{item.unit}</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="border border-slate-300 p-1.5 text-right font-mono">
                          {viewMode === 'edit' ? (
                            <input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(chapter.id, item.id, 'quantity', e.target.value)
                              }
                              className="w-20 text-right text-xs font-mono font-bold border border-slate-200 rounded p-1 focus:bg-white focus:border-blue-600 bg-transparent text-emerald-800"
                            />
                          ) : (
                            <span className="font-bold text-emerald-900">
                              {Number(item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Rate */}
                        <td className="border border-slate-300 p-1.5 text-right font-mono">
                          {viewMode === 'edit' ? (
                            <input
                              type="number"
                              step="any"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateItem(chapter.id, item.id, 'rate', e.target.value)
                              }
                              className="w-22 text-right text-xs font-mono font-bold border border-slate-200 rounded p-1 focus:bg-white focus:border-blue-600 bg-transparent text-blue-900"
                            />
                          ) : (
                            <span className="font-bold text-slate-800">
                              {Number(item.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                          {Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Remarks */}
                        <td className="border border-slate-300 p-1.5 text-center text-[11px] text-slate-500">
                          {viewMode === 'edit' ? (
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) =>
                                handleUpdateItem(chapter.id, item.id, 'remarks', e.target.value)
                              }
                              placeholder="Remarks"
                              className="w-full text-center text-[10.5px] border border-slate-200 rounded p-1 focus:bg-white focus:border-blue-600 bg-transparent"
                            />
                          ) : (
                            item.remarks || '-'
                          )}
                        </td>

                        {/* Edit Mode Actions */}
                        {viewMode === 'edit' && (
                          <td className="print:hidden border border-slate-300 p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleDuplicateItem(chapter.id, item)}
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                title="Duplicate Item"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(chapter.id, item.id)}
                                className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Add Item Row in Edit Mode */}
                  {viewMode === 'edit' && (
                    <tr className="print:hidden bg-slate-50/50 border-b border-slate-300">
                      <td colSpan={9} className="p-2 text-left">
                        <button
                          onClick={() => handleAddItem(chapter.id)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add New Item to {chapter.title}
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Chapter Subtotal Summary Row */}
                  <tr className="bg-slate-100/90 font-bold border-b-2 border-slate-400 text-xs">
                    <td colSpan={6} className="p-2 text-right text-slate-700">
                      Subtotal of {chapter.code} ({chapter.title}):
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-slate-950">
                      {currencyCode()} {chapterSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={viewMode === 'edit' ? 2 : 1}></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Add Chapter Button in Edit Mode */}
        {viewMode === 'edit' && (
          <div className="print:hidden mt-3 flex items-center justify-between">
            <button
              onClick={handleAddChapter}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Add New Heading / Chapter Section
            </button>
            <span className="text-xs text-slate-500">
              Total {chapters.length} Chapters • {allItems.length} Line Items
            </span>
          </div>
        )}

        {/* 4. FINANCIAL GRAND SUMMARY TABLE */}
        <div className="mt-6 flex flex-col md:flex-row justify-end items-stretch gap-6">
          <div className="w-full md:w-96 border-2 border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 text-xs font-mono">
            {/* Direct Works Subtotal */}
            <div className="flex justify-between p-2.5 border-b border-slate-300">
              <span className="font-bold text-slate-700">A. Total Direct Works Cost:</span>
              <span className="font-extrabold text-slate-900">
                {currencyCode()} {totalDirectCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Contingency */}
            <div className="flex justify-between p-2.5 border-b border-slate-300 items-center">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                B. Physical Contingency ({docHeader.contingencyPercent}%):
              </span>
              <span className="font-bold text-slate-900">
                {currencyCode()} {contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Tax */}
            <div className="flex justify-between p-2.5 border-b border-slate-300 items-center">
              <span className="text-slate-700 font-semibold">
                C. Tax ({docHeader.taxPercent}%):
              </span>
              <span className="font-bold text-slate-900">
                {currencyCode()} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between p-3 bg-slate-900 text-white text-sm font-black">
              <span>GRAND TOTAL:</span>
              <span className="text-emerald-400">
                {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-300 text-xs font-serif text-slate-800">
          <strong>In Words:</strong>
          {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Only)
        </div>

        {/* 5. OFFICIAL SIGNATURES BLOCK */}
        <div className="mt-12 pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-8">
            <div className="h-10 border-b border-dashed border-slate-500"></div>
            <div>
              <p className="font-bold text-slate-900">Prepared By</p>
              <p className="text-[11px] text-slate-600">Sub-Engineer / Engineer</p>
              <p className="text-[10px] text-slate-400 font-mono">Date: ____-__-__</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="h-10 border-b border-dashed border-slate-500"></div>
            <div>
              <p className="font-bold text-slate-900">Checked By</p>
              <p className="text-[11px] text-slate-600">Assistant Engineer / Planning Chief</p>
              <p className="text-[10px] text-slate-400 font-mono">Date: ____-__-__</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="h-10 border-b border-dashed border-slate-500"></div>
            <div>
              <p className="font-bold text-slate-900">Approved By</p>
              <p className="text-[11px] text-slate-600">Senior Divisional Engineer / Office Chief</p>
              <p className="text-[10px] text-slate-400 font-mono">Date: ____-__-__</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MODAL: INSERT ITEMS INTO ACTIVE PROJECT BOQ */}
      {isInsertModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-300 p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Insert BOQ Items into Project
                </h3>
                <p className="text-xs text-slate-500">
                  Keep all added values, quantities, and rates in the project estimate
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Items to Insert:</span>
                <strong className="text-slate-900">{allItems.length} Line Items</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Chapters / Headings:</span>
                <strong className="text-slate-900">{chapters.length} Sections</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Calculated Cost:</span>
                <strong className="text-emerald-700 text-sm font-mono font-black">
                  {currencyCode()} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Append vs Replace Choice */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700">Choose Insertion Mode:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInsertMode('append')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    insertMode === 'append'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">Append to Existing</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Keep your current {project.items.length} items and add these {allItems.length} new items at the end.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInsertMode('replace')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    insertMode === 'replace'
                      ? 'border-red-600 bg-red-50/60 ring-2 ring-red-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-red-900">Replace All Items</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Clear current items and replace completely with this print-ready BOQ structure.
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsInsertModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsert}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm &amp; Insert into Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
