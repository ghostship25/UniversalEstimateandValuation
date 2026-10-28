import React, { useState } from 'react';
import {
  FileText,
  Building2,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  Edit2,
  ShieldAlert,
  Percent,
  Briefcase
} from 'lucide-react';
import { ProjectEstimate, Contract } from '../../types';
import { currencyCode } from '../../services/currency';

interface ContractSetupViewProps {
  project: ProjectEstimate;
  contract: Contract | null;
  setContract: React.Dispatch<React.SetStateAction<Contract | null>>;
  showToast: (msg: string) => void;
}

export const ContractSetupView: React.FC<ContractSetupViewProps> = ({
  project,
  contract,
  setContract,
  showToast
}) => {
  const engineerEstimateTotal = project.items.reduce((sum, item) => sum + item.total_amount, 0);

  const [formState, setFormState] = useState<Partial<Contract>>({
    contract_number: contract?.contract_number || `CNT/${project.zone.toUpperCase()}/2026-27/01`,
    contract_title: contract?.contract_title || `${project.title}`,
    contractor_name: contract?.contractor_name || 'Summit Builders & Construction Pvt. Ltd.',
    contractor_pan: contract?.contractor_pan || '301294857',
    awarded_amount: contract?.awarded_amount || Math.round(engineerEstimateTotal * 0.88 * 100) / 100, // 12% below estimate by default
    engineer_estimate_amount: engineerEstimateTotal,
    tender_discount_percent: contract?.tender_discount_percent || 12.0,
    start_date_iso: contract?.start_date_iso || '2026-04-15',
    completion_date_iso: contract?.completion_date_iso || '2027-03-30',
    retention_percent: contract?.retention_percent || 5.0,
    advance_given: contract?.advance_given || 500000,
    status: contract?.status || 'ACTIVE'
  });

  const [isEditing, setIsEditing] = useState(!contract);

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    const newContract: Contract = {
      id: contract?.id || `contract_${Date.now()}`,
      project_id: project.id,
      contract_number: formState.contract_number || 'CONTRACT-01',
      contract_title: formState.contract_title || project.title,
      contractor_name: formState.contractor_name || 'Contractor Name',
      contractor_pan: formState.contractor_pan || '300000000',
      awarded_amount: Number(formState.awarded_amount) || engineerEstimateTotal,
      engineer_estimate_amount: engineerEstimateTotal,
      tender_discount_percent: Number(formState.tender_discount_percent) || 0,
      start_date_iso: formState.start_date_iso || '2026-04-01',
      completion_date_iso: formState.completion_date_iso || '2027-03-30',
      retention_percent: Number(formState.retention_percent) || 5.0,
      advance_given: Number(formState.advance_given) || 0,
      status: (formState.status as Contract['status']) || 'ACTIVE'
    };

    setContract(newContract);
    setIsEditing(false);
    showToast('Contract Agreement details successfully saved.');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-lg border-2 border-red-600 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              VALUATION (Post-Contract)
            </span>
            <span className="text-blue-200 text-xs font-mono">• Contract Setup</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Contract Details & Approved BOQ</h2>
          <p className="text-xs text-blue-100 mt-1">
            Log awarded contract information, contractor details, tender percentage below estimate, mobilization advance, and retention terms.
          </p>
        </div>

        {contract && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Contract Agreement
          </button>
        )}
      </div>

      {/* Contract Summary Cards */}
      {contract && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Engineer Estimate</span>
            <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
              {currencyCode()} {engineerEstimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-500">Office Estimate Total</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Contract Award Amount</span>
            <div className="text-lg font-extrabold text-emerald-800 font-mono mt-1">
              {currencyCode()} {contract.awarded_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-700 font-bold">
              {contract.tender_discount_percent > 0 ? `${contract.tender_discount_percent}% Below Estimate` : 'At Estimate Rate'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Retention Money</span>
            <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
              {contract.retention_percent}% <span className="text-xs text-slate-500 font-normal">Deducted per IPC</span>
            </div>
            <span className="text-[11px] text-slate-500">Security Deposit</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Contract Period</span>
            <div className="text-sm font-extrabold text-slate-900 font-mono mt-1">
              {contract.start_date_iso} to {contract.completion_date_iso}
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Status: {contract.status}
            </span>
          </div>
        </div>
      )}

      {/* Contract Form or View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 border-b pb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          {isEditing ? 'Contract Agreement Configuration Form' : 'Active Contract Specifications'}
        </h3>

        {isEditing ? (
          <form onSubmit={handleSaveContract} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contract Identification Number</label>
                <input
                  type="text"
                  value={formState.contract_number}
                  onChange={(e) => setFormState({ ...formState, contract_number: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900 font-bold bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contract Name / Scope</label>
                <input
                  type="text"
                  value={formState.contract_title}
                  onChange={(e) => setFormState({ ...formState, contract_title: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Awarded Contractor Name</label>
                <input
                  type="text"
                  value={formState.contractor_name}
                  onChange={(e) => setFormState({ ...formState, contractor_name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contractor PAN / Tax Number</label>
                <input
                  type="text"
                  value={formState.contractor_pan}
                  onChange={(e) => setFormState({ ...formState, contractor_pan: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Awarded Contract Amount ({currencyCode()})</label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.awarded_amount}
                  onChange={(e) => setFormState({ ...formState, awarded_amount: parseFloat(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tender Discount (%) Below Office Estimate</label>
                <input
                  type="number"
                  step="0.1"
                  value={formState.tender_discount_percent}
                  onChange={(e) => setFormState({ ...formState, tender_discount_percent: parseFloat(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Agreement Start Date</label>
                <input
                  type="text"
                  value={formState.start_date_iso}
                  onChange={(e) => setFormState({ ...formState, start_date_iso: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stipulated Completion Date</label>
                <input
                  type="text"
                  value={formState.completion_date_iso}
                  onChange={(e) => setFormState({ ...formState, completion_date_iso: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Retention Deduction (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formState.retention_percent}
                  onChange={(e) => setFormState({ ...formState, retention_percent: parseFloat(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobilization Advance Provided ({currencyCode()})</label>
                <input
                  type="number"
                  step="1000"
                  value={formState.advance_given}
                  onChange={(e) => setFormState({ ...formState, advance_given: parseFloat(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              {contract && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Save & Lock Contract Agreement
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contract No.</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{contract?.contract_number}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Awarded Contractor</span>
                <span className="font-bold text-slate-900">{contract?.contractor_name}</span>
                <span className="block text-[11px] text-slate-500">PAN: {contract?.contractor_pan}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contract Amount</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {currencyCode()} {contract?.awarded_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Approved BOQ Items Table */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-900 text-xs">Approved Contract BOQ Schedule</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="p-2.5">Item Code</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center">Unit</th>
                      <th className="p-2.5 text-right">BOQ Qty</th>
                      <th className="p-2.5 text-right">Contract Rate</th>
                      <th className="p-2.5 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {project.items.map((item) => {
                      const contractRate = contract?.tender_discount_percent
                        ? item.calculated_unit_rate * (1 - contract.tender_discount_percent / 100)
                        : item.calculated_unit_rate;
                      const contractTotal = item.estimated_quantity * contractRate;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-blue-700">{item.item_code}</td>
                          <td className="p-2.5 font-medium text-slate-800">{item.description}</td>
                          <td className="p-2.5 text-center">{item.unit}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{item.estimated_quantity.toLocaleString('en-US')}</td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            {currencyCode()} {contractRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            {currencyCode()} {contractTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
