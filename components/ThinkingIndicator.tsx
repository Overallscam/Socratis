import React from 'react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 p-4 bg-white/50 rounded-2xl rounded-tl-none w-fit animate-pulse border border-indigo-100">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">Thinking Deeply</span>
    </div>
  );
};

export default ThinkingIndicator;