import axios from 'axios';

// For local development, force HTTP to avoid SSL issues
const isLocalhost = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.startsWith('192.168.');

// Use explicit localhost for development to avoid potential DNS resolution issues
const API_URL = isLocalhost 
  ? 'http://localhost:5000/api' 
  : import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with base URL and headers
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for sending cookies with requests
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., token expired)
      localStorage.removeItem('token');
      // Only redirect if not on login or register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Login with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - User data
 */
export const login = async (username, password) => {
  try {
    console.log('Attempting login with:', { username });
    const response = await api.post('/auth/login', { username, password });
    console.log('Login response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.msg || 'Login failed');
    }
    
    const { token, user } = response.data;
    if (token) {
      localStorage.setItem('token', token);
      console.log('Token saved to localStorage');
    }
    
    return user || response.data.user || { username };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.msg || 'Login failed. Please check your credentials and try again.');
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registered user data
 */
export const register = async (userData) => {
  try {
    console.log('Attempting registration with:', { 
      username: userData.username,
      email: userData.email || `${userData.username}@example.com`
    });
    
    const response = await api.post('/auth/register', {
      username: userData.username,
      password: userData.password,
      email: userData.email || `${userData.username}@example.com`
    });
    
    console.log('Registration response:', response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.msg || 'Registration failed');
    }
    
    const { token, user } = response.data;
    if (token) {
      localStorage.setItem('token', token);
      console.log('Token saved to localStorage after registration');
    }
    
    return user || { username: userData.username, email: userData.email };
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.msg || 
      error.message || 
      'Registration failed. Please try again.'
    );
  }
};

/**
 * Logout the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
    // Continue with logout even if the server request fails
  } finally {
    localStorage.removeItem('token');
  }
};

/**
 * Get the currently authenticated user
 * @returns {Promise<Object|null>} - Current user data or null if not authenticated
 */
export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await api.get('/auth/me');
    return response.data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      return null;
    }
    console.error('Failed to fetch current user:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Handle OAuth callback from provider
 * @param {string} provider - OAuth provider (google, github, etc.)
 * @returns {Promise<Object>} - User data
 */
export const handleOAuthCallback = async (provider) => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  const state = params.get('state');

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (!code) {
    throw new Error('No authorization code found');
  }

  try {
    const response = await api.get(`/api/oauth/${provider}/callback?code=${code}&state=${state || ''}`);
    const { token, user } = response.data;
    if (token) {
      localStorage.setItem('token', token);
    }
    return user;
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw error;
  }
};

/**
 * Get OAuth login URL for a provider
 * @param {string} provider - OAuth provider (google, github, etc.)
 * @returns {string} - OAuth login URL
 */
export const getOAuthUrl = (provider) => {
  return `${API_URL}/api/oauth/${provider}`;
};

/**
 * Initiate OAuth login flow
 * @param {string} provider - OAuth provider (google, github, etc.)
 */
export const loginWithOAuth = (provider) => {
  window.location.href = getOAuthUrl(provider);
};

export default api;
