
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Loader2, BookOpen, X, Download } from 'lucide-react';
import { Message, ChatState } from './types';
import { sendMessageToGemini } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import ThinkingIndicator from './components/ThinkingIndicator';

const App: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        id: 'welcome',
        role: 'model',
        text: "Namaste! Main hoon Socratis. Accounts ke concepts samajhne mein help chahiye? \n\nKoi bhi question pucho ya photo upload karo. Journal entries, Ledger, ya Balance Sheet - saath mein solve karenge step-by-step!",
        timestamp: Date.now(),
      }
    ],
    isLoading: false,
    error: null,
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, chatState.isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportChat = () => {
    if (chatState.messages.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    let content = `Socratis Accounts Tutor - Session ${timestamp}\n===========================================\n\n`;

    chatState.messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'YOU' : 'SOCRATIS';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      content += `[${time}] ${role}:\n${msg.text}\n\n-------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `socratis-notes-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if ((!inputText.trim() && !selectedImage) || chatState.isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      image: selectedImage || undefined,
      timestamp: Date.now(),
    };

    // Update state with user message
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isLoading: true,
      error: null,
    }));

    // Clear input immediately
    setInputText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // Stream response
      const stream = await sendMessageToGemini(
        chatState.messages, // Pass CURRENT history before the new message (service handles appending)
        newMessage.text,
        newMessage.image
      );

      // Create a placeholder message for the bot
      const botMessageId = (Date.now() + 1).toString();
      
      setChatState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: botMessageId,
            role: 'model',
            text: '', // Start empty
            timestamp: Date.now(),
          }
        ]
      }));

      let fullText = '';
      
      for await (const chunk of stream) {
        fullText += chunk;
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === botMessageId 
              ? { ...msg, text: fullText }
              : msg
          )
        }));
      }

      setChatState(prev => ({ ...prev, isLoading: false }));

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = "Connection mein thodi problem hai. Please wapis try karo.";
      const errorStr = error?.toString() || '';

      // Check for specific API Key related errors
      if (errorStr.includes('API key') || errorStr.includes('403') || errorStr.includes('400')) {
        errorMessage = "API Key missing ya invalid hai. Please apni deployment settings check karein aur API Key add karein.";
      } else if (errorStr.includes('503')) {
        errorMessage = "Server abhi busy hai. Please thodi der baad try karo.";
      }

      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [inputText, selectedImage, chatState.isLoading, chatState.messages]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Socratis</h1>
              <p className="text-xs text-slate-500 font-medium">AI Accounts Tutor (Hinglish)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                Gemini 3.0 Thinking Mode
              </span>
            </div>
            <button
              onClick={handleExportChat}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Export Notes"
              aria-label="Export Chat Notes"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          {chatState.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          
          {chatState.isLoading && (
            <div className="flex justify-start mb-6 w-full">
               {/* Check if the last message has content, if not (just started), show thinking */}
               {chatState.messages[chatState.messages.length - 1].role === 'model' && chatState.messages[chatState.messages.length - 1].text === '' ? (
                 <ThinkingIndicator />
               ) : null}
            </div>
          )}
          
          {chatState.error && (
            <div className="p-4 mb-4 text-sm font-medium text-red-700 bg-red-100 rounded-lg border border-red-200" role="alert">
              {chatState.error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-none bg-white border-t border-slate-200 p-4 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm"
              />
              <button 
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-slate-200 shadow-md hover:bg-slate-50 text-slate-500"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-100 p-2 rounded-2xl border border-transparent focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Upload image"
            >
              <ImageIcon size={24} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Question pucho ya problem upload karo..."
              className="flex-1 bg-transparent border-none focus:ring-0 p-3 text-slate-800 placeholder:text-slate-400 min-h-[50px] max-h-[150px] resize-none overflow-y-auto"
              disabled={chatState.isLoading}
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedImage) || chatState.isLoading}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                (!inputText.trim() && !selectedImage) || chatState.isLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {chatState.isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Send size={24} />
              )}
            </button>
          </form>
          <div className="text-center mt-2">
             <p className="text-[10px] text-slate-400">Powered by Gemini 3.0 Pro • Thinking Mode Enabled</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;