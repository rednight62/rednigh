import React from 'react';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ 
  className = '', 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false,
  color = 'indigo-500'
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  const textSizes = {
    xs: 'text-xs mt-1',
    sm: 'text-sm mt-1.5',
    md: 'text-base mt-2',
    lg: 'text-lg mt-3',
    xl: 'text-xl mt-4',
  };

  const spinner = (
    <div 
      className={`animate-spin rounded-full border-t-2 border-b-2 border-${color} ${
        sizeClasses[size] || sizeClasses.md
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span className="sr-only">{text}</span>
    </div>
  );

  const content = (
    <>
      {spinner}
      {text && (
        <span className={`${textSizes[size] || textSizes.md} text-gray-600 dark:text-gray-300`}>
          {text}
        </span>
      )}
    </>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {content}
    </div>
  );
};

LoadingSpinner.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  text: PropTypes.string,
  fullScreen: PropTypes.bool,
  color: PropTypes.string,
};

export default LoadingSpinner;
