
import React, { useState, useRef, useEffect } from 'react';
import { ClothingItem, Language, ChatMessage } from '../types';
import { getChatStylistResponse } from '../services/geminiService';
import { Sparkles, Loader2, Send, User, Bot, CheckCircle, Camera, Image as ImageIcon } from 'lucide-react';

interface OutfitRecommenderProps {
  wardrobe: ClothingItem[];
  language: Language;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onMarkAsWorn: (itemIds: string[]) => void;
}

const OutfitRecommender: React.FC<OutfitRecommenderProps> = ({ wardrobe, language, chatHistory, setChatHistory, onMarkAsWorn }) => {
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

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await getChatStylistResponse(wardrobe, chatHistory, input, language);
    if (response) {
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        itemIds: response.itemIds,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, modelMsg]);
    }
    setLoading(false);
  };

  const clearHistory = () => {
    if (confirm("Clear chat history?")) setChatHistory([]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[75vh] flex flex-col bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
      {/* Chat Header */}
      <div className="bg-white border-b border-slate-50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Style Consultant</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active • Gemini 3</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowPhotos(!showPhotos)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              showPhotos ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {showPhotos ? <Camera size={14} /> : <Sparkles size={14} />}
            {showPhotos ? 'Photo Mode' : 'Studio Mode'}
          </button>
          <button onClick={clearHistory} className="text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">Clear</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar bg-slate-50/30">
        {chatHistory.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
            <Bot size={80} className="text-slate-200" />
            <p className="text-xl font-bold text-slate-400 max-w-sm">
              I know your closet inside out. Try: <br/>
              <span className="text-indigo-600">"Build a casual weekend look"</span> or <br/>
              <span className="text-indigo-600">"What goes with my blue jeans?"</span>
            </p>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
            <div className={`max-w-[90%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-slate-100'}`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className="space-y-6">
                <div className={`p-6 rounded-[2.5rem] text-lg font-medium leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                  {msg.text}
                </div>
                
                {/* Embedded Outfit Suggestions */}
                {msg.itemIds && msg.itemIds.length > 0 && (
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-700">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Curated Outfit</span>
                         <span className="text-[9px] text-slate-400 font-bold uppercase">{msg.itemIds.length} pieces selected</span>
                       </div>
                       <button 
                         onClick={() => onMarkAsWorn(msg.itemIds!)}
                         className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                       >
                         <CheckCircle size={14} /> Log Wear
                       </button>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                      {msg.itemIds.map(id => {
                        const item = wardrobe.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex-shrink-0 w-32 space-y-3 group">
                            <div className="aspect-[4/5] bg-slate-50 rounded-[1.5rem] relative flex items-center justify-center overflow-hidden border border-slate-100 group-hover:shadow-lg transition-all">
                              {/* Toggle Logic based on showPhotos state */}
                              {showPhotos ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover animate-in fade-in duration-500"
                                />
                              ) : (
                                <div className="p-6 w-full h-full animate-in fade-in duration-500">
                                   <div className="absolute inset-0 bg-indigo-500/5 blur-xl" style={{ backgroundColor: item.hexColor + '22' }} />
                                   <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md relative z-10">
                                     <path fill={item.hexColor} d="M12 4L16 6V10H14V20H10V10H8V6L12 4Z" />
                                   </svg>
                                </div>
                              )}
                              
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur text-[8px] font-black uppercase tracking-tighter rounded-md border border-slate-100">
                                {item.category}
                              </div>
                            </div>
                            <p className="text-xs font-black text-center text-slate-800 truncate px-1">{item.name}</p>
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
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div className="p-6 bg-white border border-slate-100 rounded-[2.5rem] rounded-tl-none text-slate-300 font-bold">Designing your perfect look...</div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-8 bg-white border-t border-slate-100 flex gap-4 items-center">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 'What should I wear to the office tomorrow?'" 
          className="flex-1 bg-slate-50 px-8 py-5 rounded-[2rem] text-lg font-medium outline-none shadow-inner focus:ring-4 focus:ring-indigo-100 transition-all border border-transparent focus:bg-white focus:border-indigo-100"
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${input.trim() && !loading ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300'}`}
        >
          <Send size={28} />
        </button>
      </form>
    </div>
  );
};

export default OutfitRecommender;
