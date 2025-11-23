import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image as ImageIcon, Loader2, BookOpen, X, Download, Camera, Share2 } from 'lucide-react';
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
        text: "Namaste! Main hoon Socratis. Accounts ke concepts samajhne mein help chahiye? \n\nKoi bhi question pucho, photo khicho, ya upload karo. Journal entries, Ledger, ya Balance Sheet - saath mein solve karenge step-by-step!",
        timestamp: Date.now(),
      }
    ],
    isLoading: false,
    error: null,
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, chatState.isLoading]);

  // Camera Logic
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      if (isCameraOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          activeStream = stream;
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera error", err);
          setIsCameraOpen(false);
          alert("Camera access nahi mila. Please permissions check karein.");
        }
      }
    };

    startCamera();

    return () => {
      // Cleanup when component unmounts or camera closes
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      streamRef.current = null;
    };
  }, [isCameraOpen]);

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        // High quality jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
        setIsCameraOpen(false);
      }
    }
  };

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

  const handleShare = async () => {
    const shareData = {
      title: 'Socratis Accounts Tutor',
      text: 'Study Accounts with me using Socratis AI!',
      url: 'https://socratisapp.netlify.app/',
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('App link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
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
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Share App"
              aria-label="Share App"
            >
              <Share2 size={20} />
            </button>
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
              onClick={() => setIsCameraOpen(true)}
              className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Open Camera"
            >
              <Camera size={24} />
            </button>

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
              placeholder="Question pucho, photo lo, ya upload karo..."
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

      {/* Camera Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
          <div className="relative flex-1 overflow-hidden bg-black">
             <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover"
             />
             <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
               <p className="text-white text-center text-sm font-medium">Position problem within frame</p>
             </div>
          </div>
          <div className="flex-none h-32 bg-black/90 flex items-center justify-around px-10 safe-area-bottom">
             <button 
                onClick={() => setIsCameraOpen(false)}
                className="p-4 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
             >
               <X size={24} />
             </button>
             
             <button 
                onClick={takePhoto}
                className="p-1 rounded-full border-[6px] border-white/30 hover:border-white/50 transition-colors"
             >
                <div className="w-16 h-16 bg-white rounded-full active:scale-90 transition-transform" />
             </button>
             
             {/* Spacer to balance layout */}
             <div className="w-14" /> 
          </div>
        </div>
      )}

    </div>
  );
};

export default App;