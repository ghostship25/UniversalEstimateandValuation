import { DrawingCategory } from '../types';

export interface CADDimensionField {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  step?: number;
  min?: number;
  description?: string;
  mbTargetField?: 'breadth' | 'height' | 'length' | 'custom';
}

export interface CADTemplateDef {
  id: string;
  name: string;
  category: DrawingCategory;
  variantKey: string;
  folderPath: string; // e.g. '/src/components/drawings/templates/walls/'
  fileName: string;   // e.g. 'ProtectionWallTemplate.tsx'
  description: string;
  dimensionFields: CADDimensionField[];
  defaultParams: Record<string, any>;
  tags: string[];
  is_custom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
}
