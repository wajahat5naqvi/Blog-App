'use client';

import { useState, useEffect, ReactNode } from 'react';

interface SafeClientHydrationProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that prevents hydration mismatches by only rendering children on the client
 * This is useful for components that use browser APIs like localStorage, window, etc.
 */
export default function SafeClientHydration({ 
  children, 
  fallback = null 
}: SafeClientHydrationProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}