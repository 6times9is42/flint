'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for persisting form state to localStorage.
 * Safely handles SSR by checking if window is defined.
 *
 * @param key - localStorage key
 * @param defaultValue - initial value if localStorage is empty or invalid
 * @returns [state, setState] tuple for use in forms
 */
export function useFormPersistence<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    // Prevent hydration mismatch: return default on server
    if (typeof window === 'undefined') return defaultValue;

    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      // If JSON parsing fails, fall back to default
      return defaultValue;
    }
  });

  // Sync state to localStorage on every change
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}
