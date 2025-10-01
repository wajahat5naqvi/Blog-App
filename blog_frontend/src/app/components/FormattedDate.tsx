'use client';

import { useState, useEffect } from 'react';

interface FormattedDateProps {
  dateString: string;
  options?: Intl.DateTimeFormatOptions;
}

const FormattedDate = ({ 
  dateString, 
  options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
}: FormattedDateProps) => {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    try {
      setFormattedDate(
        new Date(dateString).toLocaleDateString('en-US', options)
      );
    } catch (error) {
      console.error('Error formatting date:', error);
      setFormattedDate(dateString); // Fallback to original string
    }
  }, [dateString, options]);

  return <>{formattedDate}</>;
};

export default FormattedDate;