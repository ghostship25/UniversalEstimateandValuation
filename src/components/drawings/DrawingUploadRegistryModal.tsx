import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Layers,
  Sparkles,
  Eye,
  Trash2,
  FolderOpen,
  Info,
  Download,
  HelpCircle,
  Tag,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { DrawingCategory, UploadedDrawingRecord } from './types';

interface DrawingUploadRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDrawingRecord: (record: UploadedDrawingRecord) => void;
  uploadedRecords: UploadedDrawingRecord[];
  onDeleteRecord: (id: string) => void;
  onSelectAsActiveTemplate?: (record: UploadedDrawingRecord) => void;
}

export const DrawingUploadRegistryModal: React.FC<DrawingUploadRegistryModalProps> = ({
  isOpen,
  onClose,
  onAddDrawingRecord,
  uploadedRecords,
  onDeleteRecord,
  onSelectAsActiveTemplate
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'registry' | 'guide'>('upload');

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [structureName, setStructureName] = useState('');
  const [drawingCode, setDrawingCode] = useState('');
  const [associatedCategory, setAssociatedCategory] = useState<DrawingCategory>('protection_wall');
  const [associatedType, setAssociatedType] = useState('plum_concrete');
  const [description, setDescription] = useState('');
  const [previewRecord, setPreviewRecord] = useState<UploadedDrawingRecord | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setStructureName(fileNameWithoutExt);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'CAD';
    setDrawingCode(`DWG-${ext}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const detectFormat = (filename: string): UploadedDrawingRecord['fileFormat'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'dwf') return 'DWF';
    if (ext === 'dxf') return 'DXF';
    if (ext === 'pdf') return 'PDF';
    if (ext === 'dwg') return 'DWG';
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '')) return 'IMAGE';
    return 'OTHER';
  };

  const handleSaveToRegistry = () => {
    if (!selectedFile) return;

    const format = detectFormat(selectedFile.name);
    const reader = new FileReader();

    const saveRecord = (dataUrl?: string, textContent?: string) => {
      const newRecord: UploadedDrawingRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName: selectedFile.name,
        fileFormat: format,
        fileSize: formatFileSize(selectedFile.size),
        uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        associatedCategory,
        associatedType,
        structureName: structureName || selectedFile.name,
        drawingCode: drawingCode || 'DWG-001',
        dataUrl,
        textContent,
        description,
        tags: [format, associatedCategory.replace('_', ' '), associatedType]
      };

      onAddDrawingRecord(newRecord);
      setSelectedFile(null);
      setStructureName('');
      setDrawingCode('');
      setDescription('');
      setActiveTab('registry');
    };

    if (format === 'DXF') {
      reader.onload = (evt) => saveRecord(undefined, evt.target?.result as string);
      reader.readAsText(selectedFile);
    } else {
      reader.onload = (evt) => saveRecord(evt.target?.result as string, undefined);
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-2xl shadow-md">
              <UploadCloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg flex items-center gap-2">
                <span>CAD & Drawing File Template Registry</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  .DWF | .DXF | .PDF
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload structural drawings and register them as parametric templates for BOQ & MB sync.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2 text-xs font-bold px-5">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Drawing File</span>
          </button>

          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'registry'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Registered Templates Registry ({uploadedRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Format & Setup Guide</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-3 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/80 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dwf,.dxf,.pdf,.dwg,.png,.jpg,.jpeg,.svg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`p-4 rounded-2xl shadow-sm transition ${selectedFile ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    {selectedFile ? <CheckCircle2 className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                  </div>

                  {selectedFile ? (
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{selectedFile.name}</h4>
                      <p className="text-xs font-semibold text-emerald-700 mt-1">
                        Format: <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded-md">{detectFormat(selectedFile.name)}</span> | Size: {formatFileSize(selectedFile.size)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                      >
                        Change / Remove File
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">
                        Drag and drop your drawing file here, or <span className="text-indigo-600 underline">browse</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Supports AutoCAD <strong className="text-indigo-900">.DWF</strong>, <strong className="text-indigo-900">.DXF</strong>, vector/raster <strong className="text-indigo-900">.PDF</strong>, <strong className="text-indigo-900">.DWG</strong>, and high-res drawing images (.PNG / .JPG).
                      </p>

                      <div className="flex items-center justify-center gap-2 mt-4 text-[11px] font-mono font-bold text-slate-600">
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">.DWF</span>
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">.DXF</span>
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">.PDF</span>
                        <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs font-sans">Images (.png, .jpg)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Structure Registration Form */}
              {selectedFile && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Associate Drawing File with Structure Template</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Structure Template Title:
                      </label>
                      <input
                        type="text"
                        value={structureName}
                        onChange={(e) => setStructureName(e.target.value)}
                        placeholder="e.g. Standard Plum Concrete Protection Wall Section"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Drawing Ref Code:
                      </label>
                      <input
                        type="text"
                        value={drawingCode}
                        onChange={(e) => setDrawingCode(e.target.value)}
                        placeholder="e.g. DWG-PLUM-01"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Structure Category:
                      </label>
                      <select
                        value={associatedCategory}
                        onChange={(e) => {
                          const cat = e.target.value as DrawingCategory;
                          setAssociatedCategory(cat);
                          if (cat === 'protection_wall') setAssociatedType('plum_concrete');
                          else if (cat === 'culvert') setAssociatedType('box_single');
                          else if (cat === 'drain') setAssociatedType('rectangular');
                          else if (cat === 'road') setAssociatedType('flexible_asphalt');
                        }}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="protection_wall">🛡️ Protection Wall / Retaining Structure</option>
                        <option value="culvert">🌉 Culverts (Box / Pipe / Slab)</option>
                        <option value="drain">🌊 Drainage Structures</option>
                        <option value="road">🛣️ Road Pavement Cross-Section</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Structure Sub-Type:
                      </label>
                      <input
                        type="text"
                        value={associatedType}
                        onChange={(e) => setAssociatedType(e.target.value)}
                        placeholder="e.g. plum_concrete / box_single / rectangular"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description / Design Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter technical specifications, scale ratios, or structural notes for this drawing..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveToRegistry}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Register & Save Drawing Template</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'registry' && (
            <div className="space-y-4">
              {uploadedRecords.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-extrabold text-slate-800 text-sm">No Custom Drawings Uploaded Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Use the 'Upload Drawing File' tab to drag and drop your .DWF, .DXF, or .PDF structural drawings to register them as custom templates.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition inline-flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Drawing Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {uploadedRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shrink-0 font-mono font-black text-xs">
                          {rec.fileFormat}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm">{rec.structureName}</h4>
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-mono font-bold px-2 py-0.5 rounded-md">
                              {rec.drawingCode}
                            </span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                              {rec.associatedCategory.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-medium">
                            File: <strong className="text-slate-800">{rec.fileName}</strong> ({rec.fileSize}) | Uploaded: {rec.uploadDate}
                          </p>
                          {rec.description && (
                            <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">{rec.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onSelectAsActiveTemplate && (
                          <button
                            onClick={() => onSelectAsActiveTemplate(rec)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Use Template</span>
                          </button>
                        )}

                        {rec.dataUrl && (
                          <a
                            href={rec.dataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white border border-slate-300 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition"
                            title="Preview Drawing File"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => onDeleteRecord(rec.id)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl transition"
                          title="Delete from Registry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-5 text-slate-700 text-xs leading-relaxed">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl">
                <h4 className="font-extrabold text-indigo-950 text-sm mb-1 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>How to Prepare & Upload Drawings for Custom Structure Templates</span>
                </h4>
                <p className="text-indigo-900 text-xs">
                  You can upload design drawings directly into Standard Templates. Below are the recommended formats and technical specifications:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="font-black text-slate-900 text-xs flex items-center justify-between">
                    <span>1. AutoCAD DWF (.dwf)</span>
                    <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[10px]">Vector CAD</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Design Web Format exported directly from AutoCAD. Preserves vector layers, sheet views, title blocks, and dimensions.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="font-black text-slate-900 text-xs flex items-center justify-between">
                    <span>2. Drawing Exchange (.dxf)</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">ASCII / Binary</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Open CAD format containing raw coordinate geometry (POLYLINES, LINES, TEXT, DIMENSIONS) readable by UEV CAD overlay.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="font-black text-slate-900 text-xs flex items-center justify-between">
                    <span>3. Vector / Raster PDF (.pdf)</span>
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px]">Standard Document</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Standard engineering drawings exported as PDF documents. Displayed as visual overlays with interactive CAD measurement controls.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl space-y-2">
                <h5 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Automatic Parameter & MB Sync Pipeline:</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                  <li>When you select an uploaded drawing template, you can map its key dimensions (Width, Height, PCC, Soling, Formwork).</li>
                  <li>Adding sections in the template drawing automatically generates corresponding detail rows in the <strong>Measurement Book (MB)</strong>.</li>
                  <li>All changes sync dynamically to BOQ totals and cost estimates.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Registered Files: <strong className="text-slate-900">{uploadedRecords.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
