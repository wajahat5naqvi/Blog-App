/**
 * API client configuration
 * Sets up Axios instance with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { refreshTokens } from './authService';
import { getLocalStorage } from '../utils/storageService';
import { parseApiError, safeConsoleError } from '../utils/errorHelpers';

// Environment variables with fallbacks
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

// Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
}

// Create base axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Keep track of if we're currently refreshing the token to prevent multiple refreshes
let isRefreshing = false;
// Store pending requests to retry after token refresh
let pendingRequests: Array<{
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Avoid adding auth headers to auth-related endpoints
    const isAuthEndpoint = config.url?.includes('/auth/');
    
    if (!isAuthEndpoint) {
      const authToken = getLocalStorage<string>('accessToken');
      if (authToken) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh and error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Extract request config that failed
    const originalRequest = error.config;
    
    // Check if there's a valid response and config
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }
    
    // Handle 401 errors with token refresh
    if (error.response.status === 401 && 
        !originalRequest.url?.includes('/auth/refresh/') && 
        !originalRequest._retry) {
      
      // Mark this request for retry
      originalRequest._retry = true;
      
      // If we're not already refreshing the token
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          // Attempt to refresh the token
          const refreshResult = await refreshTokens();
          
          if (refreshResult && refreshResult.accessToken) {
            // Update the authorization header
            originalRequest.headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
            
            // Process all pending requests with new token
            pendingRequests.forEach(request => {
              request.config.headers['Authorization'] = `Bearer ${refreshResult.accessToken}`;
              request.resolve(apiClient(request.config));
            });
            
            // Clear pending requests
            pendingRequests = [];
            
            // Retry the original request with new token
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // Reject all pending requests
          pendingRequests.forEach(request => {
            request.reject(refreshError);
          });
          
          // Clear pending requests
          pendingRequests = [];
          
          // Log and handle refresh failure
          safeConsoleError('Token refresh failed:', refreshError);
          
          // Redirect to login if running in browser
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login?expired=true';
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            config: originalRequest,
            resolve,
            reject
          });
        });
      }
    }
    
    // Parse and enhance error before returning
    const parsedError = parseApiError(error);
    return Promise.reject(parsedError);
  }
);

export default apiClient;