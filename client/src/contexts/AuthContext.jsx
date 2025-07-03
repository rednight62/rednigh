import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as authLogin, 
  register as authRegister, 
  logout as authLogout, 
  getCurrentUser,
  handleOAuthCallback
} from '../utils/auth';
import * as wsUtils from '../utils/ws';
import api from '../utils/auth'; // Import the api instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  console.log('[AuthProvider] Initializing AuthProvider');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Function to check OAuth callback that can be called from a component with route context
  const checkOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    
    if (error) {
      setError(decodeURIComponent(error));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return false;
    }

    if (token) {
      try {
        localStorage.setItem('token', token);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Get user data
        await fetchCurrentUser();
        return true;
      } catch (err) {
        console.error('OAuth callback failed:', err);
        setError('Failed to complete OAuth login');
        return false;
      }
    }
    return false;
  }, []);

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      return user;
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError('Failed to load user data');
      return null;
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

  // Login with username/password
  const login = async (credentials) => {
    console.log('[AuthProvider] Login attempt with credentials:', { 
      username: credentials.username,
      hasPassword: !!credentials.password 
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const user = await authLogin(credentials.username, credentials.password);
      console.log('Login successful, user:', user);
      
      // Fetch the complete user data after successful login
      const fullUser = await fetchCurrentUser();
      setCurrentUser(fullUser || user);
      
      return { 
        success: true, 
        user: fullUser || user,
        message: 'Login successful!'
      };
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (userData) => {
    console.log('[AuthProvider] Registration attempt with data:', {
      username: userData.username,
      email: userData.email,
      hasPassword: !!userData.password
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const user = await authRegister({
        username: userData.username,
        password: userData.password,
        email: userData.email
      });
      
      console.log('Registration successful, user:', user);
      
      // Fetch the complete user data after successful registration
      const fullUser = await fetchCurrentUser();
      setCurrentUser(fullUser || user);
      
      return { 
        success: true, 
        user: fullUser || user,
        message: 'Registration successful! You can now log in.'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = useCallback(() => {
    console.log('[AuthProvider] Logging out user');
    try {
      // Close WebSocket connection
      wsUtils.closeWS();
      
      // Clear auth state
      authLogout();
      setCurrentUser(null);
      setError(null);
      
      // Reconnect WebSocket as guest
      wsUtils.connectWS({
        onEvent: (event) => {
          console.log('[WebSocket] Guest event:', event);
        },
        onError: (error) => {
          console.error('[WebSocket] Error:', error);
        }
      });
      
      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      const errorMessage = err.response?.data?.message || 'Failed to log out';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Handle OAuth login
  const loginWithOAuth = useCallback((provider) => {
    try {
      console.log(`[AuthProvider] Initiating OAuth login with ${provider}`);
      if (!provider) {
        throw new Error('No OAuth provider specified');
      }
      
      // Get the base API URL and ensure it has a trailing slash
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      if (!baseUrl) {
        throw new Error('API URL is not configured');
      }
      
      // Redirect to the server's OAuth endpoint with redirect_uri pointing back to the frontend
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
      window.location.href = `${baseUrl}/oauth/${provider}?redirect_uri=${redirectUri}`;
      return { success: true };
    } catch (error) {
      console.error('OAuth login error:', error);
      setError(error.message || 'Failed to initiate OAuth login');
      return { success: false, error: error.message };
    }
  }, [setError]);

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to request password reset');
    }
  };

  // Verify password reset token
  const verifyPasswordResetToken = async (token) => {
    try {
      await api.get(`/auth/reset-password/verify?token=${token}`);
      return { valid: true };
    } catch (error) {
      console.error('Password reset token verification failed:', error);
      throw new Error(error.response?.data?.message || 'Invalid or expired reset token');
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      return { success: true };
    } catch (error) {
      console.error('Password reset failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  // Memoize all functions that are passed to context with proper dependencies
  const loginMemoized = useCallback(login, [fetchCurrentUser]);
  const registerMemoized = useCallback(register, [fetchCurrentUser]);
  const logoutMemoized = useCallback(logout, []);
  const loginWithOAuthMemoized = useCallback(loginWithOAuth, []);
  const requestPasswordResetMemoized = useCallback(requestPasswordReset, []);
  const verifyPasswordResetTokenMemoized = useCallback(verifyPasswordResetToken, []);
  const resetPasswordMemoized = useCallback(resetPassword, []);
  const checkOAuthCallbackMemoized = useCallback(checkOAuthCallback, [fetchCurrentUser]);
  const setErrorMemoized = useCallback((error) => setError(error), []);

  // Check for token in URL on initial load
  useEffect(() => {
    console.log('[AuthProvider] Checking for token in URL');
    const checkAuth = async () => {
      if (localStorage.getItem('token')) {
        await fetchCurrentUser();
      } else {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [fetchCurrentUser]);

  // Initial auth check and WebSocket setup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await fetchCurrentUser();
        
        // Initialize WebSocket connection after successful auth
        if (user) {
          wsUtils.connectWS({
            onEvent: (event) => {
              console.log('[WebSocket] Event:', event);
              // Handle any global WebSocket events here
            },
            onError: (error) => {
              console.error('[WebSocket] Error:', error);
              setError(error.message || 'WebSocket connection error');
            }
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Initialize WebSocket connection even if not authenticated
        wsUtils.connectWS({
          onEvent: (event) => {
            console.log('[WebSocket] Guest event:', event);
          },
          onError: (error) => {
            console.error('[WebSocket] Error:', error);
          }
        });
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
    
    // Cleanup WebSocket on unmount
    return () => {
      wsUtils.closeWS();
    };
  }, [fetchCurrentUser]);

  const value = {
    currentUser,
    loading,
    error,
    authChecked,
    login: loginMemoized,
    register: registerMemoized,
    logout: logoutMemoized,
    loginWithOAuth: loginWithOAuthMemoized,
    requestPasswordReset: requestPasswordResetMemoized,
    verifyPasswordResetToken: verifyPasswordResetTokenMemoized,
    resetPassword: resetPasswordMemoized,
    checkOAuthCallback: checkOAuthCallbackMemoized,
    setError: setErrorMemoized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
