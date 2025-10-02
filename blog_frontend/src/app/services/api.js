import axios from 'axios';

// Configure axios instance with base URL and default headers
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach auth token to requests
API.interceptors.request.use((config) => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Post service functions
const postService = {
  getAllPosts: (params = {}) => {
    return API.get('/posts/', { params });
  },
  
  getPostById: (id) => {
    return API.get(`/posts/${id}/`);
  },
  
  getPostBySlug: (slug) => {
    return API.get(`/posts/slug/${slug}/`);
  },
  
  createPost: (postData) => {
    // Use different headers for FormData (multipart/form-data)
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return API.post('/posts/', postData, config);
  },
  
  updatePost: (id, postData) => {
    // If postData is FormData, set appropriate headers
    const isFormData = postData instanceof FormData;
    const config = isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } : {};
    
    return API.put(`/posts/${id}/`, postData, config);
  },
  
  deletePost: (id) => {
    return API.delete(`/posts/${id}/`);
  },
  
  likePost: (id) => {
    return API.post(`/posts/${id}/like/`);
  },
  
  unlikePost: (id) => {
    return API.delete(`/posts/${id}/like/`);
  },
  
  addComment: (postId, commentData) => {
    return API.post(`/posts/${postId}/add_comment/`, commentData);
  },
};

// Category service functions
const categoryService = {
  getAllCategories: () => {
    return API.get('/categories/');
  },
  
  getCategoryById: (id) => {
    return API.get(`/categories/${id}/`);
  },
  
  getCategoryBySlug: (slug) => {
    return API.get(`/categories/slug/${slug}/`);
  },
};

// Tag service functions
const tagService = {
  getAllTags: () => {
    return API.get('/tags/');
  },
  
  getTagById: (id) => {
    return API.get(`/tags/${id}/`);
  },
};

// Authentication service functions
const authService = {
  login: (credentials) => {
    return API.post('/auth/login/', credentials);
  },
  
  register: (userData) => {
    return API.post('/auth/register/', userData);
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // No need for API call if using JWT and storing in localStorage
  },
  
  getCurrentUser: () => {
    return API.get('/auth/me/');
  },
  
  updateProfile: (userData) => {
    const isFormData = userData instanceof FormData;
    const config = isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } : {};
    
    return API.put('/auth/profile/', userData, config);
  },
  
  // Helper method to check if user is authenticated
  isAuthenticated: () => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('token');
    }
    return false;
  },
};

export { API, postService, categoryService, tagService, authService };