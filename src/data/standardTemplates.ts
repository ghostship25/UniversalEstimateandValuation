import { MasterTemplate } from '../types';
import { INITIAL_RESOURCES, INITIAL_ZONES } from './initialData';
import { currencyCode } from '../services/currency';

export const STANDARD_TEMPLATES: MasterTemplate[] = [
  {
    file_type: 'UEV_TEMPLATE',
    version: '3.2.0',
    id: 'tmpl_building_2026',
    template_name: 'Master Building Norms & Zone Rates (2026/27)',
    template_code: 'BLD-BUILD-2026',
    description: 'Department of Urban Development & Building Construction master rate analysis specifications, labor wages, and material indices.',
    department: 'BLD',
    fiscal_year: '2026/27 (Current)',
    province: 'Central Province',
    zone: 'Capital City',
    author: 'Ministry of Urban Development, GoN',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    organization: {
      province: 'Central Province',
      zone: 'Capital City',
      authority_type: 'Metropolitan City',
      authority_name: 'Capital City Metropolitan City',
      department: 'Department of Urban Development & Building Construction',
      organization_name: 'Ministry of Urban Development',
      office_name: 'BLD Central Division Office',
      address: '100 Government Avenue, Capital City',
      contact_email: 'info@example.org',
      contact_phone: '+1-555-0100'
    },
    general_settings: {
      office_name: 'BLD Central Division Office',
      office_address: '100 Government Avenue, Capital City',
      department: 'BLD',
      province: 'Central Province',
      zone: 'Capital City',
      local_authority: 'Capital City Metropolitan City',
      fiscal_year: '2026/27 (Current)',
      contractor_overhead_percent: 15,
      tax_percent: 13,
      currency: `${currencyCode()}`,
      default_unit_system: 'Metric',
      precision_decimals: 2,
      auto_save_enabled: true
    },
    resources: INITIAL_RESOURCES,
    zone_rates: {
      ktm: INITIAL_RESOURCES,
      ltp: INITIAL_RESOURCES
    },
    norms: [
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
      },
      {
        item_id: 1002,
        code: '3.1',
        source: 'Standard Building Norms',
        description: 'M20 Grade Reinforced Cement Concrete (RCC 1:1.5:3) in structural elements',
        base_unit: 'Cu.m.',
        base_quantity: 1,
        resources: [
          { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 1.2 },
          { resource_id: 102, resource_name: 'Skilled Mason', category: 'Labor', quantity_per_base_unit: 0.45 },
          { resource_id: 104, resource_name: 'OPC Cement 53 Grade', category: 'Material', quantity_per_base_unit: 6.8 },
          { resource_id: 106, resource_name: 'Coarse River Sand', category: 'Material', quantity_per_base_unit: 0.45 },
          { resource_id: 107, resource_name: 'Crushed Stone Aggregate 20mm', category: 'Material', quantity_per_base_unit: 0.88 }
        ]
      }
    ]
  },
  {
    file_type: 'UEV_TEMPLATE',
    version: '3.2.0',
    id: 'tmpl_dor_2081',
    template_name: 'Roads Dept. Highway & Bridge Standard Specification Template (2026/27)',
    template_code: 'RDS-ROAD-2081',
    description: 'Department of Roads standard norms for flexible pavement, DBST, Sub-base, Base course, and Box Culverts.',
    department: 'Roads Dept.',
    fiscal_year: '2026/27 (Current)',
    province: 'Central Province',
    zone: 'Capital City',
    author: 'Department of Roads, Ministry of Physical Infrastructure & Transport',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-07-21T00:00:00.000Z',
    organization: {
      province: 'Central Province',
      zone: 'Capital City',
      authority_type: 'Metropolitan City',
      authority_name: 'Capital City Metropolitan City',
      department: 'Department of Roads',
      organization_name: 'Ministry of Physical Infrastructure & Transport',
      office_name: 'Roads Dept. Heavy Equipment & Bridge Division',
      address: '200 Civic Center Road, Capital City',
      contact_email: 'info@example.org',
      contact_phone: '+1-555-0100'
    },
    general_settings: {
      office_name: 'Roads Dept. Heavy Equipment & Bridge Division',
      office_address: '200 Civic Center Road, Capital City',
      department: 'Roads Dept.',
      province: 'Central Province',
      zone: 'Capital City',
      local_authority: 'Capital City Metropolitan City',
      fiscal_year: '2026/27 (Current)',
      contractor_overhead_percent: 15,
      tax_percent: 13,
      currency: `${currencyCode()}`,
      default_unit_system: 'Metric',
      precision_decimals: 2,
      auto_save_enabled: true
    },
    resources: INITIAL_RESOURCES,
    zone_rates: {
      ktm: INITIAL_RESOURCES
    },
    norms: [
      {
        item_id: 2001,
        code: 'R-12.1',
        source: 'Roads Dept. Standard Norms',
        description: 'Providing & laying Granular Sub-Base (GSB) course conforming to Roads Dept. specs',
        base_unit: 'Cu.m.',
        base_quantity: 1,
        resources: [
          { resource_id: 101, resource_name: 'Unskilled Labor', category: 'Labor', quantity_per_base_unit: 0.25 },
          { resource_id: 110, resource_name: 'Excavator 1.2 cu.m', category: 'Equipment', quantity_per_base_unit: 0.04 },
          { resource_id: 112, resource_name: 'Vibratory Road Roller 10 Ton', category: 'Equipment', quantity_per_base_unit: 0.03 }
        ]
      }
    ]
  },
  {
    file_type: 'UEV_TEMPLATE',
    version: '3.2.0',
    id: 'tmpl_muni_2081',
    template_name: 'Local Authority Infrastructure Template (2026/27)',
    template_code: 'MUNI-INFRA-2081',
    description: 'Designed for Ward-level road gravelling, RCC drains, retaining walls, and authority building upgrades.',
    department: 'Local Authority',
    fiscal_year: '2026/27 (Current)',
    province: 'West Province',
    zone: 'Sample County (Sample City)',
    author: 'Authority Infrastructure Engineering Directorate',
    created_at: '2026-02-10T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
    organization: {
      province: 'West Province',
      zone: 'Sample County (Sample City)',
      authority_type: 'Metropolitan City',
      authority_name: 'Sample City Metropolitan City',
      department: 'Urban Development Directorate',
      organization_name: 'Sample City Metropolitan City Office',
      office_name: 'Local Engineering Section',
      address: '300 Main Street, Sample City',
      contact_email: 'info@example.org',
      contact_phone: '+1-555-0100'
    },
    general_settings: {
      office_name: 'Local Engineering Section',
      office_address: '300 Main Street, Sample City',
      department: 'Local Authority',
      province: 'West Province',
      zone: 'Sample County (Sample City)',
      local_authority: 'Sample City Metropolitan City',
      fiscal_year: '2026/27 (Current)',
      contractor_overhead_percent: 15,
      tax_percent: 13,
      currency: `${currencyCode()}`,
      default_unit_system: 'Metric',
      precision_decimals: 2,
      auto_save_enabled: true
    },
    resources: INITIAL_RESOURCES,
    zone_rates: {
      pkr: INITIAL_RESOURCES
    },
    norms: []
  }
];
