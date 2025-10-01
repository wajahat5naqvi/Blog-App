/**
 * Post Service
 * Handles all post-related API operations including create, read, update, delete
 */

import apiClient, { ApiResponse } from './api';
import { getAuthToken } from './authService';
import { generateRequestId, safeConsoleError, safeConsoleLog } from '../utils/errorHelpers';

// Types
export interface Post {
  id: string;
  title: string;
  content: string;
  featured_image?: string;
  author: {
    id: string;
    username: string;
    email?: string;
  };
  tags: string[];
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  is_liked_by_user?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  post: string;
  created_at: string;
  parent?: string;
  replies?: Comment[];
}

export interface PostsParams {
  page?: number;
  page_size?: number;
  search?: string;
  author?: string;
  tags?: string[];
  ordering?: string;
}

/**
 * Validates post data before submission
 * @param formData Form data to validate
 * @returns Error object if validation fails, null otherwise
 */
function validatePostData(formData: FormData): { field: string, error: string } | null {
  const title = formData.get('title');
  const content = formData.get('content');
  
  if (!title || typeof title !== 'string' || !title.trim()) {
    return { field: 'title', error: 'Title is required' };
  }
  
  if (!content || typeof content !== 'string' || !content.trim()) {
    return { field: 'content', error: 'Content is required' };
  }
  
  const featuredImage = formData.get('featured_image');
  if (featuredImage instanceof File && featuredImage.size > 0) {
    if (featuredImage.size > 5 * 1024 * 1024) {
      return { 
        field: 'featured_image', 
        error: `Image too large: ${Math.round(featuredImage.size/1024/1024)}MB (max 5MB)` 
      };
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(featuredImage.type)) {
      return {
        field: 'featured_image',
        error: `Invalid image type: ${featuredImage.type}. Allowed: JPEG, PNG, GIF, WebP`
      };
    }
  }
  
  return null;
}

/**
 * Clean and prepare form data for submission
 * @param formData Original form data
 * @returns Cleaned form data
 */
function prepareFormData(formData: FormData): FormData {
  const cleanedFormData = new FormData();
  
  // Add required fields
  const title = formData.get('title');
  const content = formData.get('content');
  
  if (title && typeof title === 'string') {
    cleanedFormData.append('title', title.trim());
  }
  
  if (content && typeof content === 'string') {
    cleanedFormData.append('content', content.trim());
  }
  
  // Handle tags - ensure they are properly formatted for DRF
  const tags: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'tags' && typeof value === 'string' && value.trim()) {
      tags.push(value.trim());
    }
  }
  
  // Add tags individually to match Django's list expectation
  tags.forEach(tag => {
    cleanedFormData.append('tags', tag);
  });
  
  // Handle image if present
  const featuredImage = formData.get('featured_image');
  if (featuredImage instanceof File && featuredImage.size > 0) {
    cleanedFormData.append('featured_image', featuredImage);
  }
  
  return cleanedFormData;
}

/**
 * Get all posts with optional filtering
 * @param params Query parameters for filtering and pagination
 * @returns Promise with post data
 */
async function getAllPosts(params: PostsParams = {}): Promise<ApiResponse<Post[]>> {
  const requestId = generateRequestId();
  
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    // Add filtering parameters
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    if (params.author) {
      queryParams.append('author', params.author);
    }
    
    if (params.tags && params.tags.length) {
      params.tags.forEach(tag => {
        queryParams.append('tags', tag);
      });
    }
    
    if (params.ordering) {
      queryParams.append('ordering', params.ordering);
    }
    
    // Make the API request
    const url = `/posts/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error fetching posts:`, error);
    throw error;
  }
}

/**
 * Get a single post by ID
 * @param id Post ID
 * @returns Promise with post data
 */
async function getPost(id: string): Promise<ApiResponse<Post>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.get(`/posts/${id}/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error fetching post ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new blog post
 * @param postData Form data with post content
 * @returns Promise with created post data
 */
async function createPost(postData: FormData): Promise<ApiResponse<Post>> {
  // Get validated token
  const token = getAuthToken();
  if (!token) {
    return {
      status: 401,
      data: { detail: 'Authentication required. Please log in again.' } as any,
      headers: {},
      config: {},
      statusText: 'Unauthorized'
    };
  }
  
  // Generate a request ID for tracking this submission through logs
  const requestId = generateRequestId();
  
  try {
    safeConsoleLog(`🚀 Creating post [${requestId}]`, {});
    
    // Validate required fields
    const validationError = validatePostData(postData);
    if (validationError) {
      safeConsoleError(`[${requestId}] Missing required field: ${validationError.field}`, {});
      
      return {
        status: 400,
        data: { [validationError.field]: [validationError.error] } as any,
        headers: {},
        config: {},
        statusText: 'Bad Request'
      };
    }
    
    // Create a clean FormData instance to ensure proper formatting
    const cleanedFormData = prepareFormData(postData);
    
    // Log what we're sending with request ID for correlation
    if (process.env.NODE_ENV === 'development') {
      safeConsoleLog(`[${requestId}] FormData entries being sent to API:`, {});
      for (const [key, value] of cleanedFormData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File: ${value.name} (${value.type}, ${Math.round(value.size/1024)}KB)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
    }
    
    // Add a retry mechanism for file uploads
    const maxRetries = 2;
    let retries = 0;
    let response: ApiResponse<Post> = {
      status: 500,
      statusText: 'Unknown Error',
      data: {} as Post,
      headers: {},
      config: {}
    };
    
    while (retries <= maxRetries) {
      try {
        // Use a direct axios call with explicit error handling
        response = await apiClient({
          method: 'post',
          url: `/posts/`,
          data: cleanedFormData,
          headers: {
            'Authorization': `Bearer ${token}`,
            // Important: Don't set Content-Type manually for FormData
          },
          timeout: retries === 0 ? 30000 : 60000, // Increase timeout for retries
          onUploadProgress: (progressEvent) => {
            // Track upload progress for large files
            if (progressEvent.total && process.env.NODE_ENV === 'development') {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload progress: ${percentCompleted}%`);
            }
          },
          // Important: Disable any request transformations that might interfere with FormData
          transformRequest: [(data) => data],
        });
        
        // If we get a success response or a validation error (not server error), break the retry loop
        if (response.status < 500) {
          break;
        }
        
        // If we got a 500 error but have retries left, continue
        retries++;
        safeConsoleLog(`Retry ${retries}/${maxRetries} for post creation after server error`, {});
      } catch (networkErr: any) {
        // Handle network errors (not HTTP status errors)
        safeConsoleError(`Network error on attempt ${retries + 1}/${maxRetries + 1}:`, networkErr);
        
        if (retries < maxRetries) {
          retries++;
          safeConsoleLog(`Retry ${retries}/${maxRetries} for post creation after network error`, {});
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
    safeConsoleLog(`[${requestId}] Create post response: ${response.status} ${response.statusText}`, {});
    
    // Handle response based on status code
    if (response.status === 201) {
      // Success case (201 Created)
      safeConsoleLog(`[${requestId}] Post created successfully:`, response.data);
      
      // Verify that we have an actual response body with an ID
      if (!response.data || typeof response.data !== 'object' || !response.data.id) {
        safeConsoleError(`[${requestId}] Server returned success but with empty or invalid response body`, {});
        
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
        safeConsoleError(`[${requestId}] Error: No details provided by server`, {});
        
        // Get the response content type and raw response text if available
        const contentType = response.headers?.['content-type'] || '';
        let responseText = '';
        
        // Try to extract raw response text if available
        try {
          if ((response as any).request?.responseText) {
            responseText = (response as any).request.responseText;
            safeConsoleLog(`[${requestId}] Raw response text:`, responseText.substring(0, 500));
          }
        } catch (parseErr) {
          safeConsoleError(`[${requestId}] Error extracting raw response:`, parseErr);
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
            method: (response.config as any)?.method || 'unknown',
            url: (response.config as any)?.url || 'unknown',
            status: response.status,
            statusText: response.statusText,
            contentType: contentType,
            responseSnippet: responseText.substring(0, 200) || undefined,
            requestId
          }
        } as any;
        
        // If we have HTML or text content, try to extract meaningful information
        if (contentType.includes('text/html') && responseText) {
          try {
            // Try to extract title or error message from HTML
            const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
            const h1Match = responseText.match(/<h1>(.*?)<\/h1>/i);
            const errorMsg = titleMatch?.[1] || h1Match?.[1];
            
            if (errorMsg) {
              const formattedError = `Server error: ${errorMsg}`;
              (response.data as any).detail = [formattedError];
              (response.data as any).message = formattedError; // Ensure message property exists
              (response.data as any).html_error = errorMsg;
            }
          } catch (parseErr) {
            safeConsoleError(`[${requestId}] Error parsing HTML response:`, parseErr);
          }
        } else if (contentType.includes('text/plain') && responseText) {
          // For plain text error messages
          const plainTextError = responseText.substring(0, 500);
          (response.data as any).detail = [plainTextError];
          (response.data as any).message = plainTextError; // Ensure message property exists
          (response.data as any).text_error = true;
        }
        
        safeConsoleLog(`[${requestId}] Using fallback error message:`, fallbackMessage);
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
          safeConsoleError(`[${requestId}] Error response data:`, safeResponseData);
          
          // Special handling for Django REST Framework validation errors (status 400)
          if (response.status === 400 && response.data) {
            // Create container for formatted validation errors
            const formattedErrors: Record<string, string[]> = {};
            
            // Only process if response data is an object
            if (typeof response.data === 'object' && response.data !== null) {
              // Process DRF field-level validation errors
              Object.entries(response.data as Record<string, any>).forEach(([field, errors]) => {
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
                endpoint: `/posts/`,
                status: response.status,
                statusText: response.statusText ?? 'No status text',
                method: 'POST',
                hasImage: Boolean(postData.get('featured_image'))
              };
              
              // Log the formatted validation errors
              safeConsoleError(`[${requestId}] Formatted validation errors:`, formattedErrors);
              
              // Replace original data with our better formatted version
              response.data = formattedErrors as any;
            }
          }
        } catch (parseError) {
          // Safe error logging for any unexpected errors during response processing
          safeConsoleError(`[${requestId}] Error safely processing response data:`, {
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
          } as any;
          
          // If response.data is not an object, make it one
          if (typeof response.data !== 'object' || response.data === null) {
            const originalValue = response.data;
            response.data = { 
              message: 'Non-object response data',
              originalValue: originalValue !== undefined ? String(originalValue) : 'undefined',
              requestId
            } as any;
          }
        }
      }

      // Now that we've processed the error response, throw a standardized error object
      if ((response.data as any).errors) {
        const errorDetails = (response.data as any).errors;
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
        const errorTypeInfo = (response.data as any).error_type ? { error_type: (response.data as any).error_type } : {};
        
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
          message: (response.data as any).detail || (response.data as any).message || 'Failed to create post',
          details: response.data,
          requestId,
          status: response.status
        };
      }
    }
    
    return response;
  } catch (err: any) {
    // This will only catch network errors or thrown errors from above
    safeConsoleError(`[${requestId}] Error in createPost service:`, err ?? { message: 'Unknown error (undefined err)' });
    
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
        } as any,
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
        safeConsoleLog(`[${requestId}] FormData contents for failed request:`, formDataEntries);
      } catch (logError) {
        // Safely log error handling issues
        const errorMsg = logError instanceof Error ? logError.message : 'Unknown error logging FormData';
        safeConsoleError(`[${requestId}] Error logging FormData:`, { message: errorMsg });
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
      } as any,
      headers: {},
      config: {},
      statusText: 'Network Error'
    };
  }
}

/**
 * Update an existing post
 * @param id Post ID
 * @param postData Form data with updated content
 * @returns Promise with updated post data
 */
async function updatePost(id: string, postData: FormData): Promise<ApiResponse<Post>> {
  // Get validated token
  const token = getAuthToken();
  if (!token) {
    return {
      status: 401,
      data: { detail: 'Authentication required. Please log in again.' } as any,
      headers: {},
      config: {},
      statusText: 'Unauthorized'
    };
  }
  
  const requestId = generateRequestId();
  
  try {
    // Validate form data
    const validationError = validatePostData(postData);
    if (validationError) {
      return {
        status: 400,
        data: { [validationError.field]: [validationError.error] } as any,
        headers: {},
        config: {},
        statusText: 'Bad Request'
      };
    }
    
    // Clean form data
    const cleanedFormData = prepareFormData(postData);
    
    // Make API request
    const response = await apiClient({
      method: 'patch',
      url: `/posts/${id}/`,
      data: cleanedFormData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error updating post ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a post
 * @param id Post ID
 * @returns Promise with deletion result
 */
async function deletePost(id: string): Promise<ApiResponse<void>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.delete(`/posts/${id}/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error deleting post ${id}:`, error);
    throw error;
  }
}

/**
 * Like a post
 * @param id Post ID
 * @returns Promise with updated like status
 */
async function likePost(id: string): Promise<ApiResponse<{ liked: boolean }>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.post(`/posts/${id}/like/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error liking post ${id}:`, error);
    throw error;
  }
}

/**
 * Unlike a post
 * @param id Post ID
 * @returns Promise with updated like status
 */
async function unlikePost(id: string): Promise<ApiResponse<{ liked: boolean }>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.post(`/posts/${id}/unlike/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error unliking post ${id}:`, error);
    throw error;
  }
}

/**
 * Get comments for a post
 * @param postId Post ID
 * @returns Promise with comments data
 */
async function getComments(postId: string): Promise<ApiResponse<Comment[]>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.get(`/posts/${postId}/comments/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error fetching comments for post ${postId}:`, error);
    throw error;
  }
}

/**
 * Add a comment to a post
 * @param postId Post ID
 * @param content Comment content
 * @param parentId Optional parent comment ID for replies
 * @returns Promise with created comment data
 */
async function addComment(
  postId: string, 
  content: string, 
  parentId?: string
): Promise<ApiResponse<Comment>> {
  const requestId = generateRequestId();
  
  try {
    const payload: { content: string; parent?: string } = { content };
    
    if (parentId) {
      payload.parent = parentId;
    }
    
    const response = await apiClient.post(`/posts/${postId}/comments/`, payload);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error adding comment to post ${postId}:`, error);
    throw error;
  }
}

/**
 * Delete a comment
 * @param postId Post ID
 * @param commentId Comment ID
 * @returns Promise with deletion result
 */
async function deleteComment(postId: string, commentId: string): Promise<ApiResponse<void>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.delete(`/posts/${postId}/comments/${commentId}/`);
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error deleting comment ${commentId}:`, error);
    throw error;
  }
}

/**
 * Get popular tags
 * @returns Promise with tags data
 */
async function getTags(): Promise<ApiResponse<{ id: string, name: string, count: number }[]>> {
  const requestId = generateRequestId();
  
  try {
    const response = await apiClient.get('/tags/');
    return response;
  } catch (error) {
    safeConsoleError(`[${requestId}] Error fetching tags:`, error);
    throw error;
  }
}

// Post service object
const postService = {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  getTags
};

export default postService;