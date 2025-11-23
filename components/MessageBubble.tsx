
import React from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Custom Table Renderer Component
  const renderTable = (tableText: string, key: number) => {
    const rows = tableText.trim().split('\n');
    if (rows.length < 2) return <pre key={key} className="text-xs">{tableText}</pre>;

    const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
    // Row 1 is usually separation |---|---|
    const dataRows = rows.slice(2).map(row => 
      row.split('|').filter((c, i) => i > 0 || c.trim() !== '').map(c => c.trim())
    );

    return (
      <div key={key} className="my-4 overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {dataRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                {row.map((cell, i) => (
                  <td key={i} className="px-4 py-2 border-r border-slate-100 last:border-0">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Parser to handle Markdown, Tables, and Code Blocks
  const renderContent = (text: string) => {
    // 1. Split by Code Blocks first to preserve them
    const codeBlocks = text.split(/(```[\s\S]*?```)/g);

    return codeBlocks.map((block, blockIndex) => {
      // If it's a code block
      if (block.startsWith('```')) {
        const content = block.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
        return (
          <pre key={`code-${blockIndex}`} className="bg-slate-900 text-slate-50 p-4 rounded-lg my-3 overflow-x-auto text-xs sm:text-sm font-mono shadow-inner border border-slate-700">
            <code>{content}</code>
          </pre>
        );
      }

      // 2. If it's normal text, split into paragraphs to find tables
      // We look for patterns that look like tables (lines starting with |)
      const parts = block.split(/(\n\|.*\|\n\|[-:| ]+\|\n(?:\|.*\|\n?)*)/g);

      return parts.map((part, partIndex) => {
        // Check if this part is a table
        if (part.trim().startsWith('|') && part.includes('|---')) {
          return renderTable(part, blockIndex * 100 + partIndex);
        }

        // 3. Normal Text Parsing (Bold, Inline Code)
        // Split by simple formatting markers
        const subParts = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        
        return (
          <div key={`text-${blockIndex}-${partIndex}`} className="inline">
            {subParts.map((sp, i) => {
              if (sp.startsWith('`')) {
                return (
                  <code key={i} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-sm font-mono border border-indigo-100 mx-0.5">
                    {sp.replace(/`/g, '')}
                  </code>
                );
              }
              if (sp.startsWith('**')) {
                return <strong key={i} className="font-bold text-indigo-900">{sp.replace(/\*\*/g, '')}</strong>;
              }
              return <span key={i} className="whitespace-pre-wrap">{sp}</span>;
            })}
          </div>
        );
      });
    });
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[95%] sm:max-w-[85%] md:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Timestamp / Name Label */}
        <span className="text-[10px] text-slate-400 mb-1 px-1">
          {isUser ? 'You' : 'Socratis AI'}
        </span>

        {/* Message Container */}
        <div
          className={`relative px-4 py-3 sm:px-6 sm:py-5 shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none'
              : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
          }`}
        >
          {/* Display Uploaded Images Grid */}
          {message.images && message.images.length > 0 && (
            <div className={`mb-4 grid gap-2 ${message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {message.images.map((img, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden border border-white/20 aspect-auto">
                  <img 
                    src={img} 
                    alt={`Uploaded context ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
            </div>
          )}

          {/* Fallback for legacy messages with single 'image' property */}
          {/* @ts-ignore */}
          {message.image && !message.images && (
             <div className="mb-4 rounded-lg overflow-hidden border border-white/20">
               {/* @ts-ignore */}
               <img src={message.image} alt="Uploaded context" className="max-h-60 w-auto object-cover" />
             </div>
          )}

          {/* Text Content */}
          <div className={`text-sm sm:text-base leading-relaxed ${isUser ? 'text-indigo-50' : ''} overflow-hidden`}>
            {renderContent(message.text)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
