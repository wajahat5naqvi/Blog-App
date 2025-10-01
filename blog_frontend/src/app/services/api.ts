'use client';

import axios from 'axios';

const API_URL = 'http://127.0.0.1:9000/api';

/**
 * Generate user-friendly error messages based on HTTP status codes and response data
 */
const getUserFriendlyErrorMessage = (error: any): string => {
  // Use our parser to get a consistent error format
  const { message } = parseApiError(error);
  
  // Context-specific overrides can be added here
  if (axios.isAxiosError(error)) {
    // For authentication routes, customize messages
    const url = error.config?.url || '';
    
    if (url.includes('/token/') && error.response?.status === 401) {
      return 'Invalid username or password.';
    }
    
    // For sensitive operations
    if ((url.includes('/password/') || url.includes('/delete/')) && 
        error.response?.status === 403) {
      return 'This action requires recent authentication. Please log in again.';
    }
  }
  
  return message;
};

/**
 * Safely handle API response data - ensures it's not undefined and can be properly logged
 * @param data Response data from API 
 * @param emptyMessage Message to return if data is empty
 * @returns Either the response data object or a placeholder object if empty
 */
const safeResponseData = (data: any, emptyMessage = '{empty response body}'): any => {
  // If data is undefined or null, return empty message as object
  if (data === undefined || data === null) {
    return typeof emptyMessage === 'string' ? { message: emptyMessage } : emptyMessage;
  }
  
  // If data is an object with no keys, return empty message as object
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
    return typeof emptyMessage === 'string' ? { message: emptyMessage } : emptyMessage;
  }
  
  // Otherwise return the data as-is
  return data;
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Safe functions to access localStorage (only on client)
const getLocalStorage = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorage = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

/**
 * Get the auth token with validation
 * @returns The JWT token or null if not available/valid
 */
/**
 * Parse error response from Django REST Framework
 * Handles empty response bodies and various error formats
 */
const parseApiError = (error: any): { message: string; details: Record<string, string>; contextInfo: Record<string, any> } => {
  const result = {
    message: 'An unexpected error occurred',
    details: {},
    contextInfo: {
      requestId: Math.random().toString(36).substring(2, 10), // Generate a unique ID for tracking this error
      timestamp: new Date().toISOString()
    } as Record<string, any> // Additional context information for debugging
  };

  if (!axios.isAxiosError(error)) {
    result.message = error.message || 'Unknown error';
    return result;
  }
  
  const { response, config } = error;
  
  // Collect request context information regardless of error type
  Object.assign(result.contextInfo, {
    url: config?.url || 'Unknown URL',
    method: config?.method?.toUpperCase() || 'Unknown Method',
    responseStatus: response?.status || 'No Status'
  });
  
  // No response - network error
  if (!response) {
    result.message = 'Network error. Please check your internet connection.';
    return result;
  }

  // Empty response body case
  if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
    // Generate a request ID for tracking this error through logs
    const requestId = result.contextInfo.requestId;
    console.error(`[${requestId}] Error: No details provided by server`, { 
      status: response.status,
      statusText: response.statusText ?? 'No status text' 
    });
    
    // Provide meaningful messages based on status code and context
    const url = config?.url || 'Unknown URL';
    const method = (config?.method || 'unknown').toUpperCase();
    
    // Special handling for FormData uploads with empty response (common with image uploads)
    const contentType = config?.headers?.['Content-Type'];
    const isFormDataRequest = config?.data instanceof FormData || 
                             (contentType && typeof contentType === 'string' && contentType.includes('multipart/form-data'));
    
    // Add context to help with debugging
    result.contextInfo.isFormData = isFormDataRequest;
    result.contextInfo.contentType = contentType || 'Not specified';
    result.contextInfo.url = url;
    result.contextInfo.method = method;
    
    switch (response.status) {
      case 400:
        result.message = isFormDataRequest
          ? 'Invalid form data. Please check image formats and file sizes.'
          : 'Invalid request data';
        break;
      case 401:
        result.message = 'Authentication required';
        break;
      case 403:
        result.message = 'Permission denied';
        break;
      case 404:
        result.message = 'Resource not found';
        break;
      case 500:
        result.message = isFormDataRequest
          ? 'Server error processing your upload. Please check file formats and sizes.'
          : 'Server error. Please try again later';
        break;
      case 502:
      case 503:
        result.message = 'Server error. Please try again later';
        break;
      default:
        result.message = `Server error: Please check logs. (${method} ${response.status} ${response.statusText || 'Unknown'})`;
    }
    return result;
  }
  
  // Handle DRF error format with data
  const { data } = response;
  
  if (typeof data === 'string') {
    // Direct string error
    result.message = data;
  } else if (typeof data === 'object') {
    // Object with field errors
    let errorMessage = '';
    const details: Record<string, string> = {};

    Object.entries(data).forEach(([field, value]) => {
      let fieldValue: string;
      
      if (Array.isArray(value)) {
        fieldValue = value.join(' ');
      } else if (typeof value === 'string') {
        fieldValue = value;
      } else {
        fieldValue = JSON.stringify(value);
      }
      
      details[field] = fieldValue;
      
      // Special handling for non-field errors
      if (field === 'non_field_errors' || field === 'detail') {
        errorMessage = fieldValue;
      }
    });

    result.details = details;
    
    // If we found a main error message, use it
    if (errorMessage) {
      result.message = errorMessage;
    } else {
      // Otherwise create a message from all field errors
      result.message = Object.entries(details)
        .map(([field, message]) => `${field}: ${message}`)
        .join('; ');
    }
  }
  
  return result;
};

const getAuthToken = (): string | null => {
  const token = getLocalStorage('token');
  
  if (!token) {
    console.warn('No token found in localStorage');
    return null;
  }
  
  // Basic validation - ensure token isn't obviously invalid
  // JWT tokens are base64url encoded strings separated by dots, typically 3 parts
  if (!token.includes('.') || token.split('.').length !== 3) {
    console.error('Token format is invalid');
    removeLocalStorage('token');
    return null;
  }
  
  return token;
};

// Add request interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    // Use our validated token getter
    const token = getAuthToken();
    
    // Ensure headers object exists
    config.headers = config.headers || {};
    
    // Set Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        // Log API request (safely)
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        
        // Log headers being sent (excluding Authorization for security)
        const logHeaders = {...config.headers};
        if (logHeaders.Authorization) {
          logHeaders.Authorization = 'Bearer [MASKED]';
        }
        console.log('Request headers:', logHeaders);
      }
    } else {
      // Only warn about missing token for endpoints that likely need authentication
      const authRequiredEndpoints = ['/posts/', '/profile/', '/comments/', '/like/'];
      const needsAuth = authRequiredEndpoints.some(endpoint => 
        config.url?.includes(endpoint) && 
        config.method !== 'get'
      );
      
      if (needsAuth) {
        console.warn('No valid token available for authenticated request:', config.url);
      }
    }
    
    // Special handling for FormData - DO NOT set Content-Type manually
    // Axios will automatically set it with the correct boundary
    if (config.data instanceof FormData) {
      console.log('FormData request detected - ensuring proper Content-Type handling');
      // Ensure we're not overriding the auto-generated Content-Type
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors with improved error handling
api.interceptors.response.use(
  (response) => {
    // Success case - log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Success [${response.config.method?.toUpperCase()}] ${response.config.url}:`, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Enhanced error logging with fallbacks for empty/missing fields
    const errorDetails = {
      url: originalRequest?.url || 'Unknown URL',
      method: originalRequest?.method?.toUpperCase() || 'Unknown Method',
      status: error.response?.status || 'No Status',
      statusText: error.response?.statusText || 'Unknown Status',
      // Ensure data is always available in some form
      data: error.response?.data 
        ? (typeof error.response.data === 'object' && Object.keys(error.response.data).length === 0
            ? 'Empty response body {}'
            : error.response.data)
        : 'No response data',
      message: error.message || 'Unknown error',
      // Include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
    
    // Always log these critical details regardless of error type
    const now = new Date().toISOString();
    const requestIdentifier = Math.random().toString(36).substring(2, 10);
    
    // Structured console logging for better debugging
    console.group(`🔴 API Error [${requestIdentifier}] - ${now}`);
    console.error(`${errorDetails.method} ${errorDetails.url} - ${errorDetails.status} ${errorDetails.statusText}`);
    console.error('Error message:', errorDetails.message);
    
    // Special handling for empty response data
    if (!error.response?.data || 
        (typeof error.response?.data === 'object' && Object.keys(error.response?.data).length === 0)) {
      console.error('⚠️ Empty response data {}. Server did not provide error details.');
      
      // Attempt to extract information from the response
      const contentType = error.response?.headers?.['content-type'];
      const statusText = error.response?.statusText || 'Unknown Error';
      const responseText = error.response?.request?.responseText;
      
      // Log all available information for debugging
      console.error('Response context:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        contentType: contentType || 'Unknown',
        responseText: responseText?.substring(0, 500) || 'No response text available',
        endpoint: originalRequest?.url || 'Unknown',
        method: originalRequest?.method || 'Unknown',
        requestContentType: originalRequest?.headers?.['Content-Type'] || 'Not specified',
        dataType: originalRequest?.data instanceof FormData ? 'FormData' : typeof originalRequest?.data,
      });
      
      // If we have HTML or text response, try to extract meaningful information
      if (contentType && contentType.includes('text/html') && responseText) {
        console.error('HTML response detected, extracting information');
        try {
          // Try to extract title or error message from HTML
          const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
          const h1Match = responseText.match(/<h1>(.*?)<\/h1>/i);
          const errorMsg = titleMatch?.[1] || h1Match?.[1] || 'Server returned HTML error page';
          
          // Update error details for better display
          errorDetails.data = {
            detail: [`Server error: ${errorMsg}`],
            html_response: true,
            status_text: statusText
          };
          console.error('Extracted error from HTML:', errorMsg);
        } catch (parseError) {
          console.error('Error parsing HTML response:', parseError);
        }
      } else if (contentType && contentType.includes('text/plain') && responseText) {
        // For plain text responses
        errorDetails.data = {
          detail: [responseText.substring(0, 500)],
          text_response: true,
          status_text: statusText
        };
      } else {
        // For empty JSON responses, generate a descriptive message
        errorDetails.data = {
          detail: [`Server error (${error.response?.status || '?'}): ${statusText}`],
          empty_response: true
        };
      }
    } else {
      // Always log response data as an object, never undefined or a string
      const responseData = error.response?.data ?? { message: 'Empty response body' };
      console.error('Response data:', 
        typeof responseData === 'object' ? responseData : { value: responseData });
    }
    
    // Log FormData contents if present (especially useful for image uploads)
    if (originalRequest?.data instanceof FormData) {
      console.group('FormData contents:');
      for (const [key, value] of originalRequest.data.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File: ${value.name} (${value.type}, ${Math.round(value.size/1024)}KB)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      console.groupEnd();
    }
    
    // Log request details that might be helpful
    console.log('Request details:', {
      headers: originalRequest?.headers,
      baseURL: originalRequest?.baseURL,
      timeout: originalRequest?.timeout,
      params: originalRequest?.params
    });
    console.groupEnd();
    
    // Create a standardized error object that can be used by UI components
    const enhancedError = {
      ...error,
      isApiError: true,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      // Provide a user-friendly message based on status code
      userMessage: getUserFriendlyErrorMessage(error),
      // Include original error details
      errorDetails,
      // Timestamp for debugging
      timestamp: new Date().toISOString()
    };
    
    // If the error is 401 (Unauthorized) and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('Attempting to refresh token...');
      
      try {
        // Try to refresh the token
        const refreshToken = getLocalStorage('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access: newToken } = response.data;
          console.log('Token refreshed successfully');
          
          // Update stored token
          setLocalStorage('token', newToken);
          
          // Update Authorization header and retry
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } else {
          console.error('No refresh token available');
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        // Clear tokens on refresh failure
        removeLocalStorage('token');
        removeLocalStorage('refreshToken');
        
        // Redirect to login if window is available
        if (typeof window !== 'undefined') {
          // Use more user-friendly approach with session expiry notification
          if (!window.location.pathname.includes('/auth/login')) {
            window.location.href = '/auth/login?expired=true';
          }
        }
        
        return Promise.reject({
          ...enhancedError,
          refreshFailed: true,
          userMessage: 'Authentication session expired. Please log in again.'
        });
      }
    }
    
    // Return the enhanced error object to make it more useful for UI components
    return Promise.reject(enhancedError);
  }
);

// Auth services
export const authService = {
  register: async (username: string, email: string, password: string) => {
    try {
      return await api.post('/register/', { username, email, password });
    } catch (error) {
      console.error('Registration error:', error);
      
      // Extract and enhance error message
      let errorMsg = 'Registration failed';
      if (axios.isAxiosError(error) && error.response?.data) {
        // Format Django REST Framework validation errors
        const data = error.response.data;
        if (typeof data === 'object') {
          errorMsg = Object.entries(data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`)
            .join('; ');
        } else if (typeof data === 'string') {
          errorMsg = data;
        }
      }
      
      throw new Error(errorMsg);
    }
  },
  
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/token/', { username, password });
      
      // If login successful, store tokens immediately in api service
      if (response.data && response.data.access) {
        setLocalStorage('token', response.data.access);
        if (response.data.refresh) {
          setLocalStorage('refreshToken', response.data.refresh);
        }
      }
      
      return response;
    } catch (error: any) {
      console.group('Login Error');
      console.error('Login failed:', error);
      
      // Enhanced logging for empty response bodies which is our specific issue
      if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status ?? 'No status');
        console.error('Status Text:', error.response?.statusText ?? 'No status text');
        
        // Explicitly check for empty response body
        if (!error.response?.data || 
            (typeof error.response.data === 'object' && 
             Object.keys(error.response.data).length === 0)) {
          console.error('Empty response body detected. See full error:', {
            config: error.config ?? 'No config',
            message: error.message ?? 'No message',
            code: error.code ?? 'No code',
            url: error.config?.url ?? 'Unknown URL',
            method: error.config?.method?.toUpperCase() ?? 'Unknown method'
          });
        } else {
          // Always log as an object, never undefined or a string
          const responseData = error.response?.data ?? { message: 'Empty response body' };
          console.error('Response data:', 
            typeof responseData === 'object' ? responseData : { value: responseData });
        }
      } else {
        console.error('Non-Axios error:', {
          message: error.message ?? 'Unknown error',
          stack: error.stack ?? 'No stack trace'
        });
      }
      console.groupEnd();
      
      // Use our parser to get a consistent error format
      const { message, details } = parseApiError(error);
      
      // For login errors specifically, we might want to customize messages further
      let finalMessage = message;
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        finalMessage = 'Invalid username or password';
      } else if (axios.isAxiosError(error) && error.response?.status === 400) {
        // For 400 errors on login, we generally want to say:
        finalMessage = 'Invalid login information';
        
        // Unless we have specific field errors
        if (details.username) finalMessage = details.username;
        if (details.password) finalMessage = details.password;
        if (details.non_field_errors) finalMessage = details.non_field_errors;
      }
      
      // Create an enhanced error object with details for UI
      const enhancedError = new Error(finalMessage);
      (enhancedError as any).details = details;
      (enhancedError as any).originalError = error;
      (enhancedError as any).status = axios.isAxiosError(error) ? error.response?.status : null;
      
      throw enhancedError;
    }
  },
  logout: async () => {
    try {
      const refreshToken = getLocalStorage('refreshToken');
      
      // Clear tokens first for immediate effect
      removeLocalStorage('token');
      removeLocalStorage('refreshToken');
      
      // Then notify server (but don't wait for response)
      if (refreshToken) {
        api.post('/logout/', { refresh: refreshToken })
          .catch(error => console.warn('Logout API error:', error));
      }
      
      return Promise.resolve({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear tokens even if API call fails
      removeLocalStorage('token');
      removeLocalStorage('refreshToken');
      return Promise.resolve({ success: true, apiError: true });
    }
  },
  
  refreshToken: async () => {
    try {
      const refreshToken = getLocalStorage('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/token/refresh/', { refresh: refreshToken });
      
      if (response.data && response.data.access) {
        setLocalStorage('token', response.data.access);
        return response;
      } else {
        throw new Error('Invalid response from refresh token endpoint');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens on refresh failure
      removeLocalStorage('token');
      removeLocalStorage('refreshToken');
      throw error;
    }
  },
};

// Post services
export const postService = {
  getAllPosts: async () => {
    return api.get('/posts/');
  },
  getPostById: async (id: string) => {
    return api.get(`/posts/${id}/`);
  },
  createPost: async (postData: FormData) => {
    // Get validated token
    const token = getAuthToken();
    if (!token) {
      return {
        status: 401,
        data: { detail: 'Authentication required. Please log in again.' },
        headers: {},
        config: {},
        statusText: 'Unauthorized'
      };
    }
    
    // Generate a request ID for tracking this submission through logs
    const requestId = Math.random().toString(36).substring(2, 10);
    // Create a clean FormData instance to ensure proper formatting
    const cleanedFormData = new FormData();
    
    try {
      console.group(`🚀 Creating post [${requestId}]`);
      
      // Extract and validate required fields
      const title = postData.get('title');
      const content = postData.get('content');
      
      if (!title || typeof title !== 'string' || !title.trim()) {
        console.error(`[${requestId}] Missing required field: title`);
        console.groupEnd();
        return {
          status: 400,
          data: { title: ['Title is required'] },
          headers: {},
          config: {},
          statusText: 'Bad Request'
        };
      }
      
      if (!content || typeof content !== 'string' || !content.trim()) {
        console.error(`[${requestId}] Missing required field: content`);
        console.groupEnd();
        return {
          status: 400,
          data: { content: ['Content is required'] },
          headers: {},
          config: {},
          statusText: 'Bad Request'
        };
      }
      
      // Add required fields
      cleanedFormData.append('title', title.trim());
      cleanedFormData.append('content', content.trim());
      
      // Handle tags - ensure they are properly formatted for DRF
      // Extract all tags (there might be multiple entries with the same name)
      const tags = [];
      for (const [key, value] of postData.entries()) {
        if (key === 'tags' && typeof value === 'string' && value.trim()) {
          tags.push(value.trim());
        }
      }
      
      // Add tags individually to match Django's list expectation
      tags.forEach(tag => {
        cleanedFormData.append('tags', tag);
      });
      
      // Handle image if present
      const featuredImage = postData.get('featured_image');
      if (featuredImage instanceof File && featuredImage.size > 0) {
        try {
          // Validate image before sending
          if (featuredImage.size > 5 * 1024 * 1024) { // 5MB limit
            throw new Error(`Image too large: ${Math.round(featuredImage.size/1024/1024)}MB (max 5MB)`);
          }
          
          const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!validTypes.includes(featuredImage.type)) {
            throw new Error(`Invalid image type: ${featuredImage.type}. Allowed: JPEG, PNG, GIF, WebP`);
          }
          
          cleanedFormData.append('featured_image', featuredImage);
          console.log(`[${requestId}] Image validation passed: ${featuredImage.name}`);
        } catch (error: any) {
          const imgError = error instanceof Error ? error.message : 'Invalid image format or size';
          console.error(`[${requestId}] Image validation failed:`, imgError);
          console.groupEnd();
          return {
            status: 400,
            data: { featured_image: [imgError] },
            headers: {},
            config: {},
            statusText: 'Bad Request'
          };
        }
      }
      
      // Log what we're sending with request ID for correlation
      console.log(`[${requestId}] FormData entries being sent to API:`);
      for (const [key, value] of cleanedFormData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File: ${value.name} (${value.type}, ${Math.round(value.size/1024)}KB)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      // Add a retry mechanism for file uploads
      const maxRetries = 2;
      let retries = 0;
      let response: any = {
        status: 500,
        statusText: 'Unknown Error',
        data: {},
        headers: {},
        config: {}
      };
      
      while (retries <= maxRetries) {
        try {
          // Use a direct axios call with explicit error handling
          response = await axios({
            method: 'post',
            url: `${API_URL}/posts/`,
            data: cleanedFormData,
            headers: {
              'Authorization': `Bearer ${token}`,
              // Important: Don't set Content-Type manually for FormData
              // Let axios set it automatically with the correct boundary
            },
            timeout: retries === 0 ? 30000 : 60000, // Increase timeout for retries
            validateStatus: null, // Don't throw on any status code
            onUploadProgress: (progressEvent) => {
              // Optional: Track upload progress for large files
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`Upload progress: ${percentCompleted}%`);
              }
            },
            // Important: Disable any request transformations that might interfere with FormData
            transformRequest: [(data) => {
              // Don't transform FormData
              return data;
            }],
          });
          
          // If we get a success response or a validation error (not server error), break the retry loop
          if (response.status < 500) {
            break;
          }
          
          // If we got a 500 error but have retries left, continue
          retries++;
          console.log(`Retry ${retries}/${maxRetries} for post creation after server error`);
        } catch (networkErr) {
          // Handle network errors (not HTTP status errors)
          console.error(`Network error on attempt ${retries + 1}/${maxRetries + 1}:`, networkErr);
          
          if (retries < maxRetries) {
            retries++;
            console.log(`Retry ${retries}/${maxRetries} for post creation after network error`);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // If we're out of retries, throw the network error to be caught by the outer try-catch
            // Ensure it has a message property for consistent error handling
            const errorMessage = networkErr instanceof Error 
              ? networkErr.message || 'Network error during post creation'
              : 'Connection failed while creating post';
            
            throw new Error(errorMessage);
          }
        }
      }

      // Log response for debugging with request ID for correlation
      console.log(`[${requestId}] Create post response: ${response.status} ${response.statusText}`);
      
      // Handle response based on status code
      if (response.status === 201) {
        // Success case (201 Created)
        console.log(`[${requestId}] Post created successfully:`, response.data);
        
        // Verify that we have an actual response body with an ID
        if (!response.data || typeof response.data !== 'object' || !response.data.id) {
          console.error(`[${requestId}] Server returned success but with empty or invalid response body`);
          
          // If we get a success status but with invalid data, throw an error
          throw {
            message: 'Server returned success but with incomplete data. The post may not have been created properly.',
            details: response.data || {},
            requestId
          };
        }
      } else if (response.status >= 400) {
        // Error handling for 4xx and 5xx responses
        
        // Check for empty response data or non-object response
        if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
          console.error(`[${requestId}] Error: No details provided by server`);
          
          // Get the response content type and raw response text if available
          const contentType = response.headers?.['content-type'] || '';
          let responseText = '';
          
          // Try to extract raw response text if available
          try {
            if (response.request?.responseText) {
              responseText = response.request.responseText;
              console.log(`[${requestId}] Raw response text:`, responseText.substring(0, 500));
            }
          } catch (parseErr) {
            console.error(`[${requestId}] Error extracting raw response:`, parseErr);
          }
          
          // Generate appropriate fallback message based on status and context
          const fallbackMessages: Record<number, string> = {
            400: 'Invalid post data. Please check your input and try again.',
            401: 'Authentication required. Please log in again.',
            403: 'You don\'t have permission to create posts.',
            404: 'API endpoint not found.',
            413: 'Uploaded file too large. Maximum file size is 5MB.',
            415: 'Unsupported media type. Please use JPEG, PNG, GIF or WebP images.',
            500: 'Server error processing your post. Please try again later.',
          };
          
          // Use fallback message or generic one
          const fallbackMessage = fallbackMessages[response.status] || 
                                `Server error (${response.status}): Please check server logs`;
          
          // Create a standardized error response
          response.data = {
            detail: [fallbackMessage],
            message: fallbackMessage, // Ensure there's always a message property
            _error_context: {
              method: response.config?.method || 'unknown',
              url: response.config?.url || 'unknown',
              status: response.status,
              statusText: response.statusText,
              contentType: contentType,
              responseSnippet: responseText.substring(0, 200) || undefined,
              requestId
            }
          };
          
          // If we have HTML or text content, try to extract meaningful information
          if (contentType.includes('text/html') && responseText) {
            try {
              // Try to extract title or error message from HTML
              const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
              const h1Match = responseText.match(/<h1>(.*?)<\/h1>/i);
              const errorMsg = titleMatch?.[1] || h1Match?.[1];
              
              if (errorMsg) {
                const formattedError = `Server error: ${errorMsg}`;
                response.data.detail = [formattedError];
                response.data.message = formattedError; // Ensure message property exists
                response.data.html_error = errorMsg;
              }
            } catch (parseErr) {
              console.error(`[${requestId}] Error parsing HTML response:`, parseErr);
            }
          } else if (contentType.includes('text/plain') && responseText) {
            // For plain text error messages
            const plainTextError = responseText.substring(0, 500);
            response.data.detail = [plainTextError];
            response.data.message = plainTextError; // Ensure message property exists
            response.data.text_error = true;
          }
          
          console.log(`[${requestId}] Using fallback error message:`, fallbackMessage);
        } else {
          // Comprehensive try/catch block for safely processing response data
          try {
            // Create safe representation of response data for logging
            const safeResponseData = (() => {
              // Handle undefined or null response data
              if (response?.data === undefined || response?.data === null) {
                return { message: 'Empty response body' };
              }
              
              // Handle empty object response data
              if (typeof response.data === 'object' && !Array.isArray(response.data) && 
                  Object.keys(response.data).length === 0) {
                return { message: 'Empty response body (empty object)' };
              }
              
              // Handle string response data (convert to object)
              if (typeof response.data === 'string') {
                return { value: response.data, _isStringValue: true };
              }
              
              // Return original object data
              return response.data;
            })();
            
            // Always log response data as an object, never undefined or a string
            console.error(`[${requestId}] Error response data:`, safeResponseData);
            
            // Special handling for Django REST Framework validation errors (status 400)
            if (response.status === 400 && response.data) {
              // Create container for formatted validation errors
              const formattedErrors: Record<string, string[]> = {};
              
              // Only process if response data is an object
              if (typeof response.data === 'object' && response.data !== null) {
                // Process DRF field-level validation errors
                Object.entries(response.data).forEach(([field, errors]) => {
                  // Format different error types consistently
                  if (Array.isArray(errors)) {
                    // Already an array of error messages
                    formattedErrors[field] = errors as string[];
                  } else if (typeof errors === 'string') {
                    // Single error message as string
                    formattedErrors[field] = [errors];
                  } else if (typeof errors === 'object' && errors !== null) {
                    // Nested serializer errors or other objects
                    formattedErrors[field] = ['Invalid data'];
                    
                    // Add original value as debug info if available
                    try {
                      const errorStr = JSON.stringify(errors);
                      if (errorStr) {
                        formattedErrors[`${field}_debug`] = [errorStr];
                      }
                    } catch (e) {
                      // Ignore stringify errors
                    }
                  } else {
                    // Fallback for any other type
                    formattedErrors[field] = [`Invalid value: ${String(errors)}`];
                  }
                });
                
                // Add detailed request context for debugging
                (formattedErrors as any)._error_context = {
                  requestId,
                  timestamp: new Date().toISOString(),
                  endpoint: `${API_URL}/posts/`,
                  status: response.status,
                  statusText: response.statusText ?? 'No status text',
                  method: 'POST',
                  hasImage: Boolean(postData.get('featured_image'))
                };
                
                // Log the formatted validation errors
                console.error(`[${requestId}] Formatted validation errors:`, formattedErrors);
                
                // Replace original data with our better formatted version
                response.data = formattedErrors;
              }
            }
          } catch (parseError) {
            // Safe error logging for any unexpected errors during response processing
            console.error(`[${requestId}] Error safely processing response data:`, {
              message: parseError instanceof Error ? parseError.message : 'Unknown error',
              stack: parseError instanceof Error ? parseError.stack : undefined,
              responseStatus: response?.status,
              responseStatusText: response?.statusText,
              // Include safe stringified version of data if possible
              originalData: (() => {
                try {
                  return response?.data ? 
                    (typeof response.data === 'object' ? 
                      JSON.stringify(response.data).substring(0, 500) : 
                      String(response.data).substring(0, 500)) :
                    'null or undefined';
                } catch (e) {
                  return 'Error stringifying response data';
                }
              })()
            });
            
            // Ensure response.data is always a safe object even after error
            response.data = response.data || { 
              message: 'Error processing response data',
              _error_processing: true,
              requestId
            };
            
            // If response.data is not an object, make it one
            if (typeof response.data !== 'object' || response.data === null) {
              const originalValue = response.data;
              response.data = { 
                message: 'Non-object response data',
                originalValue: originalValue !== undefined ? String(originalValue) : 'undefined',
                requestId
              };
            }
          }
        }

        // Now that we've processed the error response, throw a standardized error object
        if (response.data.errors) {
          const errorDetails = response.data.errors;
          // Try to get a good error message from the response
          let errorMessage = 'Failed to create post. Please check form for errors.';
          
          // If there's a detail field, use that as the main error message
          if (errorDetails.detail && Array.isArray(errorDetails.detail) && errorDetails.detail.length > 0) {
            errorMessage = errorDetails.detail[0];
          } else if (errorDetails.non_field_errors && Array.isArray(errorDetails.non_field_errors) && errorDetails.non_field_errors.length > 0) {
            // Use non_field_errors as fallback if no detail field
            errorMessage = errorDetails.non_field_errors[0];
          }
          
          // Include error_type for debugging if available
          const errorTypeInfo = response.data.error_type ? { error_type: response.data.error_type } : {};
          
          throw { 
            message: errorMessage,
            details: errorDetails,
            requestId,
            status: response.status,
            ...errorTypeInfo
          };
        } else {
          // For backward compatibility with older error formats
          throw { 
            message: response.data.detail || response.data.message || 'Failed to create post',
            details: response.data,
            requestId,
            status: response.status
          };
        }
      }
      
      // Close the request log group
      console.groupEnd();
      
      return response;
    } catch (err: any) {
      // This will only catch network errors or thrown errors from above
      console.error(`[${requestId}] Error in createPost service:`, err ?? { message: 'Unknown error (undefined err)' });
      console.groupEnd(); // Close the request log group
      
      // Check if this is our own thrown error object with message and details
      if (err && typeof err === 'object' && 'message' in err) {
        // Return our standardized error format
        return {
          status: err.status || 0,
          data: { 
            detail: [err.message],
            message: err.message,
            ...(err.details ? { errors: err.details } : {}),
            requestId: err.requestId || requestId
          },
          headers: {},
          config: {},
          statusText: err.statusText || 'Error'
        };
      }
      
      // Otherwise, extract useful information from the error
      const errorDetails = {
        message: err?.message || 'Unknown error',
        code: err?.code || 'UNKNOWN_ERROR',
        name: err?.name || 'Error'
      };
      
      // Log detailed information about FormData if present
      if (cleanedFormData) {
        try {
          const formDataEntries: Record<string, string> = {};
          for (const [key, value] of cleanedFormData.entries()) {
            if (value instanceof File) {
              formDataEntries[key] = `File: ${value.name} (${value.type}, ${value.size} bytes)`;
            } else {
              formDataEntries[key] = typeof value === 'string' ? 
                (value.length > 100 ? `${value.substring(0, 100)}...` : value) : 
                String(value);
            }
          }
          console.log(`[${requestId}] FormData contents for failed request:`, formDataEntries);
        } catch (logError) {
          // Safely log error handling issues
          const errorMsg = logError instanceof Error ? logError.message : 'Unknown error logging FormData';
          console.error(`[${requestId}] Error logging FormData:`, { message: errorMsg });
        }
      }
      
      // For network errors, return a standardized error response
      const errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
      
      // Return a standardized error response object with more details
      return {
        status: 0,
        data: { 
          detail: [errorMessage],
          message: errorMessage,
          errors: {
            connection: ['Unable to connect to the server']
          },
          // Add more debug info
          code: errorDetails.code,
          name: errorDetails.name,
          requestId: requestId
        },
        headers: {},
        config: {},
        statusText: 'Network Error'
      };
    }
  },
  updatePost: async (id: string, postData: FormData) => {
    // Get validated token
    const token = getAuthToken();
    if (!token) {
      return {
        status: 401,
        data: { detail: 'Authentication required. Please log in again.' },
        headers: {},
        config: {},
        statusText: 'Unauthorized'
      };
    }
    
    try {
      // Log FormData entries for debugging (exclude large file content)
      console.log('FormData entries for update:');
      for (const [key, value] of postData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File: ${value.name} (${value.type}, ${Math.round(value.size/1024)}KB)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      // Use a direct axios call with explicit error handling
      const response = await axios({
        method: 'put',
        url: `${API_URL}/posts/${id}/`,
        data: postData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Important: Don't set Content-Type manually for FormData
        },
        timeout: 30000, // 30 seconds
        validateStatus: null, // Don't throw on any status code
      });

      // Log response for debugging
      console.log(`Update post response: ${response.status} ${response.statusText}`);
      if (response.status >= 400) {
        // Always log as an object, never undefined or a string
        const responseData = response?.data ?? { message: 'Empty response body' };
        console.error('Error response data:', 
          typeof responseData === 'object' ? responseData : { value: responseData });
      }
      
      return response;
    } catch (err: any) {
      // This will only catch network errors
      console.error('Network error in updatePost service:', err);
      
      // Return a standardized error response object
      return {
        status: 0,
        data: { 
          detail: 'Network error: Unable to connect to the server',
          message: err.message
        },
        headers: {},
        config: {},
        statusText: 'Network Error'
      };
    }
  },
  deletePost: async (id: string) => {
    return api.delete(`/posts/${id}/`);
  },
  likePost: async (id: string) => {
    return api.post(`/posts/${id}/like/`);
  },
  unlikePost: async (id: string) => {
    return api.delete(`/posts/${id}/like/`);
  },
  getComments: async (postId: string) => {
    return api.get(`/posts/${postId}/comments/`);
  },
  addComment: async (postId: string, content: string, parentId?: string) => {
    const data = { content };
    if (parentId) {
      Object.assign(data, { parent: parentId });
    }
    return api.post(`/posts/${postId}/add_comment/`, data);
  },
};

// Profile services
export const profileService = {
  getProfile: async () => {
    return api.get('/profile/');
  },
  updateProfile: async (profileData: FormData) => {
    // Get validated token
    const token = getAuthToken();
    if (!token) {
      return {
        status: 401,
        data: { detail: 'Authentication required. Please log in again.' },
        headers: {},
        config: {},
        statusText: 'Unauthorized'
      };
    }
    
    try {
      // Log FormData entries for debugging (exclude large file content)
      console.log('Profile update FormData:');
      for (const [key, value] of profileData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File: ${value.name} (${value.type}, ${Math.round(value.size/1024)}KB)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      // Use a direct axios call with explicit error handling
      const response = await axios({
        method: 'put',
        url: `${API_URL}/profile/`,
        data: profileData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Important: Don't set Content-Type manually for FormData
        },
        timeout: 30000, // 30 seconds
        validateStatus: null, // Don't throw on any status code
      });

      // Log response for debugging
      console.log(`Update profile response: ${response.status} ${response.statusText}`);
      if (response.status >= 400) {
        // Always log as an object, never undefined or a string
        const responseData = response?.data ?? { message: 'Empty response body' };
        console.error('Profile update error data:', 
          typeof responseData === 'object' ? responseData : { value: responseData });
      }
      
      return response;
    } catch (err: any) {
      // This will only catch network errors
      console.error('Network error in updateProfile service:', err);
      
      // Return a standardized error response object
      return {
        status: 0,
        data: { 
          detail: 'Network error: Unable to connect to the server',
          message: err.message
        },
        headers: {},
        config: {},
        statusText: 'Network Error'
      };
    }
  },
  getUserPosts: async (username: string) => {
    return api.get(`/posts/?author=${username}`);
  },
};

export default api;