'use client';

// Utility functions to safely handle client-side only operations

// Safe window check
export const isClient = typeof window !== 'undefined';

// Safe localStorage operations
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isClient) {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isClient) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (isClient) {
      localStorage.removeItem(key);
    }
  }
};

// Safe date formatting
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return '';
  
  try {
    return new Date(dateString).toLocaleDateString('en-US', 
      options || { year: 'numeric', month: 'long', day: 'numeric' }
    );
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// React hook for safe client-side values
import { useState, useEffect } from 'react';

export function useClientValue<T>(serverValue: T, clientValueFn: () => T): T {
  const [value, setValue] = useState<T>(serverValue);
  
  useEffect(() => {
    setValue(clientValueFn());
  }, []);
  
  return value;
}

// Safe current year hook
export function useCurrentYear(defaultYear: string = '2025'): string {
  return useClientValue(defaultYear, () => new Date().getFullYear().toString());
}