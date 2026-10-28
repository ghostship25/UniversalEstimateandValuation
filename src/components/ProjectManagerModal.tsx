import React, { useState } from 'react';
import {
  FolderPlus,
  Briefcase,
  Copy,
  Trash2,
  CheckCircle2,
  Plus,
  Search,
  DollarSign,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Edit2,
  FileText
} from 'lucide-react';
import { ProjectEstimate, ZoneInfo } from '../types';
import { currencyCode } from '../services/currency';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectEstimate[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectEstimate[]>>;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  zones: ZoneInfo[];
  fiscalYears: string[];
  showToast: (msg: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  setProjects,
  activeProjectId,
  setActiveProjectId,
  zones,
  fiscalYears,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectEstimate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Form State for New / Editing Project
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('Department of Urban Development & Building Construction');
  const [selectedZoneName, setSelectedZoneName] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [overheadPercent, setOverheadPercent] = useState(15);
  const [taxPercent, setTaxPercent] = useState(10);

  // Additional project fields
  const [implementationLocation, setImplementationLocation] = useState('');
  const [budgetHeadNo, setBudgetHeadNo] = useState('');
  const [allocatedBudgetAmount, setAllocatedBudgetAmount] = useState<number>(0);
  const [userContributionAmount, setUserContributionAmount] = useState<number>(0);

  // Custom Header Config Form State
  const [muniName, setMuniName] = useState('Sample City Authority');
  const [offName, setOffName] = useState('Local Authority Office');
  const [offAddr, setOffAddr] = useState('Sample City, Sample Province');
  const [docMb, setDocMb] = useState('Construction quantity estimate');
  const [docEst, setDocEst] = useState('Construction cost estimate');
  const [docRate, setDocRate] = useState('Rate Analysis');
  const [docRes, setDocRes] = useState('Quantity details of construction materials, labor and equipment');

  if (!isOpen) return null;

  const handleStartEdit = (p: ProjectEstimate) => {
    setEditingProject(p);
    setTitle(p.title);
    setClientName(p.client_name);
    setSelectedZoneName(p.zone);
    setSelectedFY(p.fiscal_year);
    setOverheadPercent(p.contractor_overhead_percent || 15);
    setTaxPercent(p.tax_percent ?? 10);
    setImplementationLocation(p.implementation_location || p.header_config?.implementation_location || '');
    setBudgetHeadNo(p.budget_head_no || p.header_config?.budget_head_no || '');
    setAllocatedBudgetAmount(p.allocated_budget_amount || 0);
    setUserContributionAmount(p.user_contribution_amount || 0);
    setMuniName(p.header_config?.authority_name || 'Sample City Authority');
    setOffName(p.header_config?.office_name || 'Local Authority Office');
    setOffAddr(p.header_config?.office_address || 'Sample City, Sample Province');
    setDocMb(p.header_config?.document_title_mb || 'Construction quantity estimate');
    setDocEst(p.header_config?.document_title_estimate || 'Construction cost estimate');
    setDocRate(p.header_config?.document_title_rate_analysis || 'Rate Analysis');
    setDocRes(p.header_config?.document_title_resource || 'Quantity details of construction materials, labor and equipment');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === editingProject.id) {
          return {
            ...p,
            title,
            client_name: clientName,
            zone: selectedZoneName,
            fiscal_year: selectedFY,
            contractor_overhead_percent: overheadPercent,
            tax_percent: taxPercent,
            implementation_location: implementationLocation,
            budget_head_no: budgetHeadNo,
            allocated_budget_amount: Number(allocatedBudgetAmount) || 0,
            user_contribution_amount: Number(userContributionAmount) || 0,
            header_config: {
              authority_name: muniName,
              office_name: offName,
              office_address: offAddr,
              implementation_location: implementationLocation,
              budget_head_no: budgetHeadNo,
              document_title_mb: docMb,
              document_title_estimate: docEst,
              document_title_rate_analysis: docRate,
              document_title_resource: docRes
            }
          };
        }
        return p;
      })
    );

    showToast(`Updated project "${title}" & budget parameters!`);
    setEditingProject(null);
  };

  const filteredProjects = projects.filter(
    (p) =>
      String(p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.zone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a project estimate title.');
      return;
    }

    const newProject: ProjectEstimate = {
      id: `proj_${Date.now()}`,
      title: title.trim(),
      client_name: clientName.trim(),
      zone: selectedZoneName,
      fiscal_year: selectedFY,
      implementation_location: implementationLocation.trim(),
      budget_head_no: budgetHeadNo.trim(),
      allocated_budget_amount: Number(allocatedBudgetAmount) || 0,
      user_contribution_amount: Number(userContributionAmount) || 0,
      contractor_overhead_percent: Number(overheadPercent) || 15,
      tax_percent: Number(taxPercent) || 0,
      lead_distance_km: 0,
      items: [],
      header_config: {
        authority_name: muniName,
        office_name: offName,
        office_address: offAddr,
        implementation_location: implementationLocation.trim(),
        budget_head_no: budgetHeadNo.trim()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setIsCreatingNew(false);
    setTitle('');
    showToast(`Created new project estimate: "${newProject.title}"`);
    onClose();
  };

  const handleDuplicateProject = (projectToClone: ProjectEstimate) => {
    const cloned: ProjectEstimate = {
      ...projectToClone,
      id: `proj_dup_${Date.now()}`,
      title: `${projectToClone.title} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setProjects((prev) => [cloned, ...prev]);
    setActiveProjectId(cloned.id);
    showToast(`Duplicated project estimate as "${cloned.title}"`);
  };

  const handleDeleteProject = (id: string, projTitle: string) => {
    if (projects.length <= 1) {
      showToast('Cannot delete the last remaining project estimate.');
      return;
    }
    setDeleteTarget({ id, title: projTitle });
  };

  const confirmDeleteProject = () => {
    if (!deleteTarget) return;
    const { id, title: projTitle } = deleteTarget;

    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        setActiveProjectId(remaining[0].id);
      }
    }
    setDeleteTarget(null);
    showToast(`Deleted project "${projTitle}".`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Project Estimates Manager</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create, switch, and maintain multiple independent civil engineering project estimates.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-1">
            ✕
          </button>
        </div>

        {/* Content Section */}
        {editingProject ? (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span className="font-bold text-emerald-900">Edit Project Headings & Parameters</span>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-emerald-700 hover:underline text-[11px] font-semibold"
              >
                ← Back to Projects List
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Client / Department Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Implementation Location</label>
                  <input
                    type="text"
                    value={implementationLocation}
                    onChange={(e) => setImplementationLocation(e.target.value)}
                    placeholder="e.g. Sample City Ward. 4, Sample Province"
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">. (Budget Head No.)</label>
                  <input
                    type="text"
                    value={budgetHeadNo}
                    onChange={(e) => setBudgetHeadNo(e.target.value)}
                    placeholder="e.g. 3370114"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Allocated Budget ( {currencyCode()})</label>
                  <input
                    type="number"
                    value={allocatedBudgetAmount || ''}
                    onChange={(e) => setAllocatedBudgetAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 500000"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">User Contribution ( {currencyCode()})</label>
                  <input
                    type="number"
                    value={userContributionAmount || ''}
                    onChange={(e) => setUserContributionAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50000"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-amber-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Location / Zone</label>
                  <select
                    value={selectedZoneName}
                    onChange={(e) => setSelectedZoneName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Select Zone --</option>
                    {zones.map((d) => (
                      <option key={d.id} value={d.name_en}>
                        {d.name_en} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fiscal Year</label>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Select Fiscal Year --</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy} value={fy}>
                        FY {fy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Official Document Print Headings Section */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-extrabold text-slate-800 text-xs">Official Print Headings & Formatting</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Local Authority / Local Government Name</label>
                  <input
                    type="text"
                    value={muniName}
                    onChange={(e) => setMuniName(e.target.value)}
                    placeholder="e.g. Sample City Authority"
                    className="w-full p-2 border rounded-xl font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Executive / Office Name</label>
                  <input
                    type="text"
                    value={offName}
                    onChange={(e) => setOffName(e.target.value)}
                    placeholder="e.g. Local Authority Office"
                    className="w-full p-2 border rounded-xl font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Location / Address</label>
                  <input
                    type="text"
                    value={offAddr}
                    onChange={(e) => setOffAddr(e.target.value)}
                    placeholder="e.g. Sample City, Sample Province"
                    className="w-full p-2 border rounded-xl font-medium bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">MB Report Title</label>
                    <input
                      type="text"
                      value={docMb}
                      onChange={(e) => setDocMb(e.target.value)}
                      className="w-full p-2 border rounded-xl font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cost Estimate Report Title</label>
                    <input
                      type="text"
                      value={docEst}
                      onChange={(e) => setDocEst(e.target.value)}
                      className="w-full p-2 border rounded-xl font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rate Analysis Report Title</label>
                    <input
                      type="text"
                      value={docRate}
                      onChange={(e) => setDocRate(e.target.value)}
                      className="w-full p-2 border rounded-xl font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Resource Breakdown Title</label>
                    <input
                      type="text"
                      value={docRes}
                      onChange={(e) => setDocRes(e.target.value)}
                      className="w-full p-2 border rounded-xl font-medium bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                Save Project Headings
              </button>
            </div>
          </form>
        ) : isCreatingNew ? (
          <form onSubmit={handleCreateProject} className="space-y-4 text-xs overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-blue-50/80 p-3 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-900">Create New Project Estimate</span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-blue-700 hover:underline text-[11px] font-semibold"
              >
                ← Back to Projects List
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name / Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ward No. 4 Road Blacktopping & Drainage Construction"
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Client / Department Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. BLD, Local Authority Office, Department of Roads"
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Implementation Location</label>
                  <input
                    type="text"
                    value={implementationLocation}
                    onChange={(e) => setImplementationLocation(e.target.value)}
                    placeholder="e.g. Sample City Ward. 4, Sample Province"
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">. (Budget Head No.)</label>
                  <input
                    type="text"
                    value={budgetHeadNo}
                    onChange={(e) => setBudgetHeadNo(e.target.value)}
                    placeholder="e.g. 3370114"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Allocated Budget ( {currencyCode()})</label>
                  <input
                    type="number"
                    value={allocatedBudgetAmount || ''}
                    onChange={(e) => setAllocatedBudgetAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 500000"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">User Contribution ( {currencyCode()})</label>
                  <input
                    type="number"
                    value={userContributionAmount || ''}
                    onChange={(e) => setUserContributionAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50000"
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-amber-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Project Location / Zone</label>
                  <select
                    value={selectedZoneName}
                    onChange={(e) => setSelectedZoneName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-medium bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Select Zone --</option>
                    {zones.map((d) => (
                      <option key={d.id} value={d.name_en}>
                        {d.name_en} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fiscal Year</label>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Select Fiscal Year --</option>
                    {fiscalYears.map((fy) => (
                      <option key={fy} value={fy}>
                        FY {fy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contractor Overhead %</label>
                  <input
                    type="number"
                    value={overheadPercent}
                    onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tax (Tax) %</label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-blue-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Estimate Project
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search project estimates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setIsCreatingNew(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition"
              >
                <Plus className="w-4 h-4" />
                + Create New Project
              </button>
            </div>

            {/* Projects List Grid */}
            <div className="space-y-3">
              {filteredProjects.map((p) => {
                const isActive = p.id === activeProjectId;
                const totalAmount = p.items.reduce((acc, item) => acc + item.total_amount, 0);
                const totalMbRows = p.items.reduce((acc, item) => acc + (item.mb_rows?.length || 0), 0);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{p.title}</span>
                        {isActive && (
                          <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE PROJECT
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {p.client_name}
                        </span>
                        <span>•</span>
                        <span>Zone: <strong className="text-slate-700">{p.zone}</strong></span>
                        <span>•</span>
                        <span>FY: <strong className="text-slate-700 font-mono">{p.fiscal_year}</strong></span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-3 pt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-blue-700">
                          {p.items.length} BOQ Items ({totalMbRows} MB Rows)
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          Total Estimate: {currencyCode()} {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => {
                            setActiveProjectId(p.id);
                            showToast(`Switched active project to "${p.title}"`);
                            onClose();
                          }}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          Select Project <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition"
                        title="Edit Project Headings & Parameters"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicateProject(p)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Duplicate Project Estimate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(p.id, p.title)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* In-App Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-100 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">Delete Project Estimate?</h4>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                Are you sure you want to delete project <strong className="text-slate-900 font-bold">"{deleteTarget.title}"</strong>?
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Yes, Delete Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
