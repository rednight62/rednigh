import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation, 
  useNavigate, 
  useSearchParams 
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import './cosmic-bg.css';

// Lazy load components
const App = lazy(() => import('./pages/App'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Commerce = lazy(() => import('./pages/Commerce'));
const TwoFA = lazy(() => import('./pages/TwoFA'));
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback'));
const LoadingSpinner = lazy(() => import('./components/common/LoadingSpinner'));
const CosmicStarfield = lazy(() => import('./components/CosmicStarfield'));

// Enhanced Error Boundary Component with better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught an error:', error);
    return { 
      hasError: true, 
      error,
      componentStack: error.componentStack || null
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary component stack:', errorInfo.componentStack);
    this.setState({ 
      errorInfo,
      // Include the component stack in the error for better debugging
      error: {
        ...error,
        componentStack: errorInfo.componentStack
      }
    });
    
    // You can also log this error to an error reporting service
    // logErrorToService(error, errorInfo);
  }


  renderErrorDetails() {
    const { error, errorInfo } = this.state;
    
    if (!error && !errorInfo) {
      return null;
    }
    
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        borderLeft: '4px solid #ef4444',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '0.25rem',
        overflow: 'auto',
        maxHeight: '50vh'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '500',
            color: '#b91c1c',
            margin: 0
          }}>
            Error Details
          </h3>
          <button
            onClick={() => this.setState({ showDetails: !this.state.showDetails })}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline'
            }}
          >
            {this.state.showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {this.state.showDetails && (
          <pre style={{
            backgroundColor: '#f9fafb',
            padding: '0.75rem',
            borderRadius: '0.25rem',
            overflowX: 'auto',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            color: '#1f2937',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            <strong>Error:</strong> {error?.toString() || 'Unknown error'}
            
            {error?.stack && (
              <>
                <div style={{ margin: '0.5rem 0', height: '1px', backgroundColor: '#e5e7eb' }} />
                <strong>Stack trace:</strong>
                <div style={{ color: '#6b7280' }}>{error.stack}</div>
              </>
            )}
            
            {error?.componentStack && (
              <>
                <div style={{ margin: '0.5rem 0', height: '1px', backgroundColor: '#e5e7eb' }} />
                <strong>Component stack:</strong>
                <div style={{ color: '#6b7280' }}>{error.componentStack}</div>
              </>
            )}
          </pre>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            padding: '2rem',
            width: '100%',
            maxWidth: '640px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#b91c1c',
                marginBottom: '0.5rem'
              }}>
                Oops! Something went wrong
              </h1>
              <p style={{
                color: '#4b5563',
                marginBottom: '1.5rem'
              }}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            
            {this.renderErrorDetails()}
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              marginTop: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                </svg>
                Reload Page
              </button>
              
              <button
                onClick={() => {
                  const errorDetails = {
                    message: this.state.error?.message,
                    stack: this.state.error?.stack,
                    componentStack: this.state.error?.componentStack,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                  };
                  
                  navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
                    .then(() => alert('Error details copied to clipboard'))
                    .catch(() => alert('Failed to copy error details'));
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Error Details
              </button>
              
              <button
                onClick={() => {
                  // You can implement a way to report the error to your backend
                  alert('Error reporting functionality would be implemented here');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#3b82f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                Report Issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const Loader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Wrapper for lazy-loaded components
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<Loader />}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </Suspense>
);

// Custom hook to handle protected routes
const useProtectedRoute = (roles = []) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const checkAuth = useCallback(() => {
    if (isLoading) {
      return { isAuthorized: false, isLoading: true };
    }

    if (!isAuthenticated) {
      return { isAuthorized: false, redirect: '/login', state: { from: location } };
    }

    if (roles.length > 0 && !roles.includes(currentUser?.role)) {
      return { isAuthorized: false, redirect: '/unauthorized' };
    }

    return { isAuthorized: true };
  }, [currentUser, isAuthenticated, isLoading, location, roles]);

  return checkAuth();
};

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthorized, isLoading, redirect, state } = useProtectedRoute(roles);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      navigate(redirect, { replace: true, state });
    }
  }, [isAuthorized, isLoading, navigate, redirect, state]);

  if (isLoading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  return isAuthorized ? children : null;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/unauthorized', { replace: true, state: { from: location } });
    }
  }, [currentUser, navigate, location]);

  return (
    <ProtectedRoute roles={['admin']}>
      {children}
    </ProtectedRoute>
  );
};

// Layout component that includes the Navbar
const AppLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <SuspenseWrapper>
      <CosmicStarfield />
    </SuspenseWrapper>
    <div className="cosmic-slogan">
      <span className="slogan-typewriter">Transcend Commerce. Command the Cosmos.</span>
    </div>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </div>
);

// OAuth Callback Handler Component
const OAuthCallbackHandler = () => {
  const { checkOAuthCallback } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const processOAuth = async () => {
      const success = await checkOAuthCallback();
      if (success) {
        navigate('/');
      } else {
        navigate('/login');
      }
    };
    
    processOAuth();
  }, [checkOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};

// Main App Component
const MainApp = () => {
  const [logs, setLogs] = React.useState([]);
  const pushLog = React.useCallback((msg) => {
    console.log(msg);
    setLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);
  
  const clearLogs = React.useCallback(() => setLogs([]), []);

  // WebSocket: listen for backend events
  React.useEffect(() => {
    const handleEvent = (event) => {
      let msg = '';
      if (event.type === 'commerce' && event.action === 'search') {
        msg = `Real-time: ${event.user || 'User'} searched ${event.provider} for "${event.query}"`;
      } else if (event.type === 'admin' && event.action === 'ai-agent') {
        msg = `Real-time: ${event.user || 'Admin'} used AI Agent (${event.provider})`;
      } else {
        msg = `Real-time event: ${JSON.stringify(event)}`;
      }
      pushLog(msg);
    };

    // Initialize WebSocket connection
    try {
      const { connectWS } = require('./utils/ws');
      connectWS({ onEvent: handleEvent });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      pushLog('WebSocket connection failed: ' + error.message);
    }
    
    return () => {
      // Cleanup WebSocket connection if needed
    };
  }, [pushLog]);

  const renderWithSuspense = (Component) => (
    <Suspense fallback={<LoadingSpinner />}>
      <Component pushLog={pushLog} />
    </Suspense>
  );

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <WebSocketProvider>
            <ToastContainer position="top-right" autoClose={5000} />
            <AppLayout>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={renderWithSuspense(Login)} />
                <Route path="/auth/callback" element={renderWithSuspense(OAuthCallback)} />
                <Route path="/register" element={renderWithSuspense(Register)} />
                <Route path="/2fa" element={renderWithSuspense(TwoFA)} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    {renderWithSuspense(App)}
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    {renderWithSuspense(Profile)}
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <AdminRoute>
                    {renderWithSuspense(Admin)}
                  </AdminRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    {renderWithSuspense(Analytics)}
                  </ProtectedRoute>
                } />
                <Route path="/commerce" element={
                  <ProtectedRoute>
                    {renderWithSuspense(Commerce)}
                  </ProtectedRoute>
                } />
                <Route path="*" element={
                  <Navigate to="/" replace />
                } />
              </Routes>
              
              {/* Debug Info - Only shown in development */}
              {process.env.NODE_ENV === 'development' && (
                renderWithSuspense(DebugInfo)
              )}
              
              {/* User Terminal for Logs */}
              {renderWithSuspense(() => <UserTerminal logs={logs} onClear={clearLogs} />)}
            </AppLayout>
          </WebSocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// Main application wrapper
const AppWrapper = () => {
  return (
    <>
      <MainApp />
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

// Initialize the app container
const initAppContainer = () => {
  let container = document.getElementById('root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  }
  
  // Add debug styles for development
  if (import.meta.env.DEV) {
    container.style.minHeight = '100vh';
    container.style.backgroundColor = '#f0f0f0';
    container.style.padding = '20px';
  }
  
  return container;
};

// Initialize and render the app
const startApp = () => {
  try {
    console.log('[Main] Starting application initialization...');
    
    // 1. Initialize app container
    console.log('[Main] Initializing app container...');
    const appContainer = initAppContainer();
    if (!appContainer) {
      throw new Error('Failed to initialize app container');
    }
    
    // 2. Create root
    console.log('[Main] Creating root...');
    const root = createRoot(appContainer);
    
    // 4. Render the app with error boundary
    console.log('[Main] Rendering application...');
    const AppContent = () => {
      console.log('[Main] Rendering AppContent');
      return (
        <React.StrictMode>
          <ErrorBoundary>
            <Suspense fallback={<div>Loading app...</div>}>
              <AuthProvider>
                <WebSocketProvider>
                  <AppRouter />
                </WebSocketProvider>
              </AuthProvider>
            </Suspense>
          </ErrorBoundary>
        </React.StrictMode>
      );
    };
    
    // 5. Render the app
    root.render(<AppContent />);
    console.log('[Main] Application rendered successfully');
    
  } catch (error) {
    console.error('[Main] Critical error during app initialization:', error);
    
    // Show error in the UI
    const errorContainer = document.createElement('div');
    errorContainer.style.padding = '20px';
    errorContainer.style.color = 'red';
    errorContainer.style.fontFamily = 'monospace';
    errorContainer.style.whiteSpace = 'pre';
    errorContainer.style.backgroundColor = '#fff';
    errorContainer.style.position = 'fixed';
    errorContainer.style.top = '0';
    errorContainer.style.left = '0';
    errorContainer.style.right = '0';
    errorContainer.style.bottom = '0';
    errorContainer.style.overflow = 'auto';
    errorContainer.style.zIndex = '9999';
    
    errorContainer.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #d32f2f; border-bottom: 1px solid #ffcdd2; padding-bottom: 10px;">
          Application Error
        </h1>
        <h2>${error.name || 'Unknown Error'}</h2>
        <p><strong>Message:</strong> ${error.message || 'No error message available'}</p>
        
        ${error.stack ? `
          <div style="margin-top: 20px;">
            <h3>Stack Trace:</h3>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto;">
${error.stack}
            </pre>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p>Environment: ${import.meta.env.MODE || 'development'}</p>
          <p>React version: ${React.version || 'Unknown'}</p>
          <p>Browser: ${navigator.userAgent || 'Unknown'}</p>
          
          <div style="margin-top: 20px;">
            <button 
              onclick="window.location.reload()" 
              style="
                padding: 8px 16px; 
                background: #1976d2; 
                color: white; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer;
                margin-right: 10px;
              "
            >
              Reload Page
            </button>
            
            <button 
              onclick="document.getElementById('debug-info').style.display = 'block'" 
              style="
                padding: 8px 16px; 
                background: #f5f5f5; 
                color: #333; 
                border: 1px solid #ddd; 
                border-radius: 4px; 
                cursor: pointer;
              "
            >
              Show Debug Info
            </button>
            
            <div id="debug-info" style="display: none; margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px;">
              <h3>Debug Information</h3>
              <pre>${JSON.stringify({
                location: window.location.href,
                env: { ...import.meta.env },
                localStorage: { ...localStorage }
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Clear existing content and show error
    document.body.innerHTML = '';
    document.body.appendChild(errorContainer);
    
    // Re-throw to ensure it's visible in the console
    throw error;
  }
};

// Debug information component - can be used in development
const DebugInfo = () => {
  if (import.meta.env.MODE !== 'development') return null;
  
  return React.createElement('div', {
    style: {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }
  },
    React.createElement('div', null, `React: ${React.version}`),
    React.createElement('div', null, `Env: ${import.meta.env.MODE}`),
    React.createElement('div', null, `API: ${import.meta.env.VITE_API_URL || 'Not set'}`)
  );
};

// Start the application
startApp();

// Error boundary for the WebSocket provider
class WebSocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WebSocketErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h1>
            <p className="text-gray-700 mb-4">
              {this.state.error?.message || 'Failed to establish WebSocket connection'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main application component with routing
const AppRouter = () => (
  <Router>
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <AuthProvider>
          <WebSocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              
              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<App />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/commerce" element={<Commerce />} />
                <Route path="/2fa" element={<TwoFA />} />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
              </Route>
              
              {/* 404 - Not Found */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer position="top-right" autoClose={5000} />
          </WebSocketProvider>
        </AuthProvider>
      </Suspense>
    </ErrorBoundary>
  </Router>
);

// The application is now initialized and rendered by startApp()
