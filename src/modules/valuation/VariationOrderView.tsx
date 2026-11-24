import React, { useState } from 'react';
import {
  GitPullRequest,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ProjectEstimate, Contract, VariationOrder } from '../../types';
import { currencyCode } from '../../services/currency';

interface VariationOrderViewProps {
  project: ProjectEstimate;
  contract: Contract | null;
  variations: VariationOrder[];
  setVariations: React.Dispatch<React.SetStateAction<VariationOrder[]>>;
  setProject?: (u: ProjectEstimate | ((prev: ProjectEstimate) => ProjectEstimate)) => void;
  showToast: (msg: string) => void;
}

export const VariationOrderView: React.FC<VariationOrderViewProps> = ({
  project,
  contract,
  variations,
  setVariations,
  setProject,
  showToast
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(project.items[0]?.id || '');
  const [variationType, setVariationType] = useState<'QUANTITY_VARIATION' | 'EXTRA_ITEM'>('QUANTITY_VARIATION');
  const [revisedQty, setRevisedQty] = useState<number>(0);
  const [extraItemCode, setExtraItemCode] = useState('');
  const [extraDescription, setExtraDescription] = useState('');
  const [extraRate, setExtraRate] = useState(0);
  const [extraUnit, setExtraUnit] = useState('');
  const [approver, setApprover] = useState('');

  const currentItem = project.items.find((i) => i.id === selectedItemId);


  // revised contract sum = awarded amount + approved variations
  const approvedTotal = variations.filter((v) => v.status === 'APPROVED').reduce((s, v) => s + (v.amount_impact || 0), 0);
  const awarded = contract?.awarded_amount ?? 0;
  const revisedSum = awarded + approvedTotal;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const inBoq = (v: VariationOrder) => project.items.some((i) => i.item_code === v.item_code && v.type === 'EXTRA_ITEM');
  const addExtraToBoq = (v: VariationOrder) => {
    if (!setProject) return;
    setProject((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item_${Date.now()}`,
          item_id: (prev.items.reduce((m, i) => Math.max(m, i.item_id || 0), 0) || 0) + 1,
          item_code: v.item_code,
          description: `${v.description} (${v.variation_no})`,
          unit: v.unit,
          estimated_quantity: v.revised_qty,
          calculated_unit_rate: v.approved_rate,
          total_amount: Math.round(v.revised_qty * v.approved_rate * 100) / 100,
          chapter: 'Variations',
          mb_rows: [],
        } as any,
      ],
    }));
    showToast(`${v.item_code} added to the BOQ so it can be measured and valued.`);
  };

  const handleCreateVariation = (e: React.FormEvent) => {
    e.preventDefault();

    const isExtra = variationType === 'EXTRA_ITEM';
    if (isExtra && (!extraItemCode.trim() || !extraDescription.trim() || !extraUnit.trim())) { showToast('Enter the extra item code, description and unit.'); return; }
    if (!isExtra && !currentItem) { showToast('Choose the item to vary.'); return; }
    const origQty = isExtra ? 0 : (currentItem?.estimated_quantity ?? 0);
    const rate = isExtra ? extraRate : (currentItem?.calculated_unit_rate ?? 0);
    const revQty = isExtra ? revisedQty : revisedQty;
    const impact = (revQty - origQty) * rate;

    const newVO: VariationOrder = {
      id: `vo_${Date.now()}`,
      contract_id: contract?.id || 'default_contract',
      variation_no: `VO-${String(variations.length + 1).padStart(3, '0')}`,
      type: variationType,
      item_code: isExtra ? extraItemCode.trim() : (currentItem?.item_code || ''),
      description: isExtra ? extraDescription.trim() : (currentItem?.description || ''),
      unit: isExtra ? extraUnit.trim() : (currentItem?.unit || ''),
      original_qty: origQty,
      revised_qty: revQty,
      approved_rate: rate,
      amount_impact: Math.round(impact * 100) / 100,
      status: 'PENDING',
      approved_by: approver.trim(),
      approval_date_iso: ''
    };

    setVariations([...variations, newVO]);
    showToast(`Variation Order ${newVO.variation_no} successfully submitted.`);
  };

  const handleUpdateStatus = (id: string, status: VariationOrder['status']) => {
    setVariations(
      variations.map((v) => (v.id === id ? { ...v, status, approval_date_iso: status === 'APPROVED' ? new Date().toISOString().slice(0, 10) : v.approval_date_iso } : v))
    );
    showToast(`Variation Order status changed to ${status}.`);
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
            <span className="text-blue-200 text-xs font-mono">• Variation Orders</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Variation Orders & Scope Revisions</h2>
          <p className="text-xs text-blue-100 mt-1">
            Log quantity variations and new extra items required during site execution as per Public Procurement Regulations (PPR).
          </p>
        </div>
      </div>

      {/* Form to submit Variation Order */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-600" />
          Submit Variation Order Proposal
        </h3>

        <form onSubmit={handleCreateVariation} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Variation Type</label>
              <select
                value={variationType}
                onChange={(e) => setVariationType(e.target.value as any)}
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50"
              >
                <option value="QUANTITY_VARIATION">Quantity Variation (+ / -)</option>
                <option value="EXTRA_ITEM">Extra New Work Item</option>
              </select>
            </div>

            {variationType === 'QUANTITY_VARIATION' ? (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Existing BOQ Work Item</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold bg-white"
                >
                  {project.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item_code} - Orig Qty: {i.estimated_quantity} {i.unit}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Extra Item Code</label>
                  <input
                    type="text"
                    value={extraItemCode}
                    onChange={(e) => setExtraItemCode(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Analyzed Extra Unit Rate ({currencyCode()})</label>
                  <input
                    type="number"
                    value={extraRate}
                    onChange={(e) => setExtraRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input type="text" value={extraUnit} onChange={(e) => setExtraUnit(e.target.value)} placeholder="e.g. Cu.m." className="w-full p-2.5 border rounded-xl font-mono font-bold" required />
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {variationType === 'EXTRA_ITEM' ? 'Proposed Extra Quantity' : 'Revised Final Quantity'}
              </label>
              <input
                type="number"
                step="0.01"
                value={revisedQty}
                onChange={(e) => setRevisedQty(parseFloat(e.target.value))}
                className="w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900"
                required
              />
            </div>
          </div>

          {variationType === 'EXTRA_ITEM' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Extra Item Technical Specification</label>
              <input
                type="text"
                value={extraDescription}
                onChange={(e) => setExtraDescription(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
                required
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Submit Variation Order for Approval
            </button>
          </div>
        </form>
      </div>

      {/* Variation Orders List Table */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4" data-testid="vo-summary">
          {[
            ['Awarded contract sum', fmt(awarded), 'text-slate-900'],
            ['Approved variations', `${approvedTotal >= 0 ? '+' : ''}${fmt(approvedTotal)}`, approvedTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'],
            ['Revised contract sum', fmt(revisedSum), 'text-indigo-800'],
            ['Change', awarded ? `${((approvedTotal / awarded) * 100).toFixed(2)}%` : 'n/a', 'text-slate-700'],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">{k}</div>
              <div className={`font-mono font-extrabold text-lg ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 text-amber-600" />
          Variation Orders Register
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5">VO No.</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Item Code & Specification</th>
                <th className="p-2.5 text-right">Original Qty</th>
                <th className="p-2.5 text-right">Revised Qty</th>
                <th className="p-2.5 text-right">Rate</th>
                <th className="p-2.5 text-right">Financial Impact</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {variations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    No Variation Orders logged yet.
                  </td>
                </tr>
              ) : (
                variations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-amber-800">{v.variation_no}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.type === 'EXTRA_ITEM' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {v.type === 'EXTRA_ITEM' ? 'Extra Item' : 'Qty Variation'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <strong className="font-mono text-slate-900 block">{v.item_code}</strong>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{v.description}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono">{v.original_qty} {v.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{v.revised_qty} {v.unit}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700">{currencyCode()} {v.approved_rate}</td>
                    <td className="p-2.5 text-right font-mono font-extrabold text-amber-700">
                      {currencyCode()} {v.amount_impact.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      {v.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateStatus(v.id, 'APPROVED')}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Approve VO"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(v.id, 'REJECTED')}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Reject VO"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {v.status === 'APPROVED' && v.type === 'EXTRA_ITEM' && setProject && (
                        inBoq(v)
                          ? <span className="text-[10px] font-bold text-emerald-700">In BOQ</span>
                          : <button data-testid="vo-add-boq" onClick={() => addExtraToBoq(v)} className="px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white hover:bg-indigo-500" title="Add this extra item to the BOQ so it can be measured and valued">Add to BOQ</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
