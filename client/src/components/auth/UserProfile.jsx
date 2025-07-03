import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { logout } from '../../utils/auth';

const UserProfile = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4">
      {currentUser.avatar && (
        <img
          className="h-10 w-10 rounded-full"
          src={currentUser.avatar}
          alt={currentUser.displayName || currentUser.username}
        />
      )}
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {currentUser.displayName || currentUser.username}
        </p>
        {currentUser.role === 'admin' && (
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>
      <button
        onClick={logout}
        className="ml-4 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
      >
        Sign out
      </button>
    </div>
  );
};

export default UserProfile;
