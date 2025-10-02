'use client';

/**
 * Safe wrapper around console.error that prevents errors in production
 * @param message Primary message to log
 * @param error Error object or additional details
 */
export const safeConsoleError = (message: string, error?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
};

/**
 * Process API error response and return a user-friendly message
 * @param error API error response
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  // Default error message
  let errorMessage = 'An unexpected error occurred. Please try again.';
  
  // Handle axios error responses
  if (error?.response?.data) {
    const data = error.response.data;
    
    // Handle string error message
    if (typeof data === 'string') {
      return data;
    }
    
    // Handle DRF detail field
    if (data.detail) {
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    }
    
    // Handle DRF field errors
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      const fieldErrors = Object.entries(data)
        .map(([field, errors]) => {
          const errorText = Array.isArray(errors) ? errors.join(' ') : String(errors);
          return `${field}: ${errorText}`;
        })
        .join('; ');
      
      if (fieldErrors) {
        return fieldErrors;
      }
    }
  }
  
  // Handle simple error objects with message property
  if (error?.message) {
    return error.message;
  }
  
  return errorMessage;
};