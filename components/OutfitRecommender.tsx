
import React, { useState, useRef, useEffect } from 'react';
import { ClothingItem, Language, ChatMessage } from '../types';
import { getChatStylistResponse, extractStyleMemory } from '../services/geminiService';
import { appendMemoryFact } from '../services/firebaseService';
import { Sparkles, Loader2, Send, User, Bot, CheckCircle, Camera, Image as ImageIcon, MessageSquarePlus } from 'lucide-react';

interface OutfitRecommenderProps {
  wardrobe: ClothingItem[];
  language: Language;
  chatHistory: ChatMessage[];
  setChatHistory: (history: ChatMessage[]) => void;
  onMarkAsWorn: (itemIds: string[]) => void;
  userMemory?: string[];
  userUid?: string;
  isKeyboardVisible?: boolean;
}

const SilhouetteIcon = ({ silhouette, color, category }: { silhouette?: string, color: string, category?: string }) => {
  const common = { fill: color, stroke: '#000', strokeWidth: '2.5', strokeLinejoin: 'round' as any, strokeLinecap: 'round' as any };
  const s = (silhouette || category || 'tee').toLowerCase();
  
  if (s.includes('tee') || s.includes('shirt') || s.includes('top')) {
    return (
      <g>
        <path {...common} d="M7 4C7 4 10 2 12 2C14 2 17 4 17 4L22 9L18 13L16 10V22H8V10L6 13L2 9L7 4Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" d="M10 4C10 5.10457 10.8954 6 12 6C13.1046 6 14 5.10457 14 4" />
      </g>
    );
  }
  if (s.includes('hoodie') || s.includes('sweater') || s.includes('jacket')) {
    return (
      <g>
        <path {...common} d="M12 2C9 2 6 5 6 9L3 12V14L6 11V22H18V11L21 14V12L18 9C18 5 15 2 12 2Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" d="M12 2V9 M10 11V22 M14 11V22" />
      </g>
    );
  }
  if (s.includes('jean') || s.includes('pant') || s.includes('trouser') || s.includes('bottom')) {
    return (
      <g>
        <path {...common} d="M6 3H18L20 21H13L12 10L11 21H4L6 3Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" d="M12 3V10 M8 3V6 M16 3V6" />
      </g>
    );
  }
  if (s.includes('short')) {
    return (
      <g>
        <path {...common} d="M6 3H18L19 14H13L12 8L11 14H5L6 3Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" d="M12 3V8" />
      </g>
    );
  }
  if (s.includes('dress') || s.includes('skirt')) {
    return (
      <g>
        <path {...common} d="M9 3H15L18 10L20 21H4L6 10L9 3Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" d="M12 3V21 M8 10V21 M16 10V21" />
      </g>
    );
  }
  if (s.includes('sneaker') || s.includes('shoe') || s.includes('boot') || s.includes('footwear')) {
    return (
      <g>
        <path {...common} d="M4 14C4 14 6 10 10 10H14C17 10 20 12 20 16V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V14Z" />
        <path fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" d="M8 14H16 M8 17H12" />
        <circle cx="16" cy="17" r="1" fill="#000" />
      </g>
    );
  }
  return <rect {...common} x="4" y="4" width="16" height="16" rx="4" />;
};

const OutfitRecommender: React.FC<OutfitRecommenderProps> = ({ wardrobe, language, chatHistory, setChatHistory, onMarkAsWorn, userMemory = [], userUid, isKeyboardVisible }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true); // Default to photos as requested
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const currentInput = input;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput('');
    setLoading(true);

    const response = await getChatStylistResponse(wardrobe, chatHistory, currentInput, userMemory, language);
    if (response) {
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        itemIds: response.itemIds,
        timestamp: new Date().toISOString()
      };
      setChatHistory([...newHistory, modelMsg]);
      
      // Async extract facts without blocking
      if (userUid) {
        extractStyleMemory(newHistory, currentInput).then((facts) => {
          if (facts.length > 0) {
            appendMemoryFact(userUid, facts);
          }
        }).catch(err => console.error("Memory extraction failed", err));
      }
    }
    setLoading(false);
  };


  const handleNewChat = () => {
    if (confirm("Start a new chat and clear history?")) {
      setChatHistory([]);
      setInput('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-white sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[6px_6px_0_0_#000] overflow-hidden border-y-[3px] sm:border-[3px] border-black">
      {/* Chat Header */}
      <div className="bg-white border-b-[3px] border-black p-4 sm:p-5 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#A388EE] rounded-[1rem] flex items-center justify-center text-black">
            <Bot size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5}/>
          </div>
          <div>
            <h3 className="font-black text-black text-base sm:text-lg">AI Stylist</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-2xl sm:rounded-[2rem] bg-[#06D6A0] animate-pulse" />
              <p className="text-[10px] sm:text-xs font-black text-black">Always here to help</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setShowPhotos(!showPhotos)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
              showPhotos ? 'bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000]' : 'bg-[#EAEAEA] text-black hover:bg-[#D0D0D0]'
            }`}
          >
            {showPhotos ? <Camera size={14} strokeWidth={2.5}/> : <Sparkles size={14} strokeWidth={2.5}/>}
            <span className="hidden sm:inline">{showPhotos ? 'Photo Mode' : 'Studio Mode'}</span>
            <span className="sm:hidden">{showPhotos ? 'Photo' : 'Studio'}</span>
          </button>
          <button 
            onClick={handleNewChat} 
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#EAEAEA] rounded-xl text-xs sm:text-sm font-black text-black hover:bg-[#D0D0D0] transition-colors"
            title="Start new chat"
          >
            <MessageSquarePlus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${isKeyboardVisible ? 'p-2' : 'p-4 sm:p-6'} space-y-6 sm:space-y-8 no-scrollbar bg-white transition-all`}>
        {chatHistory.length === 0 && !loading && (
           <div className="h-full flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-24 h-24 bg-[#A388EE] rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-black">
              <Sparkles size={40} strokeWidth={2.5}/>
            </div>
            <p className="text-lg font-black text-black max-w-sm">
              I know your closet inside out. Try: <br/>
              <span className="text-black font-black mt-2 inline-block">"Build a casual weekend look"</span> or <br/>
              <span className="text-black font-black">"What goes with my blue jeans?"</span>
            </p>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
            <div className={`max-w-[90%] sm:max-w-[75%] flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} min-w-0`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl sm:rounded-[2rem] flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-[#06D6A0] text-black' : 'bg-[#A388EE] text-black'}`}>
                {msg.role === 'user' ? <User size={16} strokeWidth={2.5}/> : <Bot size={18} strokeWidth={2.5}/>}
              </div>
              <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
                <div className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-base font-black leading-relaxed break-words whitespace-pre-wrap  border-[3px] border-black ${msg.role === 'user' ? 'bg-[#E3FBCC] text-black rounded-tr-md' : 'bg-[#FFF4E0] text-black rounded-tl-md'}`}>
                  {msg.text}
                </div>
                
                {/* Embedded Outfit Suggestions */}
                {msg.itemIds && msg.itemIds.length > 0 && (
                  <div className="bg-white p-4 sm:p-6 rounded-[2rem] border-[3px] border-black shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-700 w-full overflow-hidden mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-[3px] border-black pb-3 sm:pb-4 gap-3 sm:gap-0">
                       <div className="flex flex-col">
                         <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-wider bg-[#A388EE] px-3 py-1 rounded-2xl sm:rounded-[2rem] w-max">Curated Outfit</span>
                         <span className="text-[10px] sm:text-xs text-black font-black mt-1.5">{msg.itemIds.length} pieces selected</span>
                       </div>
                       <button 
                         onClick={() => onMarkAsWorn(msg.itemIds!)}
                         className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#CCFF00] text-black hover:bg-[#5A3EE0] text-xs font-black rounded-xl shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
                       >
                         <CheckCircle size={16} strokeWidth={2.5}/> Log Wear
                       </button>
                    </div>
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 sm:pb-4 no-scrollbar">
                      {msg.itemIds.map(id => {
                        const item = wardrobe.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex-shrink-0 w-28 sm:w-32 space-y-3 group">
                            <div className="aspect-[4/5] bg-[#FFF4E0] rounded-2xl relative flex items-center justify-center overflow-hidden border-[3px] border-black  p-4 transition-all">
                              {/* Toggle Logic based on showPhotos state */}
                              {showPhotos ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover animate-in fade-in duration-500 rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full animate-in fade-in duration-500 flex items-center justify-center">
                                   <div className="absolute inset-0 opacity-10 blur-xl" style={{ backgroundColor: item.hexColor }} />
                                   <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-[2px_2px_0_rgba(0,0,0,1)] relative z-10 p-2">
                                     <SilhouetteIcon silhouette={item.silhouette} color={item.hexColor} category={item.category} />
                                   </svg>
                                </div>
                              )}
                              
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur text-[9px] font-black uppercase tracking-wider rounded-md text-black  border-[3px] border-black">
                                {item.category}
                              </div>
                            </div>
                            <p className="text-xs font-black text-center text-black truncate px-1">{item.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl sm:rounded-[2rem] bg-[#A388EE] text-black flex items-center justify-center">
                <Loader2 size={20} className="animate-spin" strokeWidth={2.5}/>
              </div>
              <div className="p-4 sm:p-5 bg-[#FFF4E0] rounded-2xl rounded-tl-md text-sm sm:text-base text-black font-black tracking-tight">Designing your perfect look...</div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className={`${isKeyboardVisible ? 'p-2' : 'p-4 sm:p-6'} bg-white border-t-[3px] border-black transition-all`}>
        <form onSubmit={handleSend} className="flex-1 flex gap-2 sm:gap-3 items-center bg-[#FFF4E0] p-1.5 rounded-[2rem] border-[3px] border-black focus-within:border-black focus-within:bg-white focus-within: transition-all">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..." 
            className="flex-1 min-w-0 bg-transparent px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-black outline-none text-black placeholder:text-black"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl sm:rounded-[2rem] flex items-center justify-center transition-all ${input.trim() && !loading ? 'bg-[#CCFF00] text-black shadow-[2px_2px_0_0_#000] shadow-[#6B4EFF]/30 hover:scale-105 active:translate-y-1 active:translate-x-1 active:shadow-none' : 'bg-[#D0D0D0] text-black'}`}
          >
            <Send size={18} className="" strokeWidth={2.5}/>
          </button>
        </form>
      </div>
    </div>
  );
};

export default OutfitRecommender;
