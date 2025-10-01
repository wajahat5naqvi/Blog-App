/**
 * API service exports file
 * Re-exports all API services for easy imports
 */

import apiClient from './api';
import authService from './authService';
import postService from './postService';

// Export all services
export { apiClient, authService, postService };

// Export default for backward compatibility
export default {
  apiClient,
  authService,
  postService
};