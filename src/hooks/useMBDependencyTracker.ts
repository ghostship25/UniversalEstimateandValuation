import React, { useEffect, useRef } from 'react';
import { ProjectEstimate } from '../types';
import { recalculateAllProjectItems } from '../services/mbDependencyEngine';

/**
 * Dependency tracking hook that ensures any change to a parent item quantity,
 * dimension, custom column, or formula string automatically recalculates all
 * linked quantities and sub-items across the Measurement Book (MB) and BOQ modules.
 */
export function useMBDependencyTracker(
  project: ProjectEstimate,
  setProject: React.Dispatch<React.SetStateAction<ProjectEstimate>>
) {
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!project || !project.items) return;
    if (isUpdatingRef.current) return;

    const { items, hasChanged } = recalculateAllProjectItems(project.items, project.rate_mode || 'user');

    if (hasChanged) {
      console.log('[useMBDependencyTracker] Changes detected in project items. Triggering async state update cycle...', {
        projectId: project.id,
        itemsCount: items.length,
        timestamp: new Date().toISOString()
      });
      isUpdatingRef.current = true;
      const timer = setTimeout(() => {
        setProject((prev) => {
          console.log('[useMBDependencyTracker] State update committed to project state.');
          return {
            ...prev,
            items
          };
        });
        isUpdatingRef.current = false;
      }, 0);
      return () => {
        clearTimeout(timer);
        isUpdatingRef.current = false;
      };
    } else {
      console.log('[useMBDependencyTracker] All project items and MB row calculations are synchronized.');
    }
  }, [project.items, project.rate_mode, setProject]);
}


