import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }

        if (!token) {
          throw new Error('No authentication token received');
        }

        // Store the token
        localStorage.setItem('token', token);
        
        // Fetch user data
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setCurrentUser(userData);
        
        // Redirect to dashboard or intended URL
        const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
        localStorage.removeItem('redirectAfterLogin');
        
        toast.success('Successfully logged in!');
        navigate(redirectTo);
        
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Failed to complete authentication');
        toast.error(err.message || 'Authentication failed. Please try again.');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    processOAuthCallback();
  }, [token, errorParam, navigate, setCurrentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-700">Completing authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;
