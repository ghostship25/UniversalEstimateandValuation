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
import { ProjectEstimate, Contract, ValuationMBRow, IPCBill, VariationOrder } from '../../types';
import { currencyCode } from '../../services/currency';
import { computeIpc } from '../../services/ipcMath';
import { exportCsv } from '../takeoff/evidence';

interface IPCBillViewProps {
  variations?: VariationOrder[];
  project: ProjectEstimate;
  contract: Contract | null;
  valuationRows: ValuationMBRow[];
  ipcBills: IPCBill[];
  setIpcBills: React.Dispatch<React.SetStateAction<IPCBill[]>>;
  showToast: (msg: string) => void;
}

export const IPCBillView: React.FC<IPCBillViewProps> = ({
  variations = [],
  project,
  contract,
  valuationRows,
  ipcBills,
  setIpcBills,
  showToast
}) => {
  const [activeIPCNo, setActiveIPCNo] = useState<number>(1);
  const [priceAdjText, setPriceAdjText] = useState<string>('');
  const [releaseText, setReleaseText] = useState<string>('');

  // Filter valuation rows for active IPC
  const currentIPCMBRows = valuationRows.filter((r) => r.ipc_number === activeIPCNo);

  // Compute gross amount for active IPC from Valuation MB
  const grossAmountThisBill = currentIPCMBRows.reduce((acc, row) => {
    const item = project.items.find((i) => i.id === row.boq_item_id);
    const rate = item?.calculated_unit_rate || 0;
    return acc + row.quantity_this_bill * rate;
  }, 0);

  const taxRate = project.tax_percent ?? 0;
  const variationTotal = variations.filter((x) => x.status === 'APPROVED').reduce((s, x) => s + (x.amount_impact || 0), 0);
  const revisedSum = (contract?.awarded_amount ?? 0) + variationTotal;
  const earlierBills = ipcBills.filter((b) => b.ipc_number < activeIPCNo);
  const maxIpcNo = Math.max(1, activeIPCNo, ...ipcBills.map((b) => b.ipc_number), ...valuationRows.map((r) => r.ipc_number || 0));
  const grossBefore = valuationRows
    .filter((r) => r.ipc_number < activeIPCNo)
    .reduce((acc, row) => {
      const item = project.items.find((i) => i.id === row.boq_item_id);
      return acc + row.quantity_this_bill * (item?.calculated_unit_rate || 0);
    }, 0);
  const priceAdjPct = parseFloat(priceAdjText) || 0;
  const retentionRelease = parseFloat(releaseText) || 0;
  const calc = computeIpc({
    grossThisBill: grossAmountThisBill,
    grossBeforeThisBill: grossBefore,
    priceAdjustmentPercent: priceAdjPct,
    retentionPercent: contract?.retention_percent ?? 0,
    retentionHeldBefore: earlierBills.reduce((s, b) => s + (b.retention_deduction || 0), 0),
    retentionReleasedBefore: earlierBills.reduce((s, b) => s + (b.retention_released || 0), 0),
    retentionRelease,
    advanceGiven: contract?.advance_given ?? 0,
    advanceRecoveryPercent: contract?.advance_recovery_percent ?? 0,
    advanceRecoveredBefore: earlierBills.reduce((s, b) => s + (b.advance_deduction || 0), 0),
    taxPercent: taxRate,
  });
  const roundedGross = calc.gross;
  const retentionDeduction = calc.retention;
  const advanceDeduction = calc.advance;
  const taxAmount = calc.tax;
  const netPayable = calc.net;
  const advanceNotConfigured = !!contract && contract.advance_given > 0 && !(contract.advance_recovery_percent && contract.advance_recovery_percent > 0);


  const register = [...ipcBills].sort((x, y) => x.ipc_number - y.ipc_number).reduce((acc, b) => {
    const prev = acc[acc.length - 1];
    const net = b.net_payable_amount || 0;
    acc.push({
      no: b.ipc_number, date: b.bill_date_iso || '', gross: b.gross_amount_this_bill || 0, adj: b.price_adjustment_amount || 0,
      ret: b.retention_deduction || 0, rel: b.retention_released || 0, adv: b.advance_deduction || 0, tax: b.tax_amount || 0,
      net, cumGross: (prev?.cumGross || 0) + (b.gross_amount_this_bill || 0), cumNet: (prev?.cumNet || 0) + net,
    });
    return acc;
  }, [] as { no: number; date: string; gross: number; adj: number; ret: number; rel: number; adv: number; tax: number; net: number; cumGross: number; cumNet: number }[]);
  const exportRegisterCsv = () => {
    exportCsv([['IPC', 'Date', 'Gross', 'Price adjustment', 'Retention', 'Retention released', 'Advance recovery', 'Tax', 'Net payable', 'Cumulative gross', 'Cumulative net'], ...register.map((r) => [r.no, r.date, r.gross, r.adj, r.ret, r.rel, r.adv, r.tax, r.net, r.cumGross, r.cumNet])], `ipc_register_${(project.title || 'project').replace(/[^a-z0-9]+/gi, '_')}.csv`);
  };

  const currentBill = ipcBills.find((b) => b.ipc_number === activeIPCNo);
  React.useEffect(() => {
    setPriceAdjText(currentBill?.price_adjustment_percent ? String(currentBill.price_adjustment_percent) : '');
    setReleaseText(currentBill?.retention_released ? String(currentBill.retention_released) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIPCNo]);

  const handleGenerateOrUpdateIPC = (newStatus: IPCBill['status']) => {
    const newBill: IPCBill = {
      id: currentBill?.id || `ipc_${Date.now()}`,
      contract_id: contract?.id || 'default_contract',
      ipc_number: activeIPCNo,
      bill_date_iso: new Date().toISOString().slice(0, 10),
      period_from_iso: earlierBills.length ? earlierBills[earlierBills.length - 1].period_to_iso : contract?.start_date_iso || new Date().toISOString().slice(0, 10),
      period_to_iso: new Date().toISOString().slice(0, 10),
      gross_amount_this_bill: roundedGross,
      gross_amount_cumulative: calc.grossCumulative,
      retention_deduction: retentionDeduction,
      price_adjustment_percent: priceAdjPct,
      price_adjustment_amount: calc.priceAdjustment,
      retention_released: calc.retentionReleased,
      advance_deduction: advanceDeduction,
      tax_amount: taxAmount,
      net_payable_amount: netPayable,
      status: newStatus,
      remarks: `Interim Payment Certificate #${activeIPCNo}: retention ${contract?.retention_percent ?? 0}%, advance recovery ${contract?.advance_recovery_percent ?? 0}%, tax ${taxRate}%`
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
      {!contract && <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold" data-testid="ipc-no-contract">No contract is set up yet, so retention, advance recovery and discount are 0. Open Contract Setup first.</div>}
      {advanceNotConfigured && <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold" data-testid="ipc-no-recovery">An advance was given but no advance recovery % is set in Contract Setup, so nothing is being recovered.</div>}
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
            Running bills from the contract: retention, advance recovery, price adjustment, tax and net payable.
          </p>
        </div>

        {/* IPC Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-blue-950 p-1.5 rounded-xl border border-blue-700">
          {Array.from({ length: maxIpcNo }, (_, i) => i + 1).map((num) => (
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
          <button onClick={() => setActiveIPCNo(maxIpcNo + 1)} data-testid="ipc-new" title="Start the next certificate" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 border border-blue-700">+ New IPC</button>
        </div>
      </div>

      {/* Contract position + bill-level adjustments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="ipc-position">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-800 text-sm mb-1">Contract position</div>
          <div className="flex justify-between"><span>Awarded contract sum</span><b className="font-mono">{(contract?.awarded_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div>
          <div className="flex justify-between"><span>Approved variations</span><b className="font-mono">{variationTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div>
          <div className="flex justify-between border-t pt-1"><span>Revised contract sum</span><b className="font-mono">{revisedSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div>
          <div className="flex justify-between"><span>Certified to date (work)</span><b className="font-mono">{calc.grossCumulative.toLocaleString('en-US', { minimumFractionDigits: 2 })}{revisedSum > 0 ? ` (${((calc.grossCumulative / revisedSum) * 100).toFixed(1)}%)` : ''}</b></div>
          <div className="flex justify-between"><span>Retention held after this bill</span><b className="font-mono">{calc.retentionHeld.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div>
          <div className="flex justify-between"><span>Advance still to recover</span><b className="font-mono">{calc.advanceOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-800 text-sm">This certificate</div>
          <label className="flex items-center justify-between gap-2">Price adjustment % <span className="text-slate-400">(escalation, may be negative)</span>
            <input data-testid="ipc-adj" type="number" step="any" value={priceAdjText} onChange={(e) => setPriceAdjText(e.target.value)} placeholder="0" className="w-24 border rounded-lg px-2 py-1 font-mono text-right" /></label>
          <label className="flex items-center justify-between gap-2">Retention released <span className="text-slate-400">(amount, up to what is held)</span>
            <input data-testid="ipc-release" type="number" step="any" value={releaseText} onChange={(e) => setReleaseText(e.target.value)} placeholder="0" className="w-24 border rounded-lg px-2 py-1 font-mono text-right" /></label>
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
          <span className="text-[10px] font-bold uppercase text-rose-800 block">{`Retention Money (${contract?.retention_percent ?? 0}%)`}</span>
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
            <tbody className="divide-y divide-slate-200 text-slate-800 font-medium" data-testid="ipc-breakdown">
              {[
                { n: 1, label: 'Total gross value of work executed this period', note: 'Valuation MB row sum', amt: roundedGross, sign: '', cls: 'text-slate-900', row: '' },
                { n: 2, label: calc.priceAdjustment < 0 ? 'Less: Price adjustment' : 'Add: Price adjustment', note: `${priceAdjPct}% of gross`, amt: Math.abs(calc.priceAdjustment), sign: calc.priceAdjustment < 0 ? '-' : '+', cls: 'text-violet-700', row: '' },
                { n: 3, label: 'Less: Retention money', note: `${contract?.retention_percent ?? 0}% of adjusted gross`, amt: retentionDeduction, sign: '-', cls: 'text-rose-700', row: '' },
                { n: 4, label: 'Less: Advance recovery', note: `${contract?.advance_recovery_percent ?? 0}% of gross, until repaid`, amt: advanceDeduction, sign: '-', cls: 'text-amber-700', row: '' },
                { n: 5, label: 'Subtotal: taxable amount', note: 'Row 1 + 2 - 3 - 4', amt: calc.afterDeductions, sign: '', cls: 'text-slate-900', row: 'bg-slate-50' },
                { n: 6, label: 'Add: Tax', note: `${taxRate}% of the taxable amount`, amt: taxAmount, sign: '+', cls: 'text-blue-700', row: '' },
                { n: 7, label: 'Add: Retention released', note: 'not taxed again', amt: calc.retentionReleased, sign: '+', cls: 'text-emerald-700', row: '' },
              ].map((r) => (
                <tr key={r.n} className={r.row}>
                  <td className="p-3 font-mono">{r.n}</td>
                  <td className="p-3 font-bold">{r.label}</td>
                  <td className="p-3 text-right font-mono text-slate-500">{r.note}</td>
                  <td className={`p-3 text-right font-mono font-bold ${r.cls}`}>{r.sign} {currencyCode()} {r.amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50 text-emerald-950 font-bold text-sm">
                <td className="p-3 font-mono">8</td>
                <td className="p-3">NET AMOUNT PAYABLE TO CONTRACTOR THIS BILL</td>
                <td className="p-3 text-right font-mono text-xs">Row 5 + 6 + 7</td>
                <td className="p-3 text-right font-mono font-extrabold text-emerald-800" data-testid="ipc-net">{currencyCode()} {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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

      {/* Certificates register + cumulative position */}
      {ipcBills.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="ipc-register">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <div className="font-bold text-sm text-slate-800">Certificates register (cumulative)</div>
            <button data-testid="ipc-csv" onClick={exportRegisterCsv} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white">Download CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                <tr>{['IPC', 'Date', 'Gross', 'Price adj.', 'Retention', 'Released', 'Advance', 'Tax', 'Net payable', 'Cum. gross', 'Cum. net'].map((h) => <th key={h} className="p-2 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y font-mono">
                {register.map((r) => (
                  <tr key={r.no}>
                    <td className="p-2 font-bold text-left">#{r.no}</td><td className="p-2">{r.date}</td>
                    {[r.gross, r.adj, r.ret, r.rel, r.adv, r.tax, r.net, r.cumGross, r.cumNet].map((n, i) => <td key={i} className={`p-2 ${i === 6 ? 'font-bold' : ''}`}>{n.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
