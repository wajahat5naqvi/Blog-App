import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { DynamicOptionsLoadingProps } from 'next/dynamic';

/**
 * Create a dynamic import that prevents SSR for components that need to run on client-side only
 * This helps prevent hydration mismatches for components that use browser APIs
 * 
 * @param importFn Function that imports the component
 * @returns A dynamically imported component that only renders on the client
 */
export function createClientComponent<P>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  { ssr = false }: { ssr?: boolean } = {}
) {
  return dynamic(importFn, {
    ssr,
  });
}