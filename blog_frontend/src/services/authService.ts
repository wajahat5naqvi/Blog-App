/**
 * Authentication Service
 * Handles user login, registration, token refresh, and auth state management
 */

import apiClient from './api';
import { 
  getLocalStorage, 
  setLocalStorage, 
  removeLocalStorage 
} from '../utils/storageService';
import { generateRequestId, safeConsoleError } from '../utils/errorHelpers';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirm_password?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  dateJoined?: string;
}

// Storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';

/**
 * Get the current authentication token from storage
 * @returns The access token or null if not authenticated
 */
export function getAuthToken(): string | null {
  return getLocalStorage<string>(ACCESS_TOKEN_KEY);
}

/**
 * Check if the user is currently authenticated
 * @returns Boolean indicating if valid auth token exists
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Get the current authenticated user data
 * @returns User data or null if not authenticated
 */
export function getCurrentUser(): AuthUser | null {
  return getLocalStorage<AuthUser>(USER_DATA_KEY);
}

/**
 * Store authentication data
 * @param tokens Token data to store
 * @param userData User data to store
 */
function storeAuthData(tokens: AuthTokens, userData?: AuthUser): void {
  setLocalStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
  setLocalStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
  
  if (userData) {
    setLocalStorage(USER_DATA_KEY, userData);
  }
}

/**
 * Clear all authentication data from storage
 */
function clearAuthData(): void {
  removeLocalStorage(ACCESS_TOKEN_KEY);
  removeLocalStorage(REFRESH_TOKEN_KEY);
  removeLocalStorage(USER_DATA_KEY);
}

/**
 * Register a new user account
 * @param registerData User registration data
 * @returns Promise with the API response
 */
export async function register(registerData: RegisterData) {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.post('/auth/register/', registerData);
    
    return {
      success: true,
      data: response.data,
      message: 'Registration successful!'
    };
  } catch (error) {
    safeConsoleError(`[${requestId}] Registration error:`, error);
    throw error;
  }
}

/**
 * Log in a user with email and password
 * @param credentials Login credentials
 * @returns Promise with user data and tokens
 */
export async function login(credentials: LoginCredentials) {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.post('/auth/login/', credentials);
    
    if (response.data && response.data.access) {
      // Store tokens and user data
      const tokens: AuthTokens = {
        accessToken: response.data.access,
        refreshToken: response.data.refresh,
        expiresIn: response.data.expires_in
      };
      
      storeAuthData(tokens, response.data.user);
      
      return {
        success: true,
        user: response.data.user,
        tokens,
        message: 'Login successful!'
      };
    } else {
      throw new Error('Invalid response format from login endpoint');
    }
  } catch (error) {
    safeConsoleError(`[${requestId}] Login error:`, error);
    throw error;
  }
}

/**
 * Log out the current user
 * @param serverSide Whether to notify the server about the logout
 * @returns Promise that resolves when logout completes
 */
export async function logout(serverSide: boolean = true): Promise<void> {
  const requestId = generateRequestId();
  
  try {
    // Only call the API if serverSide is true and running in browser
    if (serverSide && typeof window !== 'undefined') {
      const refreshToken = getLocalStorage<string>(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          // Attempt to invalidate the token on server
          await apiClient.post('/auth/logout/', { refresh_token: refreshToken });
        } catch (logoutError) {
          // Log but continue with client-side logout
          safeConsoleError(`[${requestId}] Server logout error:`, logoutError);
        }
      }
    }
  } finally {
    // Always clear local auth data regardless of server response
    clearAuthData();
  }
}

/**
 * Refresh the access token using the refresh token
 * @returns Promise with new tokens or null if refresh failed
 */
export async function refreshTokens(): Promise<AuthTokens | null> {
  const requestId = generateRequestId();
  const refreshToken = getLocalStorage<string>(REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await apiClient.post('/auth/refresh/', {
      refresh: refreshToken
    });
    
    if (response.data && response.data.access) {
      // Update stored tokens
      const tokens: AuthTokens = {
        accessToken: response.data.access,
        refreshToken: response.data.refresh || refreshToken, // Some implementations don't return a new refresh token
        expiresIn: response.data.expires_in
      };
      
      setLocalStorage(ACCESS_TOKEN_KEY, tokens.accessToken);
      if (response.data.refresh) {
        setLocalStorage(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
      
      return tokens;
    }
    
    return null;
  } catch (error) {
    safeConsoleError(`[${requestId}] Token refresh error:`, error);
    // Clear auth data on refresh failure
    clearAuthData();
    return null;
  }
}

/**
 * Verify current token is valid
 * @returns Promise with boolean indicating if token is valid
 */
export async function verifyToken(): Promise<boolean> {
  const token = getAuthToken();
  
  if (!token) {
    return false;
  }
  
  try {
    const response = await apiClient.post('/auth/verify/', { token });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Get user profile data
 * @returns Promise with user profile data
 */
export async function getUserProfile() {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.get('/auth/profile/');
    
    if (response.data) {
      // Update stored user data
      setLocalStorage(USER_DATA_KEY, response.data);
      
      return {
        success: true,
        user: response.data
      };
    }
    
    throw new Error('Invalid response format from profile endpoint');
  } catch (error) {
    safeConsoleError(`[${requestId}] Get profile error:`, error);
    throw error;
  }
}

/**
 * Update user profile data
 * @param profileData Profile data to update
 * @returns Promise with updated user data
 */
export async function updateUserProfile(profileData: Partial<AuthUser>) {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.patch('/auth/profile/', profileData);
    
    if (response.data) {
      // Update stored user data
      const currentUser = getCurrentUser();
      const updatedUser = { ...currentUser, ...response.data };
      setLocalStorage(USER_DATA_KEY, updatedUser);
      
      return {
        success: true,
        user: updatedUser
      };
    }
    
    throw new Error('Invalid response format from profile update endpoint');
  } catch (error) {
    safeConsoleError(`[${requestId}] Update profile error:`, error);
    throw error;
  }
}

/**
 * Change user password
 * @param currentPassword Current password
 * @param newPassword New password
 * @returns Promise with the result
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.post('/auth/change-password/', {
      current_password: currentPassword,
      new_password: newPassword
    });
    
    return {
      success: true,
      message: response.data?.message || 'Password changed successfully!'
    };
  } catch (error) {
    safeConsoleError(`[${requestId}] Password change error:`, error);
    throw error;
  }
}

// Auth service object
const authService = {
  login,
  register,
  logout,
  refreshTokens,
  verifyToken,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  isAuthenticated,
  getAuthToken
};

export default authService;