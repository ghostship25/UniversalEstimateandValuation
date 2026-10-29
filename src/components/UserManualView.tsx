import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Calculator,
  DollarSign,
  FileSpreadsheet,
  Ruler,
  Layers,
  HelpCircle,
  FileText,
  Download,
  Settings,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  Sliders,
  Printer,
  Sparkles,
  MousePointer,
  Zap,
  ArrowRight,
  Check,
  Code2,
  Cpu,
  Lock,
  RefreshCw,
  Copy,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { currencyCode } from '../services/currency';

interface UserManualViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const UserManualView: React.FC<UserManualViewProps> = ({ onNavigateToTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(text);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Manual Topics' },
    { id: 'workflow', label: '1. Standard 5-Step Estimating Workflow' },
    { id: 'rates-tax', label: '2. Zone Rates & Rate Calc Types' },
    { id: 'rate-analysis', label: '3. Dual Rate Analysis (Govt vs Contractor)' },
    { id: 'mb-formulas', label: '4. Measurement Book & Parametric Formulas' },
    { id: 'boq-reports', label: '5. Abstract of Estimate & BOQ Printouts' },
    { id: 'resources', label: '6. Resource Breakdown & Site Requirements' },
    { id: 'desktop', label: '7. Standalone Desktop 1-Click Installation' },
    { id: 'faq', label: '8. Frequently Asked Questions & Troubleshooting' }
  ];

  const buttonGuide = [
    {
      module: 'Global Header',
      button: 'File Menu Dropdown',
      description: 'Provides project-wide management actions: Save Project, Export `.uep` project estimates, Export `\.uev` master templates, Database SQL console, and User Settings.',
      tip: 'Use Export .uep regularly to create portable offline backup files of your complete estimate.',
      tab: 'dashboard'
    },
    {
      module: 'Global Header',
      button: 'Zone Schedule Selector',
      description: 'Switches the active Zone rate database (e.g., Capital City, Sample City, Sample County, Mustang). All resource rates in Rate Analysis & BOQ instantly recalculate.',
      tip: 'Zone schedules isolate local material and labor costs independently.',
      tab: 'zone-rates'
    },
    {
      module: 'Global Header',
      button: 'Fiscal Year Selector',
      description: 'Selects the active Fiscal Year schedule (e.g., 2026/27, 2025/26). Allows comparing cost variation across different official financial years.',
      tip: 'You can create custom fiscal year periods via the + FY button.',
      tab: 'zone-rates'
    },
    {
      module: 'Global Header',
      button: 'Initiation Lock Toggle',
      description: 'Locks/unlocks official Norms & Zone Rates databases using password protection (Default password: 1234). Prevents unintended rate modifications.',
      tip: 'Keep initiation locked when sub-estimators are filling Measurement Books.',
      tab: 'zone-rates'
    },
    {
      module: 'Module 1: Norms Library',
      button: '+ Add Custom Norm',
      description: 'Opens modal to create a new departmental specification item with item code, government source (Buildings, Roads, Water Supply), unit, and resource coefficients.',
      tip: 'Specify labor man-days, material quantities, and equipment hours per 1 base unit.',
      tab: 'norms-library'
    },
    {
      module: 'Module 1: Norms Library',
      button: '📥 Import / Export CSV',
      description: 'Bulk loads norm specifications from external CSV spreadsheets or exports the complete catalog for editing in Excel.',
      tip: 'Always download the sample CSV template first to ensure correct column layout.',
      tab: 'norms-library'
    },
    {
      module: 'Module 1: Zone Rates',
      button: '✓ Tax Free / Taxable Toggle',
      description: 'One-click toggle on resource rows to designate items as Tax Free (e.g., unskilled labor, local earth/boulder) or Taxable (13%).',
      tip: 'Tax Free items are automatically exempted from material tax in Government Estimate mode.',
      tab: 'zone-rates'
    },
    {
      module: 'Module 1: Zone Rates',
      button: 'Rate Calc Type Dropdown',
      description: `Sets resource calculation method: Fixed Rate (${currencyCode()} value), % Labour Cost (e.g., 3% Khat/Scaffolding), % Equipment Cost, or % Material Cost.`,
      tip: 'Changing a resource from % Labour to % Equipment instantly updates its dynamic calculation across all rate analyses.',
      tab: 'zone-rates'
    },
    {
      module: 'Module 2: Rate Analysis',
      button: 'Government Estimate Mode',
      description: 'Calculates base material unit rates net of Tax in breakdown rows, then computes tax on total taxable materials at the bottom summary.',
      tip: 'Adheres strictly to applicable national and agency standards.',
      tab: 'rate-analysis'
    },
    {
      module: 'Module 2: Rate Analysis',
      button: 'Contractor Market Mode',
      description: 'Includes tax directly within breakdown material unit rates. Ideal for contractor commercial bidding and market tender pricing.',
      tip: 'Use Contractor Mode when analyzing all-inclusive market supplier rates.',
      tab: 'rate-analysis'
    },
    {
      module: 'Module 2: Rate Analysis',
      button: '+ Add to BOQ',
      description: 'Transfers the calculated rate, unit, description, and item breakdown directly into the active BOQ estimate schedule.',
      tip: 'You can link rate analysis items directly to existing BOQ line items or append new ones.',
      tab: 'rate-analysis'
    },
    {
      module: 'Module 3: Measurement Book',
      button: '+ Add Sub-Measurement Row',
      description: 'Inserts child dimension breakdown lines under a BOQ item to record site measurements (e.g., Room 1, Beam B1, Grid A-C).',
      tip: 'Sub-measurement rows support live formulas like =SUM(L1:L5) or =N(r1)*L*B*H.',
      tab: 'mb'
    },
    {
      module: 'Module 3: Measurement Book',
      button: '🖨️ Print Measurement Book',
      description: 'Renders official engineering Measurement Book printout formatted with signature blocks for Resident Engineers and Site Inspectors.',
      tip: 'Omitted dimension values display cleanly as dative "-" while typed zeros show as "0".',
      tab: 'mb'
    },
    {
      module: 'Module 4: BOQ Abstract',
      button: '🖨️ Print Abstract & BOQ',
      description: 'Generates official Abstract of Estimate report including Contractor Overhead (15%), Contingencies (3%), tax, and Final Estimate Amount.',
      tip: 'Generates print-ready PDFs and downloadable formatted Excel (.xlsx) files.',
      tab: 'boq'
    },
    {
      module: 'Module 5: Resources',
      button: '📤 Export Resource Schedule',
      description: 'Aggregates total material requirements (bags of cement, $m^3$ of sand, tons of steel, skilled man-days) across all BOQ items into a single schedule.',
      tip: 'Crucial for site procurement officers and materials ordering schedules.',
      tab: 'resource-breakdown'
    }
  ];

  const mbFormulaExamples = [
    {
      formula: '= (click a cell) Enter',
      description: 'Point-and-click linking, just like Excel. Type = in a No., L, B, H, custom-column cell, click the cell you want to link (same item or another item, or an item\'s Total Quantity) and press Enter. Esc cancels.',
      example: 'Type = then click row 1 Length -> =L1. Add *2 and press Enter -> =L1*2.'
    },
    {
      formula: '=L1*2',
      description: 'Same item: column letter (N, L, B, H, Q = No., Length, Breadth, Height, Quantity) plus the row number shown in the R# badge.',
      example: 'Row 2 Length set to =L1*2 -> twice the length of row 1. Updates live when row 1 changes.'
    },
    {
      formula: '=I2.R1.L',
      description: 'Another item: I<item number>.R<row number>.<column>. Use .QTY for a row or item quantity, or a custom column name.',
      example: '=I1.QTY/1000 -> the total quantity of item 1 divided by 1000.'
    },
    {
      formula: '=SUM(L1:L3)',
      description: 'Aggregates a range of values from rows of the same item.',
      example: 'Length cell set to =SUM(L1:L3) -> adds lengths of rows 1, 2 and 3.'
    }
  ];

  const faqs = [
    {
      q: 'Why are resource names in Rate Analysis clean without "(Tax Free)" appended to them?',
      a: 'We removed automatic text suffixing like "(Tax Free)" from resource names so that your rate analysis tables strictly preserve the exact official resource titles uploaded in norms. The Tax exemption status is still fully active in calculations and indicated cleanly via the "Tax Status" badge.'
    },
    {
      q: 'When I change a resource from % Labour Cost to % Equipment Cost in Zone Rates, does Rate Analysis update automatically?',
      a: 'Yes! Rate Analysis reads the master resource settings dynamically. When you change a resource calc type to "% Equipment Cost" or toggle its "Tax Free" status in the Zone Rates tab, the Rate Analysis recalculates immediately based on the updated rule.'
    },
    {
      q: 'How does Government Estimate Mode differ from Contractor Market Mode?',
      a: 'Government Mode keeps material unit rates net of Tax in breakdown rows and calculates tax on the sum of all taxable materials at the bottom summary. Contractor Mode includes tax directly inside material unit rates in breakdown rows for commercial bidding.'
    },
    {
      q: 'How does the Measurement Book handle unentered dimensions vs explicit zeros?',
      a: 'If a dimension cell (L, B, or H) is left empty or omitted, it renders as a clean dash "-" in official printouts. If you explicitly type "0", it displays as "0" and evaluates mathematically.'
    },
    {
      q: 'What is the password for the Initiation Lock?',
      a: 'The default initiation lock password is "1234". You can unlock initiation from the Zone Rates or Norms tab to make structural edits, or change the password in User Settings.'
    },
    {
      q: 'How do I run Universal Estimating & Valuation as a standalone desktop app offline?',
      a: 'Run `npm run desktop:build` in the terminal to generate native 1-click installer packages (`Universal Estimating & Valuation-Setup.exe` for Windows, `.dmg` for macOS, or `.AppImage` for Linux) inside the `dist_desktop/` folder.'
    }
  ];

  const filteredGuide = buttonGuide.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.button.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'rates-tax') return matchesSearch && (item.module.includes('Rates') || item.button.includes('Tax'));
    if (selectedCategory === 'rate-analysis') return matchesSearch && item.module.includes('Rate Analysis');
    if (selectedCategory === 'mb-formulas') return matchesSearch && item.module.includes('Measurement Book');
    if (selectedCategory === 'boq-reports') return matchesSearch && item.module.includes('BOQ');
    if (selectedCategory === 'resources') return matchesSearch && item.module.includes('Resources');
    if (selectedCategory === 'workflow') return matchesSearch && item.module.includes('Header');
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
            <BookOpen className="w-4 h-4 text-red-400" />
            <span>Universal Estimating & Valuation Engineering System Guide</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Comprehensive Application Manual & Feature Action Directory
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Master official government rate analysis, departmental norms, zone rate registries, parametric Measurement Books (MB), Abstract of Estimates, and standalone offline execution.
          </p>
        </div>
      </div>

      {/* Quick Jump Buttons to Application Views */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Direct Jump to Application Modules</span>
          </span>
          <span className="text-[11px] font-normal text-slate-500">Click any card to open the module view</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
          <button
            onClick={() => onNavigateToTab?.('norms-library')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-emerald-950">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. Norms Library</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab?.('zone-rates')}
            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-blue-950">
              <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
              <span>2. Zone Rates</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab?.('rate-analysis')}
            className="p-3 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-red-950">
              <Calculator className="w-4 h-4 text-red-600 shrink-0" />
              <span>3. Rate Analysis</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab?.('mb')}
            className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-indigo-950">
              <Ruler className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>4. Measurement Book</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab?.('boq')}
            className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-amber-950">
              <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
              <span>5. BOQ Estimate</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToTab?.('resource-breakdown')}
            className="p-3 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl shadow-2xs transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-teal-950">
              <Layers className="w-4 h-4 text-teal-600 shrink-0" />
              <span>6. Resources</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Category Filter */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 sticky top-20">
            <h3 className="font-extrabold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Manual Topics & Index</span>
            </h3>

            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ${selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter Controls & Keywords</span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search buttons, functions..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: 5-Step Estimating Workflow */}
          {(selectedCategory === 'all' || selectedCategory === 'workflow') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Standard 5-Step Estimating Workflow</h2>
                  <p className="text-xs text-slate-500">How to prepare an estimate from start to finish in Universal Estimating & Valuation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-blue-950 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">1</span>
                    Select Zone & Fiscal Year
                  </strong>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    Pick your target zone (e.g., Capital City) and fiscal year from the header. Verify local material and labor rates in Zone Rates view.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-red-950 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-red-900 text-white flex items-center justify-center text-[10px]">2</span>
                    Run Rate Analysis
                  </strong>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    Select departmental norm items (Buildings, Roads, Water Supply). Review breakdown coefficients, overhead (15%), and push rates into BOQ.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-indigo-950 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px]">3</span>
                    Enter Measurement Book (MB)
                  </strong>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    Add sub-measurement lines for length, breadth, height, or use inline formulas like `=SUM(L1:L5)` for site dimensions.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-amber-950 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-900 text-white flex items-center justify-center text-[10px]">4</span>
                    Review BOQ Abstract
                  </strong>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    Quantities automatically synchronize from MB. View total estimate abstract with 15% overhead, 3% contingencies, and tax.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Measurement Book Formulas Guide */}
          {(selectedCategory === 'all' || selectedCategory === 'mb-formulas') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold">
                    <Code2 className="w-4 h-4 text-indigo-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Parametric Measurement Book Formulas</h2>
                    <p className="text-xs text-slate-500">Inline formula cheat-sheet for L, B, H and quantity calculation</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToTab?.('mb')}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-lg border border-indigo-200 cursor-pointer transition"
                >
                  Open MB View →
                </button>
              </div>

              <div className="space-y-3">
                {mbFormulaExamples.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <code className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {item.formula}
                      </code>
                      <button
                        onClick={() => handleCopy(item.formula)}
                        className="text-[11px] text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedFormula === item.formula ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-slate-700 font-medium">{item.description}</p>
                    <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
                      💡 Example: {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Interactive Button Directory */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-red-700" />
                <h2 className="text-base font-extrabold text-slate-900">Button & Feature Action Directory</h2>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                Showing {filteredGuide.length} controls
              </span>
            </div>

            <div className="space-y-3">
              {filteredGuide.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition space-y-2 group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                        {item.module}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 group-hover:text-red-800 transition">
                        {item.button}
                      </h3>
                    </div>

                    {item.tab && (
                      <button
                        onClick={() => onNavigateToTab?.(item.tab)}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Try Feature</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>Pro Tip:</strong> {item.tip}</span>
                  </div>
                </div>
              ))}

              {filteredGuide.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs font-mono">
                  No matching controls found for "{searchTerm}".
                </div>
              )}
            </div>
          </div>

          {/* Section 4: FAQ & Troubleshooting */}
          {(selectedCategory === 'all' || selectedCategory === 'faq') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Frequently Asked Questions & Troubleshooting</h2>
                  <p className="text-xs text-slate-500">Quick answers to common user questions and engineering rules</p>
                </div>
              </div>

              <div className="space-y-2">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-900 flex items-center justify-between cursor-pointer transition"
                    >
                      <span className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${openFaqIndex === idx ? 'rotate-90' : ''}`} />
                    </button>

                    {openFaqIndex === idx && (
                      <div className="p-3.5 bg-white text-xs text-slate-700 leading-relaxed border-t border-slate-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Standalone Desktop 1-Click Installation */}
          {(selectedCategory === 'all' || selectedCategory === 'desktop') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Desktop App 1-Click Installation</h2>
                  <p className="text-xs text-slate-500">Standalone offline execution instructions</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <p>
                  Universal Estimating & Valuation can be packaged as a standalone offline desktop application for Windows, macOS, and Linux using <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-red-700">electron-builder</code>.
                </p>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-2 overflow-x-auto">
                  <div className="text-slate-400"># 1. Launch local web dev server</div>
                  <div className="text-emerald-400">npm run dev</div>

                  <div className="text-slate-400 mt-2"># 2. Package 1-Click Desktop Installers (Windows/macOS/Linux)</div>
                  <div className="text-emerald-400">npm run desktop:build</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-slate-900 font-bold mb-1">Windows (.exe)</strong>
                    <p className="text-slate-500">Outputs <code className="text-slate-800 font-mono">Universal Estimating & Valuation-Setup.exe</code> with native Windows launcher icon.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-slate-900 font-bold mb-1">macOS (.dmg)</strong>
                    <p className="text-slate-500">Outputs drag-and-drop installer <code className="text-slate-800 font-mono">Universal Estimating & Valuation.dmg</code>.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="block text-slate-900 font-bold mb-1">Linux (.AppImage)</strong>
                    <p className="text-slate-500">Outputs executable <code className="text-slate-800 font-mono">Universal Estimating & Valuation.AppImage</code>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
