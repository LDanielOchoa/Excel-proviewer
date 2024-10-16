import React from 'react';

export const Progress = ({ value, className }) => {
  return (
    <div className={`w-full h-2 bg-gray-300 rounded-full ${className}`}>
      <div
        style={{ width: `${value}%` }}
        className="h-full bg-green-500 rounded-full transition-all duration-300"
      ></div>
    </div>
  );
};
