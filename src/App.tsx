import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { WelcomeScreen } from './components/WelcomeScreen';

// Initiation Views
import { DashboardView } from './modules/dashboard/DashboardView';
import { FiscalYearView } from './modules/initiation/FiscalYearView';
import { OrganizationView } from './modules/initiation/OrganizationView';
import { ZoneRatesView } from './components/ZoneRatesView';
import { NormsManagerView } from './components/NormsManagerView';
import { RateAnalysisView } from './components/RateAnalysisView';
import { DataCleaningView } from './components/DataCleaningView';
import { BarBendingScheduleView } from './modules/tools/BarBendingScheduleView';

// Estimate Views
import { MeasurementBookView } from './components/MeasurementBookView';
import { BOQView } from './components/BOQView';
import { ResourceBreakdownView } from './components/ResourceBreakdownView';
import { TemplateDrawingsView } from './components/TemplateDrawingsView';
import { TemplateEditorView } from './components/TemplateEditorView';
import { TemplatesHubView } from './components/TemplatesHubView';

// Valuation Views
import { ValuationMBView } from './modules/valuation/ValuationMBView';
import { CompletionCertificateView } from './modules/valuation/CompletionCertificateView';
import { ContractSetupView } from './modules/valuation/ContractSetupView';
import { ContractAgreementView } from './modules/valuation/ContractAgreementView';
import { IPCBillView } from './modules/valuation/IPCBillView';

// Reports & Admin
import { ExecutiveReportsView } from './modules/reports/ExecutiveReportsView';
import { UserManagementView } from './modules/admin/UserManagementView';
import { AuditLogsView } from './modules/admin/AuditLogsView';
import { UserManualView } from './components/UserManualView';

// Modals
import { RestorePointModal } from './components/RestorePointModal';
import { SearchModal } from './components/SearchModal';
import { AddZoneModal } from './components/AddZoneModal';
import { AddFYModal } from './components/AddFYModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { DatabaseModal } from './components/DatabaseModal';
import { ProjectSnapshotModal } from './components/ProjectSnapshotModal';

import {
  ResourceMaster,
  RateNormItem,
  ZoneInfo,
  ProjectEstimate,
  RateCalculationResult,
  BOQItem,
  MBRow,
  MasterTemplate,
  UEVProject,
  RecentFile,
  Contract,
  ValuationMBBook,
  ValuationMBRow,
  IPCBill,
  CompletionCertificate
} from './types';

import { INITIAL_ZONES, FISCAL_YEARS, INITIAL_RESOURCES } from './data/initialData';
import { STANDARD_TEMPLATES } from './data/standardTemplates';
import { useMBDependencyTracker } from './hooks/useMBDependencyTracker';
import { getExplicitZoneRate } from './services/rateEngine';

const STORAGE_KEYS = {
  PROJECTS: 'uev_projects_v1',
  ACTIVE_PROJECT_ID: 'uev_active_project_id_v1',
  ZONE_RATES_MAP: 'uev_zone_rates_map_v1',
  NORMS: 'uev_norms_v1',
  ZONES: 'uev_zones_v1',
  FISCAL_YEARS: 'uev_fiscal_years_v1',
  SELECTED_ZONE: 'uev_selected_zone_v1',
  SELECTED_FY: 'uev_selected_fy_v1',
  CURRENT_FY: 'uev_current_fy_v1',
  ACTIVE_TEMPLATE: 'uev_active_template_v1',
  IS_INITIATION_LOCKED: 'uev_is_initiation_locked_v1',
  INITIATION_LOCK_PWD: 'uev_initiation_lock_pwd_v1',
  RECENT_FILES: 'uev_recent_files_v1'
};

const DEFAULT_NORMS: RateNormItem[] = [
  {
    item_id: 1001,
    code: '2.4',
    source: 'Standard Building Norms',
    description: 'First class brickwork in 1:6 cement sand mortar in foundation and superstructure',
    base_unit: 'Cu.m.',
    base_quantity: 1,
    resources: [
      { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.7 },
      { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.35 },
      { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 1.05 },
      { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.23 },
      { resource_id: 108, resource_name: 'First Class Local Bricks', category: 'Material', quantity_per_base_unit: 480 }
    ]
  }
];

const DEFAULT_PROJECTS: ProjectEstimate[] = [
  {
    id: 'proj_01',
    title: 'Capital City Administrative Building Infrastructure',
    client_name: 'Department of Urban Development & Building Construction',
    zone: INITIAL_ZONES[0].name_en,
    fiscal_year: FISCAL_YEARS[0],
    contractor_overhead_percent: 15,
    tax_percent: 13,
    lead_distance_km: 0,
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'proj_02',
    title: 'Ward No. 4 Blacktopping & Storm Water Drain Project',
    client_name: 'Capital City Metropolitan City Office',
    zone: INITIAL_ZONES[0].name_en,
    fiscal_year: FISCAL_YEARS[0],
    contractor_overhead_percent: 15,
    tax_percent: 13,
    lead_distance_km: 0,
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'proj_03',
    title: 'Community Water Supply Pipeline Distribution Scheme',
    client_name: 'Department of Water Supply & Sewerage Management',
    zone: INITIAL_ZONES[1]?.name_en || 'Sample City',
    fiscal_year: FISCAL_YEARS[0],
    contractor_overhead_percent: 15,
    tax_percent: 13,
    lead_distance_km: 0,
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function App() {
  // STARTUP FLOW STATE: Direct to workspace (Launchpad removed per user request)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [zones, setZones] = useState<ZoneInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ZONES);
      return saved ? JSON.parse(saved) : INITIAL_ZONES;
    } catch {
      return INITIAL_ZONES;
    }
  });

  const [fiscalYears, setFiscalYears] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FISCAL_YEARS);
      return saved ? JSON.parse(saved) : FISCAL_YEARS;
    } catch {
      return FISCAL_YEARS;
    }
  });

  const [selectedZone, setSelectedZone] = useState<ZoneInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_ZONE);
      return saved ? JSON.parse(saved) : INITIAL_ZONES[0];
    } catch {
      return INITIAL_ZONES[0];
    }
  });

  const [selectedFY, setSelectedFY] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_FY);
      return saved ? JSON.parse(saved) : FISCAL_YEARS[0];
    } catch {
      return FISCAL_YEARS[0];
    }
  });

  const [currentFY, setCurrentFY] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_FY);
      return saved ? JSON.parse(saved) : FISCAL_YEARS[0];
    } catch {
      return FISCAL_YEARS[0];
    }
  });

  // Lock initiation settings & zone rates with Password protection
  const [isInitiationLocked, setIsInitiationLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IS_INITIATION_LOCKED);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [initiationLockPassword, setInitiationLockPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INITIATION_LOCK_PWD);
      return saved ? JSON.parse(saved) : '1234';
    } catch {
      return '1234';
    }
  });

  const handleToggleInitiationLock = () => {
    if (!isInitiationLocked) {
      const pwd = prompt('Set or confirm Security Password / PIN to LOCK Initiation Data & Zone Rates:', initiationLockPassword || '1234');
      if (pwd !== null) {
        if (pwd.trim()) {
          setInitiationLockPassword(pwd.trim());
        }
        setIsInitiationLocked(true);
        showToast('🔒 Initiation Data & Rates are now LOCKED with Password protection.');
      }
    } else {
      const inputPwd = prompt('Enter Security Password / PIN to UNLOCK Initiation Settings:');
      if (inputPwd === null) return;
      if (inputPwd === initiationLockPassword) {
        setIsInitiationLocked(false);
        showToast('🔓 Initiation Data & Rates UNLOCKED successfully.');
      } else {
        alert('❌ Incorrect Password! Initiation settings remain locked.');
      }
    }
  };

  // Active Master Template (.uet) state
  const [activeTemplate, setActiveTemplate] = useState<MasterTemplate>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TEMPLATE);
      return saved ? JSON.parse(saved) : STANDARD_TEMPLATES[0];
    } catch {
      return STANDARD_TEMPLATES[0];
    }
  });

  // Recent Files Registry
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT_FILES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'rf_01',
        name: 'BLD Master Building Norms (2026/27)',
        file_type: 'template',
        file_extension: '.uet',
        department: 'BLD',
        zone: 'Capital City',
        fiscal_year: '2026/27 (Current)',
        last_opened: 'Just now',
        is_pinned: true
      },
      {
        id: 'rf_02',
        name: 'Capital City Administrative Building Infrastructure',
        file_type: 'project',
        file_extension: '.uep',
        department: 'BLD',
        zone: 'Capital City',
        fiscal_year: '2026/27 (Current)',
        last_opened: '10 mins ago',
        is_pinned: true
      },
      {
        id: 'rf_03',
        name: 'Roads Dept. Highway & Bridge Standard Specifications',
        file_type: 'template',
        file_extension: '.uet',
        department: 'Roads Dept.',
        zone: 'Capital City',
        fiscal_year: '2026/27 (Current)',
        last_opened: '1 hour ago'
      }
    ];
  });

  // Modal overlays state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isAddFYModalOpen, setIsAddFYModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
  const [userSettingsInitialTab, setUserSettingsInitialTab] = useState<'general' | 'format' | 'templates' | 'precision' | 'headings' | 'user_estimate' | 'backups'>('general');
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isProjectLocked, setIsProjectLocked] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Zone Rates Map (Per-zone and Per-FY rate storage)
  const [zoneRatesMap, setZoneRatesMap] = useState<Record<string, ResourceMaster[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ZONE_RATES_MAP);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    const defaultKey = `${INITIAL_ZONES[0].id}_${FISCAL_YEARS[0]}`;
    return {
      [defaultKey]: INITIAL_RESOURCES.map((r) => ({ ...r }))
    };
  });

  const [norms, setNorms] = useState<RateNormItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NORMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_NORMS;
  });

  // Multi-Project Estimates State (.uep)
  const [projects, setProjects] = useState<ProjectEstimate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'proj_01';
  });

  // Post-Contract Valuation State
  const [contract, setContract] = useState<Contract | null>(() => {
    try {
      const saved = localStorage.getItem('uev_contract_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [valuationBooks, setValuationBooks] = useState<ValuationMBBook[]>(() => {
    try {
      const saved = localStorage.getItem('uev_valuation_books_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'vmb_book_1',
        mb_number: 'VMB-01',
        title: '1st Running Bill Valuation MB',
        bill_type: 'RUNNING_BILL',
        ipc_number: 1,
        date_iso: '2026-06-15',
        book_ref_no: 'MB/VAL/2026-27/01',
        page_start: 1,
        page_end: 15,
        verified_by: 'Er. B. K. Sharma (Site Engineer)',
        remarks: 'Initial execution measurements for site valuation',
        created_at: new Date().toISOString()
      }
    ];
  });

  const [valuationRows, setValuationRows] = useState<ValuationMBRow[]>(() => {
    try {
      const saved = localStorage.getItem('uev_valuation_rows_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [ipcBills, setIpcBills] = useState<IPCBill[]>(() => {
    try {
      const saved = localStorage.getItem('uev_ipc_bills_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [certificate, setCertificate] = useState<CompletionCertificate | null>(() => {
    try {
      const saved = localStorage.getItem('uev_certificate_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('uev_valuation_books_v1', JSON.stringify(valuationBooks));
    } catch (e) {}
  }, [valuationBooks]);

  useEffect(() => {
    try {
      localStorage.setItem('uev_valuation_rows_v1', JSON.stringify(valuationRows));
    } catch (e) {}
  }, [valuationRows]);

  useEffect(() => {
    try {
      localStorage.setItem('uev_contract_v1', JSON.stringify(contract));
    } catch (e) {}
  }, [contract]);

  useEffect(() => {
    try {
      localStorage.setItem('uev_ipc_bills_v1', JSON.stringify(ipcBills));
    } catch (e) {}
  }, [ipcBills]);

  useEffect(() => {
    try {
      localStorage.setItem('uev_certificate_v1', JSON.stringify(certificate));
    } catch (e) {}
  }, [certificate]);

  // Automatic Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, activeProjectId);
    } catch (e) {
      console.error('Failed to save activeProjectId to localStorage:', e);
    }
  }, [activeProjectId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ZONE_RATES_MAP, JSON.stringify(zoneRatesMap));
    } catch (e) {
      console.error('Failed to save zoneRatesMap to localStorage:', e);
    }
  }, [zoneRatesMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NORMS, JSON.stringify(norms));
    } catch (e) {
      console.error('Failed to save norms to localStorage:', e);
    }
  }, [norms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
    } catch (e) {
      console.error('Failed to save zones to localStorage:', e);
    }
  }, [zones]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FISCAL_YEARS, JSON.stringify(fiscalYears));
    } catch (e) {
      console.error('Failed to save fiscalYears to localStorage:', e);
    }
  }, [fiscalYears]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ZONE, JSON.stringify(selectedZone));
    } catch (e) {
      console.error('Failed to save selectedZone to localStorage:', e);
    }
  }, [selectedZone]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_FY, selectedFY);
    } catch (e) {
      console.error('Failed to save selectedFY to localStorage:', e);
    }
  }, [selectedFY]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_FY, currentFY);
    } catch (e) {
      console.error('Failed to save currentFY to localStorage:', e);
    }
  }, [currentFY]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TEMPLATE, JSON.stringify(activeTemplate));
    } catch (e) {
      console.error('Failed to save activeTemplate to localStorage:', e);
    }
  }, [activeTemplate]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IS_INITIATION_LOCKED, JSON.stringify(isInitiationLocked));
    } catch (e) {
      console.error('Failed to save isInitiationLocked to localStorage:', e);
    }
  }, [isInitiationLocked]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INITIATION_LOCK_PWD, initiationLockPassword);
    } catch (e) {
      console.error('Failed to save initiationLockPassword to localStorage:', e);
    }
  }, [initiationLockPassword]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles));
    } catch (e) {
      console.error('Failed to save recentFiles to localStorage:', e);
    }
  }, [recentFiles]);

  // Helper to extract a comprehensive base list of resources preserving all custom items & is_tax_free flags
  const getBaseResourcesList = (map: Record<string, ResourceMaster[]>): ResourceMaster[] => {
    const candidates = Object.values(map).filter((list) => Array.isArray(list) && list.length > 0);
    if (candidates.length > 0) {
      const best = candidates.reduce((prev, curr) => (curr.length > prev.length ? curr : prev), candidates[0]);
      return best.map((r) => ({ ...r }));
    }
    return INITIAL_RESOURCES.map((r) => ({ ...r }));
  };

  // Current zone & FY active rates
  const activeRateKey = `${selectedZone.id}_${selectedFY}`;
  const activeRateKeyAlt = `${selectedZone.name_en}_${selectedFY}`;

  const resources: ResourceMaster[] = useMemo(() => {
    if (zoneRatesMap[activeRateKey] !== undefined) {
      return zoneRatesMap[activeRateKey];
    }
    if (zoneRatesMap[activeRateKeyAlt] !== undefined) {
      return zoneRatesMap[activeRateKeyAlt];
    }
    if (zoneRatesMap[selectedZone.id] !== undefined) {
      return zoneRatesMap[selectedZone.id];
    }
    // Fallback: derive from existing customized master resources, preserving is_tax_free, custom resources & specific zone rates
    const baseList = getBaseResourcesList(zoneRatesMap);
    return baseList.map((r) => {
      const explicitRate = getExplicitZoneRate(r, selectedZone, selectedFY);
      return {
        ...r,
        default_rate: explicitRate > 0 ? explicitRate : r.default_rate
      };
    });
  }, [zoneRatesMap, activeRateKey, activeRateKeyAlt, selectedZone, selectedFY]);

  const setResources = (
    updater: ResourceMaster[] | ((prev: ResourceMaster[]) => ResourceMaster[])
  ) => {
    setZoneRatesMap((prevMap) => {
      const activeKey = `${selectedZone.id}_${selectedFY}`;
      const activeKeyAlt = `${selectedZone.name_en}_${selectedFY}`;
      const currentList = prevMap[activeKey] !== undefined 
        ? prevMap[activeKey] 
        : (prevMap[activeKeyAlt] !== undefined
          ? prevMap[activeKeyAlt]
          : getBaseResourcesList(prevMap));
      const newList = typeof updater === 'function' ? updater(currentList) : updater;

      const nextMap: Record<string, ResourceMaster[]> = {
        ...prevMap,
        [activeKey]: newList,
        [activeKeyAlt]: newList
      };

      // Build metadata lookup map for all updated resources (is_tax_free, rate_calc_type, code, name, category, unit)
      const metaMap = new Map<string | number, Partial<ResourceMaster>>();
      newList.forEach((item) => {
        const meta: Partial<ResourceMaster> = {
          is_tax_free: item.is_tax_free,
          rate_calc_type: item.rate_calc_type,
          name: item.name,
          category: item.category,
          unit: item.unit,
          code: item.code
        };
        metaMap.set(item.resource_id, meta);
        if (item.code) {
          metaMap.set(item.code.toLowerCase().trim(), meta);
        }
      });

      // Synchronize is_tax_free and master properties across all other zone rate lists so they never revert
      Object.keys(nextMap).forEach((k) => {
        if (k !== activeKey && k !== activeKeyAlt && Array.isArray(nextMap[k])) {
          nextMap[k] = nextMap[k].map((item) => {
            const meta = metaMap.get(item.resource_id) || (item.code ? metaMap.get(item.code.toLowerCase().trim()) : undefined);
            if (meta) {
              return {
                ...item,
                ...meta,
                // Keep zone-specific rate numbers intact
                zone_rates: item.zone_rates,
                default_rate: item.default_rate
              };
            }
            return item;
          });
        }
      });

      return nextMap;
    });
  };

  // Derived Active Project
  const project = projects.find((p) => p.id === activeProjectId) || projects[0];

  const setProject = useCallback(
    (updater: ProjectEstimate | ((prev: ProjectEstimate) => ProjectEstimate)) => {
      setProjects((prevProjects) =>
        prevProjects.map((p) => {
          if (p.id === activeProjectId) {
            return typeof updater === 'function' ? updater(p) : updater;
          }
          return p;
        })
      );
    },
    [activeProjectId]
  );

  // MB Dependency Tracker hook: Recalculates all linked quantities and sub-items across MB and BOQ
  useMBDependencyTracker(project, setProject);

  // Add custom zone handler
  const handleAddCustomZone = (newZone: ZoneInfo) => {
    setZones((prev) => [...prev, newZone]);
    setSelectedZone(newZone);
    setZoneRatesMap((prev) => ({
      ...prev,
      [newZone.id]: [...resources]
    }));
    showToast(`Added zone "${newZone.name_en}" to registry.`);
  };

  // Add custom fiscal year handler
  const handleAddCustomFY = (newFY: string, makeCurrent?: boolean) => {
    if (fiscalYears.includes(newFY)) {
      setSelectedFY(newFY);
      if (makeCurrent) {
        setCurrentFY(newFY);
        showToast(`Switched to Fiscal Year ${newFY} and set as CURRENT fiscal year.`);
      } else {
        showToast(`Switched to existing Fiscal Year ${newFY}.`);
      }
      return;
    }
    setFiscalYears((prev) => [newFY, ...prev]);
    setSelectedFY(newFY);
    if (makeCurrent) {
      setCurrentFY(newFY);
      showToast(`Added Fiscal Year "${newFY}" and set as CURRENT fiscal year.`);
    } else {
      showToast(`Added Fiscal Year "${newFY}" and set as active.`);
    }
  };

  const handleSetCurrentFY = (fy: string) => {
    setCurrentFY(fy);
    showToast(`Fiscal Year ${fy} is now set as the CURRENT Fiscal Year.`);
  };

  // Export Master Template (.uet) file
  const handleExportTemplate = () => {
    const templateData: MasterTemplate = {
      file_type: 'UEV_TEMPLATE',
      version: '3.2.0',
      id: activeTemplate.id,
      template_name: activeTemplate.template_name,
      template_code: activeTemplate.template_code,
      description: activeTemplate.description,
      department: activeTemplate.department,
      fiscal_year: selectedFY,
      zone: selectedZone.name_en,
      province: selectedZone.province,
      organization: activeTemplate.organization,
      general_settings: activeTemplate.general_settings,
      resources: resources,
      norms: norms,
      zone_rates: zoneRatesMap,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: 'UEV Engineer'
    };
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTemplate.template_code || 'UEV_Template'}_${selectedFY.replace(/[^a-zA-Z0-9]/g, '_')}\.uev`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Master Template (${activeTemplate.template_name}) as .uet file`);
  };

  // Export Project (.uep) file
  const handleExportProject = () => {
    const projectData: UEVProject = {
      file_type: 'UEV_PROJECT',
      version: '3.2.0',
      id: project.id,
      project_code: project.id,
      title: project.title,
      template_id: activeTemplate.id,
      template_name: activeTemplate.template_name,
      client_name: project.client_name,
      location: project.zone,
      zone: project.zone,
      fiscal_year: project.fiscal_year,
      department: 'BLD',
      project_type: 'Building',
      contractor_overhead_percent: project.contractor_overhead_percent,
      tax_percent: project.tax_percent,
      lead_distance_km: project.lead_distance_km,
      items: project.items,
      created_at: project.created_at,
      updated_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.uep`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Project Estimate (${project.title}) as .uep file`);
  };

  // Import File (.uet or .uep) handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.file_type === 'UEV_TEMPLATE') {
          setActiveTemplate(parsed);

          let targetZone = selectedZone;
          let targetFY = selectedFY;

          if (parsed.zone) {
            const matched = zones.find(
              (d) =>
                d.id.toLowerCase() === String(parsed.zone).toLowerCase() ||
                d.name_en.toLowerCase() === String(parsed.zone).toLowerCase()
            );
            if (matched) {
              targetZone = matched;
              setSelectedZone(matched);
            }
          }
          if (parsed.fiscal_year) {
            targetFY = parsed.fiscal_year;
            setSelectedFY(parsed.fiscal_year);
          }

          const activeKey = `${targetZone.id}_${targetFY}`;
          const activeKeyAlt = `${targetZone.name_en}_${targetFY}`;

          const importedResources: ResourceMaster[] = Array.isArray(parsed.resources) ? parsed.resources : [];
          
          setZoneRatesMap((prevMap) => {
            const nextMap: Record<string, ResourceMaster[]> = { ...prevMap };

            // If parsed.zone_rates is a dictionary map
            if (parsed.zone_rates && typeof parsed.zone_rates === 'object' && !Array.isArray(parsed.zone_rates)) {
              Object.assign(nextMap, parsed.zone_rates);
            } else if (Array.isArray(parsed.zone_rates)) {
              nextMap[activeKey] = parsed.zone_rates;
            }

            if (importedResources.length > 0) {
              nextMap[activeKey] = importedResources;
              nextMap[activeKeyAlt] = importedResources;
              nextMap['default'] = importedResources;
            }

            return nextMap;
          });

          if (parsed.norms && parsed.norms.length > 0) {
            setNorms(parsed.norms);
          }

          setShowWelcomeScreen(false);
          showToast(`Loaded Master Template: ${parsed.template_name || 'Imported Template'}`);
        } else if (parsed.file_type === 'UEV_PROJECT') {
          let targetZone = selectedZone;
          let targetFY = selectedFY;

          if (parsed.zone) {
            const matched = zones.find(
              (d) =>
                d.id.toLowerCase() === String(parsed.zone).toLowerCase() ||
                d.name_en.toLowerCase() === String(parsed.zone).toLowerCase()
            );
            if (matched) {
              targetZone = matched;
              setSelectedZone(matched);
            }
          }
          if (parsed.fiscal_year) {
            targetFY = parsed.fiscal_year;
            setSelectedFY(parsed.fiscal_year);
          }

          const newProj: ProjectEstimate = {
            id: parsed.id || `proj_${Date.now()}`,
            title: parsed.title || 'Imported Project',
            client_name: parsed.client_name || 'Department Office',
            zone: parsed.zone || targetZone.name_en,
            fiscal_year: parsed.fiscal_year || targetFY,
            contractor_overhead_percent: parsed.contractor_overhead_percent || 15,
            tax_percent: parsed.tax_percent || 13,
            lead_distance_km: parsed.lead_distance_km || 0,
            items: parsed.items || [],
            created_at: parsed.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          setProjects((prev) => [newProj, ...prev.filter((p) => p.id !== newProj.id)]);
          setActiveProjectId(newProj.id);

          if (parsed.zone_rates || parsed.resources) {
            const activeKey = `${targetZone.id}_${targetFY}`;
            const importedRes = parsed.resources || parsed.zone_rates;
            if (importedRes) {
              setZoneRatesMap((prev) => ({
                ...prev,
                [activeKey]: Array.isArray(importedRes) ? importedRes : prev[activeKey]
              }));
            }
          }

          setShowWelcomeScreen(false);
          showToast(`Loaded Project Estimate: ${newProj.title}`);
        } else {
          showToast('File loaded into active workspace buffer.');
          setShowWelcomeScreen(false);
        }
      } catch (err) {
        showToast('Error parsing file content.');
      }
    };
    reader.readAsText(file);
  };

  // Add analyzed item to active BOQ Estimate & Measurement Book
  const handleAddToBOQ = (result: RateCalculationResult, quantity: number) => {
    const userRate = result.user_unit_rate || result.total_unit_rate;
    const contractorRate = result.contractor_unit_rate || result.total_unit_rate;
    const itemMode = result.mode || 'user';
    const activeRate = result.total_unit_rate;

    setProject((prev) => {
      const currentRateMode = prev.rate_mode || itemMode;
      const existingIdx = prev.items.findIndex(
        (it) => it.item_id === result.norm_id || (it.item_code && it.item_code === result.item_code)
      );

      const newMBRow: MBRow = {
        id: `mb_row_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        particulars: existingIdx !== -1
          ? `Section / Location Entry ${(prev.items[existingIdx].mb_rows?.length || 0) + 1}`
          : 'Initial Quantity Estimate',
        no_of_units: 1,
        length: quantity,
        breadth: 1,
        height: 1,
        quantity: quantity,
        remarks: 'From Rate Analysis'
      };

      if (existingIdx !== -1) {
        const existingItem = prev.items[existingIdx];
        const updatedMbRows = [...(existingItem.mb_rows || []), newMBRow];
        const sumQty = updatedMbRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
        const roundedQty = Math.round(sumQty * 10000) / 10000;
        const effectiveRate = currentRateMode === 'user' ? userRate : contractorRate;

        const updatedItem: BOQItem = {
          ...existingItem,
          description: result.description,
          unit: result.base_unit,
          calculated_unit_rate: activeRate,
          user_rate: userRate,
          contractor_rate: contractorRate,
          mode: itemMode,
          estimated_quantity: roundedQty,
          total_amount: Math.round(roundedQty * effectiveRate * 100) / 100,
          mb_rows: updatedMbRows
        };

        const updatedItems = [...prev.items];
        updatedItems[existingIdx] = updatedItem;

        return {
          ...prev,
          rate_mode: currentRateMode,
          items: updatedItems
        };
      } else {
        const effectiveRate = currentRateMode === 'user' ? userRate : contractorRate;
        const newItem: BOQItem = {
          id: `boq_${Date.now()}`,
          item_id: result.norm_id,
          item_code: result.item_code,
          description: result.description,
          unit: result.base_unit,
          estimated_quantity: quantity,
          calculated_unit_rate: activeRate,
          user_rate: userRate,
          contractor_rate: contractorRate,
          mode: itemMode,
          total_amount: Math.round(quantity * effectiveRate * 100) / 100,
          chapter: 'General Civil Works',
          mb_rows: [newMBRow]
        };

        return {
          ...prev,
          rate_mode: currentRateMode,
          items: [...prev.items, newItem]
        };
      }
    });

    showToast(`Added/Updated item ${result.item_code} in BOQ & Measurement Book.`);
  };

  // If Startup Welcome Screen is active, render Welcome Screen
  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        onNewTemplate={() => {
          setShowWelcomeScreen(false);
          setActiveTab('norms-library');
          showToast('Started New Master Template (.uet) configuration.');
        }}
        onOpenTemplate={(tmpl) => {
          setActiveTemplate(tmpl);
          if (tmpl.resources && tmpl.resources.length > 0) setResources(tmpl.resources);
          if (tmpl.norms && tmpl.norms.length > 0) setNorms(tmpl.norms);
          setShowWelcomeScreen(false);
          setActiveTab('norms-library');
          showToast(`Opened Template: ${tmpl.template_name}`);
        }}
        onNewProject={() => {
          setShowWelcomeScreen(false);
          setIsProjectModalOpen(true);
        }}
        onOpenProject={(proj) => {
          setActiveProjectId(proj.id);
          setShowWelcomeScreen(false);
          setActiveTab('boq');
          showToast(`Opened Project: ${proj.title}`);
        }}
        onImportFile={handleImportFile}
        onNavigateToSettings={() => {
          setShowWelcomeScreen(false);
          setActiveTab('organization');
        }}
        onExitToWorkspace={() => setShowWelcomeScreen(false)}
        recentFiles={recentFiles}
        activeProject={project}
        activeTemplate={activeTemplate}
      />
    );
  }

  useEffect(() => {
    const handleToggleLock = () => {
      setIsProjectLocked(prev => {
        const next = !prev;
        showToast(next ? '🔒 Project is now LOCKED against editing.' : '🔓 Project is now UNLOCKED.');
        return next;
      });
    };
    window.addEventListener('uev:toggle-project-lock', handleToggleLock);
    return () => window.removeEventListener('uev:toggle-project-lock', handleToggleLock);
  }, []);

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      zones={zones}
      selectedZone={selectedZone}
      setSelectedZone={setSelectedZone}
      fiscalYears={fiscalYears}
      selectedFY={selectedFY}
      setSelectedFY={setSelectedFY}
      onOpenRestoreModal={() => setIsRestoreModalOpen(true)}
      onOpenSearchModal={() => setIsSearchModalOpen(true)}
      isInitiationLocked={isInitiationLocked}
      setIsInitiationLocked={setIsInitiationLocked}
      onToggleInitiationLock={handleToggleInitiationLock}
      onOpenAddZoneModal={() => setIsAddZoneModalOpen(true)}
      onOpenAddFYModal={() => setIsAddFYModalOpen(true)}
      onOpenProjectModal={() => setIsProjectModalOpen(true)}
      onOpenUserSettings={(tab?: any) => {
        setUserSettingsInitialTab(tab || 'general');
        setIsUserSettingsModalOpen(true);
      }}
      onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
      onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
      isProjectLocked={isProjectLocked}
      onToggleProjectLock={() => {
        setIsProjectLocked(prev => {
          const next = !prev;
          showToast(next ? '🔒 Project is now LOCKED against editing.' : '🔓 Project is now UNLOCKED.');
          return next;
        });
      }}
      activeProjectTitle={project.title}
      activeTemplateName={activeTemplate.template_name}
      onNewTemplate={() => {
        setActiveTab('norms-library');
        showToast('Creating new Master Template (.uet)');
      }}
      onExportTemplate={handleExportTemplate}
      onExportProject={handleExportProject}
      onSaveFile={() => showToast('Project data auto-saved to local session.')}
      project={project}
      showToast={showToast}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-red-700 font-bold text-xs flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <DashboardView
          project={project}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          norms={norms}
          resources={resources}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 1. INITIATION / MASTER TEMPLATE (.uet) MODULE */}
      {activeTab === 'fiscal-year' && (
        <FiscalYearView
          fiscalYears={fiscalYears}
          setFiscalYears={setFiscalYears}
          selectedFY={selectedFY}
          setSelectedFY={setSelectedFY}
          showToast={showToast}
        />
      )}

      {activeTab === 'organization' && (
        <OrganizationView
          selectedZone={selectedZone}
          showToast={showToast}
        />
      )}

      {(activeTab === 'zone-rates' || activeTab === 'resource-master') && (
        <ZoneRatesView
          resources={resources}
          setResources={setResources}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          norms={norms}
          isInitiationLocked={isInitiationLocked}
          zones={zones}
          onSelectZone={setSelectedZone}
          onOpenAddZoneModal={() => setIsAddZoneModalOpen(true)}
        />
      )}

      {activeTab === 'norms-library' && (
        <NormsManagerView
          norms={norms}
          setNorms={setNorms}
          resources={resources}
          setResources={setResources}
          isInitiationLocked={isInitiationLocked}
          selectedZone={selectedZone}
        />
      )}

      {(activeTab === 'bar-bending-schedule' || activeTab === 'bar-bending' || activeTab === 'bbs') && (
        <BarBendingScheduleView
          project={project}
          setProject={setProject}
          onNavigateToTab={setActiveTab}
          showToast={showToast}
        />
      )}

      {activeTab === 'contract-agreement' && (
        <ContractAgreementView
          project={project}
          setProject={setProject}
          contract={contract || undefined}
          setContract={(c) => setContract(c)}
          onNavigateToTab={setActiveTab}
          showToast={showToast}
        />
      )}

      {activeTab === 'rate-analysis' && (
        <RateAnalysisView
          norms={norms}
          setNorms={setNorms}
          resources={resources}
          setResources={setResources}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          project={project}
          onAddToBOQ={handleAddToBOQ}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'data-cleaning' && (
        <DataCleaningView
          resources={resources}
          setResources={setResources}
          norms={norms}
          setNorms={setNorms}
        />
      )}

      {/* 2. PROJECT ESTIMATE (.uep) MODULE */}
      {activeTab === 'mb' && (
        <MeasurementBookView
          key={project.id}
          project={project}
          setProject={setProject}
          norms={norms}
          resources={resources}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'boq' && (
        <BOQView
          key={project.id}
          project={project}
          setProject={setProject}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          norms={norms}
          setNorms={setNorms}
          resources={resources}
          onNavigateToTab={setActiveTab}
        />
      )}

      {(activeTab === 'resource-breakdown' || activeTab === 'valuation-resources') && (
        <ResourceBreakdownView
          project={project}
          norms={norms}
          resources={resources}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          valuationRows={valuationRows}
          valuationBooks={valuationBooks}
          initialSource={activeTab === 'valuation-resources' ? 'valuation' : 'estimate'}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'template-drawings' && (
        <TemplateDrawingsView
          project={project}
          setProject={setProject}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          norms={norms}
          resources={resources}
          valuationBooks={valuationBooks}
          setValuationBooks={setValuationBooks}
          valuationRows={valuationRows}
          setValuationRows={setValuationRows}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesHubView
          project={project}
          setProject={setProject}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          onNavigateToTab={setActiveTab}
          showToast={showToast}
        />
      )}

      {activeTab === 'template-editor' && (
        <TemplateEditorView
          project={project}
          setProject={setProject}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          norms={norms}
          resources={resources}
          onNavigateToTab={setActiveTab}
        />
      )}

      {/* 3. POST-CONTRACT VALUATION MODULE */}
      {(activeTab === 'valuation-mb' || activeTab === 'valuation-abstract') && (
        <ValuationMBView
          key={`${project.id}_${activeTab}`}
          project={project}
          setProject={setProject}
          valuationBooks={valuationBooks}
          setValuationBooks={setValuationBooks}
          valuationRows={valuationRows}
          setValuationRows={setValuationRows}
          norms={norms}
          resources={resources}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          showToast={showToast}
          onNavigateToTab={setActiveTab}
          defaultViewMode={activeTab === 'valuation-abstract' ? 'abstract' : 'grid'}
        />
      )}

      {activeTab === 'completion-certificate' && (
        <CompletionCertificateView
          project={project}
          contract={contract}
          valuationBooks={valuationBooks}
          valuationRows={valuationRows}
          certificate={certificate}
          setCertificate={setCertificate}
          showToast={showToast}
          onNavigateToTab={setActiveTab}
        />
      )}

      {/* 3. REPORTS */}
      {activeTab === 'reports' && (
        <ExecutiveReportsView
          project={project}
          selectedZone={selectedZone}
          selectedFY={selectedFY}
          showToast={showToast}
        />
      )}

      {/* 4. ADMINISTRATION */}
      {activeTab === 'admin-users' && (
        <UserManagementView showToast={showToast} />
      )}

      {activeTab === 'admin-audit' && (
        <AuditLogsView />
      )}

      {/* 5. USER MANUAL & DOCUMENTATION */}
      {activeTab === 'user-manual' && (
        <UserManualView onNavigateToTab={setActiveTab} />
      )}

      {/* Modals Overlays */}
      <AddZoneModal
        isOpen={isAddZoneModalOpen}
        onClose={() => setIsAddZoneModalOpen(false)}
        onAddZone={handleAddCustomZone}
      />

      <AddFYModal
        isOpen={isAddFYModalOpen}
        onClose={() => setIsAddFYModalOpen(false)}
        onAddFY={handleAddCustomFY}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projects}
        setProjects={setProjects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        zones={zones}
        fiscalYears={fiscalYears}
        showToast={showToast}
      />

      <RestorePointModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        zones={zones}
        setZones={setZones}
        fiscalYears={fiscalYears}
        setFiscalYears={setFiscalYears}
        selectedZone={selectedZone}
        setSelectedZone={setSelectedZone}
        selectedFY={selectedFY}
        setSelectedFY={setSelectedFY}
        resources={resources}
        setResources={setResources}
        norms={norms}
        setNorms={setNorms}
        project={project}
        setProject={setProject}
        showToast={showToast}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        norms={norms}
        resources={resources}
        project={project}
        onSelectNorm={(normId) => {
          setActiveTab('rate-analysis');
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenRestoreModal={() => setIsRestoreModalOpen(true)}
      />

      <UserSettingsModal
        isOpen={isUserSettingsModalOpen}
        onClose={() => setIsUserSettingsModalOpen(false)}
        fiscalYears={fiscalYears}
        selectedFY={selectedFY}
        setSelectedFY={setSelectedFY}
        zones={zones}
        selectedZone={selectedZone}
        setSelectedZone={setSelectedZone}
        onOpenAddFYModal={() => setIsAddFYModalOpen(true)}
        onOpenAddZoneModal={() => setIsAddZoneModalOpen(true)}
        onOpenRestoreModal={() => setIsRestoreModalOpen(true)}
        isInitiationLocked={isInitiationLocked}
        setIsInitiationLocked={setIsInitiationLocked}
        project={project}
        setProject={setProject}
        initialTab={userSettingsInitialTab}
        activeTemplate={activeTemplate}
        setActiveTemplate={setActiveTemplate}
        onNewTemplate={() => {
          setActiveTab('norms-library');
          showToast('Started New Master Template (.uet) configuration.');
        }}
        onExportTemplate={handleExportTemplate}
        onNavigateTab={setActiveTab}
        showToast={showToast}
      />

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        project={project}
      />

      <ProjectSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        project={project}
        setProject={setProject}
        selectedZone={selectedZone}
        selectedFY={selectedFY}
        isLocked={isProjectLocked}
        setIsLocked={(locked) => {
          setIsProjectLocked(locked);
          showToast(locked ? '🔒 Project Estimate LOCKED against further modifications.' : '🔓 Project Estimate UNLOCKED for editing.');
        }}
        showToast={showToast}
      />
    </AppShell>
  );
}
