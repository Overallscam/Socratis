import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Basic markdown-like parser for the demo to avoid heavy deps
  // Handles bold (**text**) and code blocks (```code```) simple inline code (`code`)
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const codeContent = part.replace(/```/g, '').replace(/^[a-z]+\n/, ''); // Simple cleanup
        return (
          <pre key={index} className="bg-slate-900 text-slate-50 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono shadow-inner">
            <code>{codeContent}</code>
          </pre>
        );
      }
      if (part.startsWith('`')) {
        return (
          <code key={index} className="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-sm font-mono border border-indigo-100">
            {part.replace(/`/g, '')}
          </code>
        );
      }
      if (part.startsWith('**')) {
        return <strong key={index} className="font-bold text-indigo-900">{part.replace(/\*\*/g, '')}</strong>;
      }
      // Handle simple newlines
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Timestamp / Name Label */}
        <span className="text-[10px] text-slate-400 mb-1 px-1">
          {isUser ? 'You' : 'Socratis AI'}
        </span>

        {/* Message Container */}
        <div
          className={`relative px-5 py-4 shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'
              : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
          }`}
        >
          {/* Display Uploaded Image if present */}
          {message.image && (
            <div className="mb-4 rounded-lg overflow-hidden border border-white/20">
              <img 
                src={message.image} 
                alt="Uploaded context" 
                className="max-h-60 w-auto object-cover" 
              />
            </div>
          )}

          {/* Text Content */}
          <div className={`text-base leading-relaxed ${isUser ? 'text-indigo-50' : ''}`}>
            {renderContent(message.text)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;