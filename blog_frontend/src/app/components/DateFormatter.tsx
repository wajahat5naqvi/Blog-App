'use client';

import { useState, useEffect } from 'react';

interface DateFormatterProps {
  date: string;
  format?: Intl.DateTimeFormatOptions;
  className?: string;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
};

export default function DateFormatter({ 
  date, 
  format = DEFAULT_FORMAT,
  className 
}: DateFormatterProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    if (!date) return;
    
    try {
      const dateObj = new Date(date);
      setFormattedDate(dateObj.toLocaleDateString('en-US', format));
    } catch (error) {
      console.error('Error formatting date:', error);
      setFormattedDate(date);
    }
  }, [date, format]);

  // During SSR or before client hydration, return an empty space-preserving element
  if (!formattedDate) {
    return <span className={className}>&nbsp;</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}