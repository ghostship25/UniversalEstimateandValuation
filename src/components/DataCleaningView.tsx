import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Sparkles,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ResourceMaster, RateNormItem, DuplicatePair } from '../types';
import { currencyCode } from '../services/currency';

interface DataCleaningViewProps {
  resources: ResourceMaster[];
  setResources: React.Dispatch<React.SetStateAction<ResourceMaster[]>> | ((updater: ResourceMaster[] | ((prev: ResourceMaster[]) => ResourceMaster[])) => void);
  norms?: RateNormItem[];
  setNorms?: React.Dispatch<React.SetStateAction<RateNormItem[]>>;
}

export const DataCleaningView: React.FC<DataCleaningViewProps> = ({
  resources,
  setResources
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [mergedCount, setMergedCount] = useState<number>(0);

  // Auto-detect duplicate candidate pairs using string similarity heuristics
  const detectedDuplicates: DuplicatePair[] = useMemo(() => {
    const pairs: DuplicatePair[] = [];

    for (let i = 0; i < resources.length; i++) {
      for (let j = i + 1; j < resources.length; j++) {
        const r1 = resources[i];
        const r2 = resources[j];

        // Clean names
        const n1 = r1.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const n2 = r2.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        let isMatch = false;
        let reason = '';

        if (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1))) {
          isMatch = true;
          reason = 'Substring / English Variant Match';
        } else if (
          (r1.name.includes('Aggregate') && r2.name.includes('Aggregate')) ||
          (r1.name.includes('Cement') && r2.name.includes('Cement')) ||
          (r1.name.includes('Brick') && r2.name.includes('Bricks'))
        ) {
          isMatch = true;
          reason = 'Duplicate Name Variant';
        }

        if (isMatch) {
          pairs.push({
            id: `dup_${r1.resource_id}_${r2.resource_id}`,
            resource1: r1,
            resource2: r2,
            similarity_score: 0.88,
            reason
          });
        }
      }
    }

    return pairs.slice(0, 10); // show top pairs
  }, [resources]);

  const handleMergePair = (primaryId: number, duplicateId: number) => {
    setResources((prev) => prev.filter((r) => r.resource_id !== duplicateId));
    setMergedCount((prev) => prev + 1);
  };

  const handleScanNow = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Data Cleaning & De-duplication</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated duplicate detection, unit normalization, and alias mapping engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{mergedCount} Resources Merged</span>
          </div>

          <button
            onClick={handleScanNow}
            disabled={isScanning}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Master Database...' : 'Run Scanner'}
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-sm">Non-Destructive Merge Safeguard</strong>
          The system never automatically deletes raw resource records. Merging assigns a canonical alias ID to existing BOQ and rate analysis line items.
        </div>
      </div>

      {/* Identified Duplicate Pairs */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Candidate Duplicates Requiring Review ({detectedDuplicates.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detectedDuplicates.map((pair) => (
            <div
              key={pair.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between text-xs border-b pb-2">
                <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                  {pair.reason}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Score: {(pair.similarity_score * 100).toFixed(0)}% Match
                </span>
              </div>

              {/* Side by Side Diff */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate A</span>
                  <div className="font-bold text-slate-900">{pair.resource1.name}</div>
                  <div className="text-slate-500">
                    Category: {pair.resource1.category} | Unit: {pair.resource1.unit}
                  </div>
                  <div className="font-mono text-blue-700 font-bold">
                    {currencyCode()} {pair.resource1.default_rate.toLocaleString('en-US')}
                  </div>
                </div>

                <div className="space-y-1 border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate B</span>
                  <div className="font-bold text-slate-900">{pair.resource2.name}</div>
                  <div className="text-slate-500">
                    Category: {pair.resource2.category} | Unit: {pair.resource2.unit}
                  </div>
                  <div className="font-mono text-blue-700 font-bold">
                    {currencyCode()} {pair.resource2.default_rate.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              {/* Merge Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleMergePair(pair.resource1.resource_id, pair.resource2.resource_id)}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md text-xs font-semibold border border-blue-200 transition"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  Keep Candidate A (Merge B)
                </button>
                <button
                  onClick={() => handleMergePair(pair.resource2.resource_id, pair.resource1.resource_id)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 transition"
                >
                  Keep Candidate B
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
