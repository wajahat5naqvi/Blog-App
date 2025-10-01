/**
 * API Error Helpers
 * Utilities for parsing and formatting API errors
 */

import { AxiosError, AxiosResponse } from 'axios';

// Types for error response structure
export interface ApiErrorResponse {
  detail?: string[] | string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
  [key: string]: any;
}

export interface FormattedApiError {
  message: string;
  details: Record<string, string[]>;
  fieldErrors: Record<string, string[]>;
  nonFieldErrors: string[];
  statusCode: number;
  requestId?: string;
  originalError?: any;
}

/**
 * Creates a safe representation of response data for logging
 * Ensures the output is always a valid object with proper formatting
 */
export function safeResponseData(data: any): object {
  // Handle undefined or null response data
  if (data === undefined || data === null) {
    return { message: 'Empty response body' };
  }
  
  // Handle empty object response data
  if (typeof data === 'object' && !Array.isArray(data) && 
      Object.keys(data).length === 0) {
    return { message: 'Empty response body (empty object)' };
  }
  
  // Handle string response data (convert to object)
  if (typeof data === 'string') {
    return { value: data, _isStringValue: true };
  }
  
  // Return original object data
  return data;
}

/**
 * Extract error messages from an API error response
 * @param error The error object from an API call
 * @returns A standardized error object with message and details
 */
export function parseApiError(error: AxiosError | Error | unknown, requestId?: string): FormattedApiError {
  // Development-only detailed logging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', error);
  }

  // Default formatted error structure
  const formattedError: FormattedApiError = {
    message: 'An unexpected error occurred',
    details: {},
    fieldErrors: {},
    nonFieldErrors: [],
    statusCode: 0,
    requestId: requestId,
    originalError: process.env.NODE_ENV === 'development' ? error : undefined
  };

  if (error instanceof Error) {
    formattedError.message = error.message;
  }

  // Handle Axios errors with response data
  if (axios.isAxiosError(error) && error.response) {
    const response: AxiosResponse = error.response;
    formattedError.statusCode = response.status;

    // Parse response data if present
    if (response.data) {
      const errorData = response.data as ApiErrorResponse;
      
      // Process field-specific errors
      if (typeof errorData === 'object') {
        // Try to extract main error message
        if (errorData.message) {
          formattedError.message = errorData.message;
        } else if (errorData.detail) {
          formattedError.message = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail;
        }

        // Add non-field errors
        if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
          formattedError.nonFieldErrors = errorData.non_field_errors;
          
          // Use first non-field error as message if we don't have one yet
          if (!formattedError.message || formattedError.message === 'An unexpected error occurred') {
            formattedError.message = errorData.non_field_errors[0];
          }
        }

        // Process standard DRF validation errors
        Object.entries(errorData).forEach(([field, value]) => {
          // Skip special keys and already processed fields
          if (['detail', 'message', 'non_field_errors', 'errors'].includes(field)) {
            return;
          }

          // Create standardized field error arrays
          if (Array.isArray(value)) {
            formattedError.fieldErrors[field] = value;
          } else if (typeof value === 'string') {
            formattedError.fieldErrors[field] = [value];
          } else if (typeof value === 'object' && value !== null) {
            formattedError.fieldErrors[field] = ['Invalid data'];
          }
        });

        // Process errors from custom format
        if (errorData.errors && typeof errorData.errors === 'object') {
          formattedError.details = { ...formattedError.details, ...errorData.errors };
        }
      } else if (typeof errorData === 'string') {
        // Handle string error responses
        formattedError.message = errorData;
        formattedError.details = { error: [errorData] };
      }
    }

    // Generate appropriate fallback message based on status
    if (formattedError.message === 'An unexpected error occurred') {
      const fallbackMessages: Record<number, string> = {
        400: 'Invalid request data. Please check your input and try again.',
        401: 'Authentication required. Please log in again.',
        403: 'You don\'t have permission to perform this action.',
        404: 'Resource not found.',
        413: 'Request entity too large.',
        415: 'Unsupported media type.',
        429: 'Too many requests. Please try again later.',
        500: 'Server error. Please try again later.',
        502: 'Bad gateway. Please try again later.',
        503: 'Service unavailable. Please try again later.'
      };
      
      formattedError.message = fallbackMessages[response.status] || 
                            `Server error (${response.status}): Please try again later`;
    }
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    // Handle plain object with message property
    formattedError.message = (error as any).message || formattedError.message;
    
    // Copy any additional fields
    if ('details' in error && typeof (error as any).details === 'object') {
      formattedError.details = (error as any).details;
    }
    
    if ('status' in error) {
      formattedError.statusCode = (error as any).status;
    }
  }

  return formattedError;
}

/**
 * Extract HTML error message from HTML response
 * @param htmlContent The HTML response string
 * @returns Extracted error message or null
 */
export function extractHtmlErrorMessage(htmlContent: string): string | null {
  try {
    // Try to extract title or error message from HTML
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    const h1Match = htmlContent.match(/<h1>(.*?)<\/h1>/i);
    const errorMsg = titleMatch?.[1] || h1Match?.[1];
    
    if (errorMsg) {
      return `Server error: ${errorMsg}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Generate a unique request ID for tracking
 * @returns A random string to use as request ID
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Safely log objects to console only in development
 */
export function safeConsoleLog(label: string, data: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(label, safeResponseData(data));
  }
}

export function safeConsoleError(label: string, data: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(label, safeResponseData(data));
  }
}

// Add Axios type check for TypeScript
// This needs to be imported from Axios
import axios from 'axios';