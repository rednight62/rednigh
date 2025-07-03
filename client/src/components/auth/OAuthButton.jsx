import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FaGoogle, FaGithub, FaLinkedin, FaTwitter, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { getOAuthUrl } from '../../utils/auth';

const PROVIDERS = {
  google: {
    name: 'Google',
    icon: FaGoogle,
    color: 'bg-red-500 hover:bg-red-600',
    text: 'Continue with Google',
  },
  github: {
    name: 'GitHub',
    icon: FaGithub,
    color: 'bg-gray-800 hover:bg-gray-900',
    text: 'Continue with GitHub',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: FaLinkedin,
    color: 'bg-blue-600 hover:bg-blue-700',
    text: 'Continue with LinkedIn',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: FaTwitter,
    color: 'bg-sky-500 hover:bg-sky-600',
    text: 'Continue with X',
  },
  brave: {
    name: 'Brave',
    icon: FaGoogle, // Brave uses Google OAuth under the hood
    color: 'bg-orange-500 hover:bg-orange-600',
    text: 'Continue with Brave',
  },
};

const OAuthButton = ({ 
  provider, 
  className = '', 
  fullWidth = true,
  size = 'md',
  variant = 'default'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithOAuth } = useAuth();
  const providerConfig = PROVIDERS[provider];

  if (!providerConfig) {
    console.error(`Unsupported OAuth provider: ${provider}`);
    return null;
  }

  const { icon: Icon, color, text, name } = providerConfig;

  const handleClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use the loginWithOAuth from AuthContext
      loginWithOAuth(provider);
    } catch (error) {
      console.error(`Failed to initiate ${name} login:`, error);
      setIsLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  // Variant classes
  const variantClasses = {
    default: `text-white ${color}`,
    outline: `bg-transparent border-2 ${color.replace('bg-', 'border-')} text-${color.split('-')[1]}-600 hover:bg-opacity-10`,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-${color.split('-')[1]}-500 disabled:opacity-70
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : 'w-auto'}
        ${variantClasses[variant] || variantClasses.default}
        ${className}
      `}
      aria-label={`Sign in with ${name}`}
    >
      {isLoading ? (
        <FaSpinner className="animate-spin mr-2" />
      ) : (
        <Icon className="mr-2" />
      )}
      <span>{text}</span>
    </button>
  );
};

OAuthButton.propTypes = {
  provider: PropTypes.oneOf(Object.keys(PROVIDERS)).isRequired,
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['default', 'outline']),
};

export default OAuthButton;
