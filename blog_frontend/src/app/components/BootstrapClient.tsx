'use client';

import { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// Empty component that just imports bootstrap CSS
export default function BootstrapClient() {
  // Optional: Initialize Bootstrap JS components if needed
  useEffect(() => {
    // This is where you would initialize any Bootstrap JS components
    // that require initialization, if you're using them
    // Example: import('bootstrap/js/dist/dropdown');
  }, []);
  
  return null;
}