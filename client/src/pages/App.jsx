import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaUser, FaRocket, FaChartLine, FaShoppingCart, FaCog, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export default function App({ pushLog }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout } = useAuth();
  
  // Log when the component mounts
  useEffect(() => {
    pushLog('Dashboard page loaded');
  }, [pushLog]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate('/login');
      } else {
        console.error('Failed to log out:', result.error);
        pushLog('Error logging out: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Logout error:', error);
      pushLog('Error during logout: ' + (error.message || 'Unknown error'));
    }
  };

  const navLinks = [
    { to: '/', name: 'Dashboard', icon: <FaRocket className="mr-2" /> },
    { to: '/commerce', name: 'Commerce', icon: <FaShoppingCart className="mr-2" /> },
    { to: '/profile', name: 'Profile', icon: <FaUser className="mr-2" /> },
  ];
  
  // Add Analytics link for admin users
  if (currentUser?.role === 'admin') {
    navLinks.splice(1, 0, { to: '/analytics', name: 'Analytics', icon: <FaChartLine className="mr-2" /> });
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-gray-800 text-white"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white transform ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            CosmosHub
          </h2>
        </div>
        <nav className="mt-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 ${
                location.pathname === link.to ? 'bg-gray-700 text-white' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          {currentUser?.role === 'admin' && (
            <Link
              to="/admin"
              className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 ${
                location.pathname.startsWith('/admin') ? 'bg-gray-700 text-white' : ''
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <FaCog className="mr-2" />
              Admin Panel
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-6 py-3 text-red-400 hover:bg-gray-700 flex items-center"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen">
        {/* Top Navigation */}
        <header 
          className={`fixed top-0 right-0 left-0 md:left-64 bg-white dark:bg-gray-800 shadow-sm z-30 transition-all duration-300 ${
            isScrolled ? 'py-2' : 'py-4'
          }`}
        >
          <div className="px-6 flex justify-between items-center">
            <h1 className="text-xl font-semibold">
              {navLinks.find(link => link.to === location.pathname)?.name || 'Dashboard'}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {currentUser?.displayName || currentUser?.username || 'User'}
              </span>
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white overflow-hidden">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.displayName || currentUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentUser?.displayName || currentUser?.username || 'U').charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-24 pb-8 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Dashboard Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2">Welcome to CosmosHub</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your universal platform for commerce, analytics, and administration.
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-all">
                  Analytics
                </button>
                <button className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-all">
                  New Order
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Activity {item} completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
