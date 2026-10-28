import { VisualGeometryModel } from '../types';
import { CADTemplateDef } from '../components/drawings/templates/types';

const USER_CUSTOM_TEMPLATES_KEY = 'CIVIL_ESTIMATE_USER_CUSTOM_TEMPLATES_V1';
const DEFAULT_TEMPLATES_SET_KEY = 'CIVIL_ESTIMATE_DEFAULT_TEMPLATES_SET_V1';

// Custom CAD 2D Section Studio Templates Keys
const USER_CUSTOM_CAD_TEMPLATES_KEY = 'CIVIL_ESTIMATE_USER_CUSTOM_CAD_TEMPLATES_V1';
const DEFAULT_CAD_TEMPLATES_SET_KEY = 'CIVIL_ESTIMATE_DEFAULT_CAD_TEMPLATES_SET_V1';

/**
 * Load all user-created custom templates from local storage
 */
export function loadUserCustomTemplates(): VisualGeometryModel[] {
  try {
    const raw = localStorage.getItem(USER_CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load user custom templates:', err);
    return [];
  }
}

/**
 * Save all user-created custom templates to local storage
 */
export function saveUserCustomTemplates(templates: VisualGeometryModel[]): void {
  try {
    localStorage.setItem(USER_CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save user custom templates:', err);
  }
}

/**
 * Save or update a single custom template
 */
export function saveOrUpdateCustomTemplate(template: VisualGeometryModel): VisualGeometryModel[] {
  const all = loadUserCustomTemplates();
  const index = all.findIndex((t) => t.id === template.id);
  
  const updatedTemplate = {
    ...template,
    is_custom: true,
    updated_at: new Date().toISOString()
  };

  if (index >= 0) {
    all[index] = updatedTemplate;
  } else {
    all.unshift(updatedTemplate);
  }

  saveUserCustomTemplates(all);
  return all;
}

/**
 * Delete a user custom template
 */
export function deleteUserCustomTemplate(templateId: string): VisualGeometryModel[] {
  const all = loadUserCustomTemplates();
  const filtered = all.filter((t) => t.id !== templateId);
  saveUserCustomTemplates(filtered);
  
  // Also remove from default templates set if present
  const defaultIds = getDefaultTemplateIds();
  if (defaultIds.includes(templateId)) {
    setDefaultTemplateIds(defaultIds.filter((id) => id !== templateId));
  }
  
  return filtered;
}

/**
 * Get the list of template IDs designated as "Default Templates"
 */
export function getDefaultTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(DEFAULT_TEMPLATES_SET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load default templates set:', err);
    return [];
  }
}

/**
 * Set the list of template IDs designated as "Default Templates"
 */
export function setDefaultTemplateIds(ids: string[]): void {
  try {
    localStorage.setItem(DEFAULT_TEMPLATES_SET_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save default templates set:', err);
  }
}

/**
 * Toggle whether a template is added to the user's Default Templates catalog
 */
export function toggleDefaultTemplateStatus(templateId: string): boolean {
  const current = getDefaultTemplateIds();
  const exists = current.includes(templateId);
  let updated: string[];
  if (exists) {
    updated = current.filter((id) => id !== templateId);
  } else {
    updated = [...current, templateId];
  }
  setDefaultTemplateIds(updated);
  return !exists; // returns true if now marked as default
}

/**
 * Export templates as a downloadable JSON file
 */
export function exportTemplatesToJSON(templates: VisualGeometryModel[], fileName = 'civil_custom_templates.json'): void {
  const jsonStr = JSON.stringify(templates, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported template JSON string
 */
export function parseAndImportTemplatesJSON(jsonString: string): VisualGeometryModel[] {
  try {
    const parsed = JSON.parse(jsonString);
    const incoming: VisualGeometryModel[] = Array.isArray(parsed) ? parsed : [parsed];
    
    // Basic validation
    const validTemplates = incoming.filter((item) => {
      return item && typeof item === 'object' && item.id && item.name && Array.isArray(item.shapes);
    });

    if (validTemplates.length === 0) {
      throw new Error('No valid template drawings found in the imported file.');
    }

    const current = loadUserCustomTemplates();
    const map = new Map<string, VisualGeometryModel>();
    
    current.forEach((t) => map.set(t.id, t));
    validTemplates.forEach((t) => {
      map.set(t.id, {
        ...t,
        is_custom: true,
        updated_at: new Date().toISOString()
      });
    });

    const merged = Array.from(map.values());
    saveUserCustomTemplates(merged);
    return merged;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to parse JSON file.');
  }
}

// =========================================================================
// CUSTOM CAD 2D SECTION STUDIO TEMPLATES & DEFAULTS
// =========================================================================

/**
 * Load user custom CAD templates
 */
export function loadUserCustomCADTemplates(): CADTemplateDef[] {
  try {
    const raw = localStorage.getItem(USER_CUSTOM_CAD_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load user custom CAD templates:', err);
    return [];
  }
}

/**
 * Save user custom CAD templates
 */
export function saveUserCustomCADTemplates(templates: CADTemplateDef[]): void {
  try {
    localStorage.setItem(USER_CUSTOM_CAD_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save user custom CAD templates:', err);
  }
}

/**
 * Save or update a single custom CAD template
 */
export function saveOrUpdateCustomCADTemplate(template: CADTemplateDef): CADTemplateDef[] {
  const all = loadUserCustomCADTemplates();
  const index = all.findIndex((t) => t.id === template.id);
  const now = new Date().toISOString();
  
  const updatedTemplate: CADTemplateDef = {
    ...template,
    is_custom: true,
    updatedAt: now,
    createdAt: template.createdAt || now
  };

  if (index >= 0) {
    all[index] = updatedTemplate;
  } else {
    all.unshift(updatedTemplate);
  }

  saveUserCustomCADTemplates(all);
  return all;
}

/**
 * Delete a user custom CAD template
 */
export function deleteUserCustomCADTemplate(templateId: string): CADTemplateDef[] {
  const all = loadUserCustomCADTemplates();
  const filtered = all.filter((t) => t.id !== templateId);
  saveUserCustomCADTemplates(filtered);
  
  // Also remove from default CAD templates if present
  const defaultIds = getDefaultCADTemplateIds();
  if (defaultIds.includes(templateId)) {
    setDefaultCADTemplateIds(defaultIds.filter((id) => id !== templateId));
  }
  
  return filtered;
}

/**
 * Get list of CAD template IDs designated as "Default Templates"
 */
export function getDefaultCADTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(DEFAULT_CAD_TEMPLATES_SET_KEY);
    if (!raw) {
      // Default initial templates to star
      return ['tpl_wall_rcc_l', 'tpl_drain_rectangular', 'tpl_road_asphalt', 'tpl_culvert_box_single'];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load default CAD templates set:', err);
    return ['tpl_wall_rcc_l', 'tpl_drain_rectangular', 'tpl_road_asphalt', 'tpl_culvert_box_single'];
  }
}

/**
 * Set list of CAD template IDs designated as "Default Templates"
 */
export function setDefaultCADTemplateIds(ids: string[]): void {
  try {
    localStorage.setItem(DEFAULT_CAD_TEMPLATES_SET_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save default CAD templates set:', err);
  }
}

/**
 * Toggle whether a CAD template is added to the user's Default Templates catalog
 */
export function toggleDefaultCADTemplateStatus(templateId: string): boolean {
  const current = getDefaultCADTemplateIds();
  const exists = current.includes(templateId);
  let updated: string[];
  if (exists) {
    updated = current.filter((id) => id !== templateId);
  } else {
    updated = [...current, templateId];
  }
  setDefaultCADTemplateIds(updated);
  return !exists; // returns true if now marked as default
}

/**
 * Export CAD templates as a downloadable JSON file
 */
export function exportCADTemplatesToJSON(templates: CADTemplateDef[], fileName = 'civil_cad_custom_templates.json'): void {
  const jsonStr = JSON.stringify(templates, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported CAD template JSON string
 */
export function parseAndImportCADTemplatesJSON(jsonString: string): CADTemplateDef[] {
  try {
    const parsed = JSON.parse(jsonString);
    const incoming: CADTemplateDef[] = Array.isArray(parsed) ? parsed : [parsed];
    
    const validTemplates = incoming.filter((item) => {
      return item && typeof item === 'object' && item.id && item.name && item.category && Array.isArray(item.dimensionFields);
    });

    if (validTemplates.length === 0) {
      throw new Error('No valid CAD template drawings found in the imported file.');
    }

    const current = loadUserCustomCADTemplates();
    const map = new Map<string, CADTemplateDef>();
    
    current.forEach((t) => map.set(t.id, t));
    validTemplates.forEach((t) => {
      map.set(t.id, {
        ...t,
        is_custom: true,
        updatedAt: new Date().toISOString()
      });
    });

    const merged = Array.from(map.values());
    saveUserCustomCADTemplates(merged);
    return merged;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to parse CAD templates JSON file.');
  }
}

