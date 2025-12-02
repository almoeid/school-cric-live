import React from 'react';
import { getInitials } from '../utils/helpers';

const TeamLogo = ({ name, color, logo, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl" // Added for Tournament Header
  };

  const dims = sizeClasses[size] || sizeClasses.md;

  if (logo) {
    return (
      <img 
        src={logo} 
        alt={name} 
        className={`${dims} rounded-full object-cover shadow-sm border-2 border-white bg-white shrink-0`} 
      />
    );
  }

  return (
    <div 
      className={`${dims} rounded-full flex items-center justify-center font-bold text-white shadow-sm border-2 border-white shrink-0`}
      style={{ backgroundColor: color || '#10B981' }}
    >
      {getInitials(name)}
    </div>
  );
};

export default TeamLogo;