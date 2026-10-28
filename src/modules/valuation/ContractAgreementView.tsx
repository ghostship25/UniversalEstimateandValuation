import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  FileSpreadsheet,
  Percent,
  DollarSign,
  Calendar,
  Building,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Award,
  Layers,
  AlertCircle,
  MoreVertical,
  Download
} from 'lucide-react';
import { ProjectEstimate, Contract, BOQItem } from '../../types';
import { currencyCode } from '../../services/currency';

interface ContractAgreementViewProps {
  project: ProjectEstimate;
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>;
  contract?: Contract;
  setContract?: (contract: Contract) => void;
  onNavigateToTab?: (tab: string) => void;
  showToast?: (msg: string) => void;
}

export const ContractAgreementView: React.FC<ContractAgreementViewProps> = ({
  project,
  setProject,
  contract,
  setContract,
  onNavigateToTab,
  showToast
}) => {
  // Local Contract Form
  const [contractorName, setContractorName] = useState(contract?.contractor_name || 'Mountain Construction & Builders Pvt. Ltd.');
  const [contractorPan, setContractorPan] = useState(contract?.contractor_pan || '602345678');
  const [contractNumber, setContractNumber] = useState(contract?.contract_number || `NCB-${project.fiscal_year.replace('/', '-')}-01`);
  const [agreementDateBs, setAgreementDateBs] = useState(contract?.start_date_iso || '2026-05-15');
  const [completionDateBs, setCompletionDateBs] = useState(contract?.completion_date_iso || '2027-02-30');
  const [tenderDiscountPercent, setTenderDiscountPercent] = useState<number>(contract?.tender_discount_percent || 8.5); // 8.5% below estimate
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Itemized Contractor Rates state
  const [contractorRates, setContractorRates] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    project.items.forEach((it) => {
      if (it.contractor_rate) {
        initial[it.id] = it.contractor_rate;
      } else {
        const discountFactor = 1 - (contract?.tender_discount_percent || 8.5) / 100;
        initial[it.id] = Math.round(it.calculated_unit_rate * discountFactor * 100) / 100;
      }
    });
    return initial;
  });

  // Calculate totals
  const { estimateTotal, contractTotal, tenderVariance, variancePercent } = useMemo(() => {
    let est = 0;
    let con = 0;

    project.items.forEach((it) => {
      const qty = it.estimated_quantity;
      const estRate = it.calculated_unit_rate;
      const conRate = contractorRates[it.id] ?? estRate;
      est += qty * estRate;
      con += qty * conRate;
    });

    const variance = con - est;
    const varPct = est > 0 ? Math.round((variance / est) * 10000) / 100 : 0;

    return {
      estimateTotal: est,
      contractTotal: con,
      tenderVariance: variance,
      variancePercent: varPct
    };
  }, [project.items, contractorRates]);

  // Apply uniform discount to all items
  const handleApplyUniformDiscount = () => {
    const factor = 1 - tenderDiscountPercent / 100;
    const updated: Record<string, number> = {};
    project.items.forEach((it) => {
      updated[it.id] = Math.round(it.calculated_unit_rate * factor * 100) / 100;
    });
    setContractorRates(updated);
    showToast?.(`Applied ${tenderDiscountPercent}% uniform rebate to all items.`);
  };

  const handleResetToEstimateRates = () => {
    const reset: Record<string, number> = {};
    project.items.forEach((it) => {
      reset[it.id] = it.calculated_unit_rate;
    });
    setContractorRates(reset);
    showToast?.('Reset all contractor rates to engineer estimate rates.');
  };

  const handleExportCSV = () => {
    const headers = ['Item Code', 'Description', 'Unit', 'BOQ Qty', 'Estimate Rate', 'Estimate Amount', 'Contractor Rate', 'Contract Amount', 'Difference (%)'];
    const rows = project.items.map((it, idx) => {
      const estRate = it.calculated_unit_rate;
      const conRate = contractorRates[it.id] ?? estRate;
      const estAmt = it.estimated_quantity * estRate;
      const conAmt = it.estimated_quantity * conRate;
      const diffPct = estRate > 0 ? Math.round(((conRate - estRate) / estRate) * 1000) / 10 : 0;
      return [
        `"${it.item_code || `Item-${idx + 1}`}"`,
        `"${it.description.replace(/"/g, '""')}"`,
        `"${it.unit}"`,
        it.estimated_quantity,
        estRate,
        estAmt,
        conRate,
        conAmt,
        `${diffPct}%`
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Contract_BOQ_${project.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.('Exported Contract BOQ to CSV');
  };

  // Save Agreement and Freeze Contract BOQ
  const handleSaveAgreement = () => {
    // 1. Update Project Items with contractor rates
    const updatedItems = project.items.map((it) => ({
      ...it,
      contractor_rate: contractorRates[it.id] ?? it.calculated_unit_rate,
      mode: 'contractor' as const
    }));

    setProject((prev) => ({
      ...prev,
      rate_mode: 'contractor',
      items: updatedItems,
      header_config: {
        ...prev.header_config,
        contractor_name: contractorName,
        contract_no: contractNumber,
        agreement_date: agreementDateBs,
        completion_date: completionDateBs
      }
    }));

    // 2. Update Contract Entity
    if (setContract) {
      setContract({
        id: contract?.id || `contract-${Date.now()}`,
        project_id: project.id,
        contract_number: contractNumber,
        contract_title: project.title,
        contractor_name: contractorName,
        contractor_pan: contractorPan,
        awarded_amount: contractTotal,
        engineer_estimate_amount: estimateTotal,
        tender_discount_percent: Math.abs(variancePercent),
        start_date_iso: agreementDateBs,
        completion_date_iso: completionDateBs,
        retention_percent: 5,
        advance_given: 0,
        status: 'ACTIVE'
      });
    }

    showToast?.('Contract Agreement successfully saved and Contract BOQ initialized.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                Contract Agreement & BOQ
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                Procurement Regulations
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {project.items.length} Items • Contract: {currencyCode()} {contractTotal.toLocaleString()} ({Math.abs(variancePercent)}% {variancePercent < 0 ? 'Below' : 'Above'})
            </p>
          </div>
        </div>

        {/* Action Controls - Icon-only with tooltips + More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSaveAgreement}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs cursor-pointer"
            title="Save Agreement & Lock Contract BOQ"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition cursor-pointer shadow-2xs"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100">
                    Agreement Options
                  </div>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleApplyUniformDiscount();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <Percent className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Apply {tenderDiscountPercent}% Rebate to All</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleResetToEstimateRates();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Reset to Estimate Rates</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleExportCSV();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition cursor-pointer border-t border-slate-100"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Export Contract BOQ (CSV)</span>
                  </button>

                  {onNavigateToTab && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onNavigateToTab('valuation-mb');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition cursor-pointer border-t border-slate-100"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Proceed to Valuation MB</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Agreement Metadata Grid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Contractor / Firm Name</label>
            <input
              type="text"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contractor PAN No.</label>
            <input
              type="text"
              value={contractorPan}
              onChange={(e) => setContractorPan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contract Identification No.</label>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Agreement Date</label>
            <input
              type="text"
              value={agreementDateBs}
              onChange={(e) => setAgreementDateBs(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
            />
          </div>
        </div>

        {/* Cost Comparison Metric Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Engineer Estimate Amount</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              {currencyCode()} {estimateTotal.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Government approved office estimate</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Agreed Contract Amount</span>
            <div className="text-2xl font-black mt-0.5 font-mono text-white">
              {currencyCode()} {contractTotal.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-200">
              Contract award price ({Math.abs(variancePercent)}% {variancePercent < 0 ? 'Below' : 'Above'} Estimate)
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quick Uniform Rebate Tool</span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.1"
                value={tenderDiscountPercent}
                onChange={(e) => setTenderDiscountPercent(Number(e.target.value) || 0)}
                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs"
              />
              <span className="text-xs font-bold text-slate-600">% Discount</span>
              <button
                onClick={handleApplyUniformDiscount}
                className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-lg font-bold text-xs"
              >
                Apply All
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Recalculates all items by percentage</span>
          </div>
        </div>

        {/* Side-by-Side BOQ Rate Comparison Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Contract BOQ Schedule (Item Rates & Amount Comparison)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Total {project.items.length} BOQ line items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Description of Work</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-center">BOQ Qty</th>
                  <th className="py-2.5 px-3 text-right">Estimate Rate ({currencyCode()})</th>
                  <th className="py-2.5 px-3 text-right">Estimate Amt ({currencyCode()})</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/80 text-emerald-950 font-black">
                    Contractor Rate ({currencyCode()})
                  </th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50/80 text-emerald-950 font-black">
                    Contract Amt ({currencyCode()})
                  </th>
                  <th className="py-2.5 px-3 text-right">Diff (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {project.items.map((item, idx) => {
                  const estRate = item.calculated_unit_rate;
                  const conRate = contractorRates[item.id] ?? estRate;
                  const estAmt = item.estimated_quantity * estRate;
                  const conAmt = item.estimated_quantity * conRate;
                  const diffPct = estRate > 0 ? Math.round(((conRate - estRate) / estRate) * 1000) / 10 : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {item.item_code || `Item-${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-xs">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                        {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                        {item.estimated_quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {currencyCode()} {estRate.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {currencyCode()} {estAmt.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right bg-emerald-50/50">
                        <input
                          type="number"
                          value={conRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setContractorRates((prev) => ({ ...prev, [item.id]: val }));
                          }}
                          className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded font-mono font-bold text-xs text-right text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950 bg-emerald-50/50">
                        {currencyCode()} {conAmt.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={diffPct < 0 ? 'text-emerald-700' : diffPct > 0 ? 'text-rose-700' : 'text-slate-400'}>
                          {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-950 text-xs">
                  <td colSpan={5} className="py-3 px-3 uppercase tracking-wide">
                    Grand Total
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {currencyCode()} {estimateTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 bg-emerald-100/80"></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-950 bg-emerald-100/80">
                    {currencyCode()} {contractTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-800">
                    {variancePercent}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
