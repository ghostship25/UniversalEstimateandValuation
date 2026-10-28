import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { ProjectEstimate, Contract, ValuationMBRow, IPCBill } from '../../types';
import { currencyCode } from '../../services/currency';

interface IPCBillViewProps {
  project: ProjectEstimate;
  contract: Contract | null;
  valuationRows: ValuationMBRow[];
  ipcBills: IPCBill[];
  setIpcBills: React.Dispatch<React.SetStateAction<IPCBill[]>>;
  showToast: (msg: string) => void;
}

export const IPCBillView: React.FC<IPCBillViewProps> = ({
  project,
  contract,
  valuationRows,
  ipcBills,
  setIpcBills,
  showToast
}) => {
  const [activeIPCNo, setActiveIPCNo] = useState<number>(1);

  // Filter valuation rows for active IPC
  const currentIPCMBRows = valuationRows.filter((r) => r.ipc_number === activeIPCNo);

  // Compute gross amount for active IPC from Valuation MB
  const grossAmountThisBill = currentIPCMBRows.reduce((acc, row) => {
    const item = project.items.find((i) => i.id === row.boq_item_id);
    const rate = item?.calculated_unit_rate || 0;
    return acc + row.quantity_this_bill * rate;
  }, 0);

  const taxRate = project.tax_percent ?? 0;
  const roundedGross = Math.round(grossAmountThisBill * 100) / 100;
  const retentionDeduction = Math.round(roundedGross * 0.05 * 100) / 100; // 5% Retention
  const advanceDeduction = contract?.advance_given ? Math.min(contract.advance_given * 0.1, roundedGross * 0.1) : 0;
  const taxAmount = Math.round((roundedGross - retentionDeduction - advanceDeduction) * (taxRate / 100) * 100) / 100;
  const netPayable = Math.round((roundedGross - retentionDeduction - advanceDeduction + taxAmount) * 100) / 100;

  const currentBill = ipcBills.find((b) => b.ipc_number === activeIPCNo);

  const handleGenerateOrUpdateIPC = (newStatus: IPCBill['status']) => {
    const newBill: IPCBill = {
      id: currentBill?.id || `ipc_${Date.now()}`,
      contract_id: contract?.id || 'default_contract',
      ipc_number: activeIPCNo,
      bill_date_iso: '2026-06-25',
      period_from_iso: '2026-05-01',
      period_to_iso: '2026-06-25',
      gross_amount_this_bill: roundedGross,
      gross_amount_cumulative: roundedGross * activeIPCNo,
      retention_deduction: retentionDeduction,
      advance_deduction: advanceDeduction,
      tax_amount: taxAmount,
      net_payable_amount: netPayable,
      status: newStatus,
      remarks: `Interim Payment Certificate #${activeIPCNo} generated according to Public Procurement Act (procurement rules)`
    };

    const existingIdx = ipcBills.findIndex((b) => b.ipc_number === activeIPCNo);
    if (existingIdx !== -1) {
      const updated = [...ipcBills];
      updated[existingIdx] = newBill;
      setIpcBills(updated);
    } else {
      setIpcBills([...ipcBills, newBill]);
    }

    showToast(`IPC Bill #${activeIPCNo} status updated to: ${newStatus}`);
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
            <span className="text-blue-200 text-xs font-mono">• Interim Payment Certificates (IPC)</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Interim Payment Certificates (IPC)</h2>
          <p className="text-xs text-blue-100 mt-1">
            Automated running bill generation with 5% Retention Money, Mobilization Advance recovery, tax, and Net Payable disbursements.
          </p>
        </div>

        {/* IPC Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-blue-950 p-1.5 rounded-xl border border-blue-700">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setActiveIPCNo(num)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeIPCNo === num
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              IPC Bill #{num}
            </button>
          ))}
        </div>
      </div>

      {/* IPC Bill Breakdown Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Work Executed</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {currencyCode()} {roundedGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500">From Valuation MB #{activeIPCNo}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-rose-800 block">Retention Money (5%)</span>
          <div className="text-xl font-extrabold text-rose-800 font-mono mt-1">
            - {currencyCode()} {retentionDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-rose-600">Held in Security Deposit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-amber-800 block">Advance Recovery</span>
          <div className="text-xl font-extrabold text-amber-800 font-mono mt-1">
            - {currencyCode()} {advanceDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-amber-600">Mobilization Advance</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-300 bg-emerald-50 shadow-sm">
          <span className="text-[10px] font-bold uppercase text-emerald-900 block">Net Payable to Contractor</span>
          <div className="text-2xl font-extrabold text-emerald-800 font-mono mt-1">
            {currencyCode()} {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-700 font-bold">Includes tax</span>
        </div>
      </div>

      {/* IPC Bill Official Certificate View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Interim Payment Certificate (IPC #{activeIPCNo})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Contract Agreement: {contract?.contract_number || 'CNT/01'} | Contractor: {contract?.contractor_name || 'Summit Builders'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
              currentBill?.status === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              Status: {currentBill?.status || 'DRAFT'}
            </span>
          </div>
        </div>

        {/* Certificate Calculation Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">SN</th>
                <th className="p-3">Bill Component Particulars</th>
                <th className="p-3 text-right">Calculation Basis</th>
                <th className="p-3 text-right">Amount ({currencyCode()})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
              <tr>
                <td className="p-3 font-mono">1</td>
                <td className="p-3 font-bold">Total Gross Value of Work Executed This Period</td>
                <td className="p-3 text-right font-mono">Valuation MB Row Sum</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {currencyCode()} {roundedGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-mono">2</td>
                <td className="p-3 text-rose-800 font-bold">Less: Retention Money Deduction</td>
                <td className="p-3 text-right font-mono text-rose-800">5.0% of Gross Value</td>
                <td className="p-3 text-right font-mono font-bold text-rose-700">
                  - {currencyCode()} {retentionDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono">3</td>
                <td className="p-3 text-amber-800 font-bold">Less: Mobilization Advance Recovery</td>
                <td className="p-3 text-right font-mono text-amber-800">10% Recovery Installment</td>
                <td className="p-3 text-right font-mono font-bold text-amber-700">
                  - {currencyCode()} {advanceDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 font-mono">4</td>
                <td className="p-3 font-bold text-slate-900">Subtotal Net Work Executed (Excl. Tax)</td>
                <td className="p-3 text-right font-mono">Row 1 - Row 2 - Row 3</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {currencyCode()} {(roundedGross - retentionDeduction - advanceDeduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono">5</td>
                <td className="p-3 font-bold text-blue-800">Add: Tax (Tax @ rate)</td>
                <td className="p-3 text-right font-mono text-blue-800">13% on Subtotal</td>
                <td className="p-3 text-right font-mono font-bold text-blue-700">
                  + {currencyCode()} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-emerald-50 text-emerald-950 font-bold text-sm">
                <td className="p-3 font-mono">6</td>
                <td className="p-3">NET AMOUNT PAYABLE TO CONTRACTOR THIS BILL</td>
                <td className="p-3 text-right font-mono text-xs">Subtotal + Tax</td>
                <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                  {currencyCode()} {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Approval Workflow Buttons */}
        <div className="flex justify-between items-center pt-4 border-t flex-wrap gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Compliant with applicable public procurement rules & accounting standards</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerateOrUpdateIPC('DRAFT')}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              Save Draft IPC
            </button>
            <button
              onClick={() => handleGenerateOrUpdateIPC('RECOMMENDED_BY_ENGINEER')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow"
            >
              Recommend by Site Engineer
            </button>
            <button
              onClick={() => handleGenerateOrUpdateIPC('APPROVED')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve IPC for Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
