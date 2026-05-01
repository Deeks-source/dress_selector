import React, { useState, useRef, useEffect } from 'react';
import { ClothingItem, Language, ChatMessage, ChatSession } from '../types';
import { getChatStylistResponse, extractStyleMemory } from '../services/geminiService';
import { appendMemoryFact, createSession, subscribeToSessions, subscribeToSessionMessages, syncSessionMessage, updateSessionMessageLoggedStatus, deleteSession } from '../services/firebaseService';
import { Sparkles, Loader2, Send, User, Bot, CheckCircle, Camera, Image as ImageIcon, MessageSquarePlus, Menu, X, Clock, Trash2 } from 'lucide-react';

interface OutfitRecommenderProps {
  wardrobe: ClothingItem[];
  language: Language;
  onMarkAsWorn: (itemIds: string[], messageId?: string) => void;
  userMemory?: string[];
  userUid?: string;
  isKeyboardVisible?: boolean;
  initialQuery?: string;
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

const OutfitRecommender: React.FC<OutfitRecommenderProps> = ({ wardrobe, language, onMarkAsWorn, userMemory = [], userUid, isKeyboardVisible, initialQuery }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = useRef<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
    }
  }, [initialQuery]);

  // Subscribe to all sessions
  useEffect(() => {
    if (!userUid) return;
    const unsub = subscribeToSessions(userUid, setSessions);
    return () => unsub();
  }, [userUid]);

  // Subscribe to messages in current session
  useEffect(() => {
    if (!userUid || !activeSessionId) {
      setChatHistory([]);
      return;
    }
    const unsub = subscribeToSessionMessages(userUid, activeSessionId, setChatHistory);
    return () => unsub();
  }, [userUid, activeSessionId]);

  useEffect(() => {
    const latest = chatHistory[chatHistory.length - 1];
    if (latest && latest.id !== lastMessageId.current) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      lastMessageId.current = latest.id;
    }
    if (loading) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !userUid) return;

    const currentInput = input;
    const timestamp = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp
    };

    let targetSessionId = activeSessionId;
    
    // Create new session if doesn't exist
    if (!targetSessionId) {
      const newId = await createSession(userUid, currentInput);
      if (!newId) return;
      targetSessionId = newId;
      setActiveSessionId(newId);
    }

    setInput('');
    setLoading(true);
    
    // Sync user message
    await syncSessionMessage(userUid, targetSessionId, userMsg);

    // Get AI Response
    const response = await getChatStylistResponse(wardrobe, chatHistory, currentInput, userMemory, language);
    if (response) {
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        itemIds: response.itemIds,
        timestamp: new Date().toISOString()
      };
      
      await syncSessionMessage(userUid, targetSessionId, modelMsg);
      
      // Extract memory
      extractStyleMemory([...chatHistory, userMsg], currentInput).then((facts) => {
        if (facts.length > 0) {
          appendMemoryFact(userUid, facts);
        }
      }).catch(err => console.error("Memory extraction failed", err));
    }
    setLoading(false);
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setChatHistory([]);
    setShowHistory(false);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSession = async (sessionId: string) => {
    if (!userUid || !sessionId) return;
    
    try {
      await deleteSession(userUid, sessionId);
      if (activeSessionId === sessionId) {
        startNewChat();
      }
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Failed to delete chat. Please try again.");
    }
  };

  const handleLoggedItem = async (itemIds: string[], messageId: string) => {
    onMarkAsWorn(itemIds);
    if (userUid && activeSessionId) {
      await updateSessionMessageLoggedStatus(userUid, activeSessionId, messageId, true);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex h-full sm:h-[600px] bg-white sm:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[6px_6px_0_0_#000] overflow-hidden sm:border-[3px] border-black relative">
      
      {/* Sidebar - Desktop */}
      <div className={`hidden sm:flex flex-col w-72 border-r-[3px] border-black bg-[#F4F1FD] transition-all duration-300 ${!showHistory ? '-ml-72' : 'ml-0'}`}>
        <div className="p-4 border-b-[3px] border-black flex justify-between items-center bg-white">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-black/50">History</h3>
          <div className="flex gap-1">
            <button onClick={() => setShowHistory(false)} className="hover:bg-black/5 p-1.5 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="relative group flex items-center gap-1.5 p-1">
              {deletingId === s.id ? (
                <div className="flex-1 flex items-center gap-2 bg-red-50 p-2 rounded-2xl border-2 border-red-500 animate-in slide-in-from-right-2 duration-300">
                  <p className="flex-1 text-[10px] font-black text-red-600 leading-tight">Delete chat history?</p>
                  <button 
                    onClick={() => handleDeleteSession(s.id)}
                    className="p-1 px-2 bg-red-600 text-white text-[10px] font-black rounded-lg hover:bg-red-700 active:scale-95 transition-all"
                  >
                    YES
                  </button>
                  <button 
                    onClick={() => setDeletingId(null)}
                    className="p-1 px-2 bg-white border border-red-200 text-[10px] font-black rounded-lg hover:bg-red-50 active:scale-95 transition-all"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setActiveSessionId(s.id)}
                    className={`flex-1 text-left p-3 pr-10 rounded-2xl border-2 transition-all flex items-center gap-3 ${activeSessionId === s.id ? 'bg-[#CCFF00] border-black shadow-[2px_2px_0_0_#000]' : 'bg-white border-black/10 hover:border-black'}`}
                  >
                    <Clock size={14} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate">{s.title}</p>
                      <p className="text-[10px] font-bold text-black/60 truncate">{new Date(s.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
                    className="absolute right-3 p-2 rounded-xl bg-white border-2 border-black/10 text-black/20 hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all z-10 sm:opacity-0 group-hover:opacity-100"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-[10px] font-black text-black/40">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Mobile Drawer */}
      {showHistory && (
        <div className="sm:hidden absolute inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowHistory(false)}>
          <div className="absolute top-0 left-0 bottom-0 w-[85%] bg-[#F4F1FD] border-r-[3px] border-black animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b-[3px] border-black flex justify-between items-center bg-white">
              <h3 className="font-black text-sm uppercase tracking-widest text-black">History</h3>
              <button onClick={() => setShowHistory(false)} className="bg-white border-2 border-black p-2 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto h-full pb-32 no-scrollbar">
              {sessions.map(s => (
                <div key={s.id} className="relative flex items-center p-0.5">
                  {deletingId === s.id ? (
                    <div className="flex-1 flex items-center gap-3 bg-red-50 p-4 rounded-2xl border-[3px] border-red-500 animate-in slide-in-from-right-4 duration-300">
                      <p className="flex-1 text-xs font-black text-red-600 leading-tight">Delete this chat history?</p>
                      <button 
                        onClick={() => handleDeleteSession(s.id)}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all border-2 border-red-700"
                      >
                        YES
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="px-4 py-2 bg-white border-2 border-red-200 text-xs font-black rounded-xl hover:bg-red-50 active:scale-95 transition-all"
                      >
                        NO
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setActiveSessionId(s.id); setShowHistory(false); }}
                        className={`flex-1 text-left p-4 pr-16 rounded-2xl border-[3px] transition-all flex items-center gap-4 ${activeSessionId === s.id ? 'bg-[#CCFF00] border-black shadow-[4px_4px_0_0_#000] z-0' : 'bg-white border-black shadow-[2px_2px_0_0_#000] z-0'}`}
                      >
                        <Clock size={18} />
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate">{s.title}</p>
                          <p className="text-[11px] font-bold text-black/60 uppercase">{new Date(s.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
                        className="absolute right-3 p-3 rounded-xl bg-white border-2 border-black text-red-500 shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all z-10"
                        title="Delete Chat"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Chat Header */}
        <div className={`bg-white border-b-[3px] border-black p-3 sm:p-5 flex justify-between items-center relative z-10 transition-all duration-300 ${isKeyboardVisible ? 'h-0 overflow-hidden border-0 p-0' : ''}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 sm:p-2.5 rounded-xl border-[3px] border-black bg-white hover:bg-[#F4F1FD] shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all" title="Chat History">
              <Clock size={18} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 bg-[#A388EE] border-2 border-black rounded-[0.8rem] items-center justify-center text-black">
                <Bot size={20} className="" strokeWidth={2.5}/>
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-black text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                  {activeSessionId ? sessions.find(s => s.id === activeSessionId)?.title : 'New AI Stylist'}
                </h3>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06D6A0] animate-pulse" />
                  <p className="text-[10px] sm:text-xs font-black text-black/60">Ready to style</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setShowPhotos(!showPhotos)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border-2 border-black rounded-xl text-[10px] sm:text-xs font-black transition-all ${
                showPhotos ? 'bg-[#CCFF00] text-black shadow-[3px_3px_0_0_#000]' : 'bg-white text-black'
              }`}
            >
              {showPhotos ? <Camera size={12} strokeWidth={2.5}/> : <ImageIcon size={12} strokeWidth={2.5}/>}
              <span className="hidden sm:inline">{showPhotos ? 'Visual' : 'Draft'} Mode</span>
              <span className="sm:hidden">{showPhotos ? 'PH' : 'DR'}</span>
            </button>
            <button 
              onClick={startNewChat} 
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-black text-white border-2 border-black rounded-xl text-[10px] sm:text-xs font-black hover:bg-black/90 shadow-[3px_3px_0_0_#9F8FEF] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
            >
              <MessageSquarePlus size={12} strokeWidth={2.5} />
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto ${isKeyboardVisible ? 'p-1' : 'p-4 sm:p-6'} space-y-6 sm:space-y-8 no-scrollbar bg-[#FAF9FF]`}>
          {chatHistory.length === 0 && !loading && (
             <div className={`h-full flex flex-col items-center justify-center text-center ${isKeyboardVisible ? 'space-y-2 py-0' : 'space-y-6 p-4'}`}>
              <div className={`bg-[#A388EE] border-[3px] border-black flex items-center justify-center text-black shadow-[6px_6px_0_0_#000] ${isKeyboardVisible ? 'w-12 h-12 rounded-xl' : 'w-20 h-12 sm:w-24 sm:h-24 rounded-[2.5rem]'}`}>
                <Sparkles size={isKeyboardVisible ? 24 : 32} className="sm:w-[40px] sm:h-[40px]" strokeWidth={2.5}/>
              </div>
              <div className="space-y-1">
                <h4 className={`${isKeyboardVisible ? 'text-lg' : 'text-xl sm:text-2xl'} font-black text-black`}>Style Intelligence Ready</h4>
                <p className="hidden sm:block text-sm sm:text-base font-black text-black/60 max-w-sm">
                  Switch to <span className="text-[#A388EE]">Visual Mode</span> to see photos of your recommendations.
                </p>
                <p className={`${isKeyboardVisible ? 'hidden' : 'sm:hidden'} text-xs font-black text-black/60`}>
                   Switch to <span className="text-[#A388EE]">Visual Mode</span> to see photos.
                </p>
              </div>
              <div className={`grid grid-cols-1 gap-2.5 sm:gap-3 w-full max-w-md ${isKeyboardVisible ? 'grid-cols-2 opacity-30 scale-75' : ''}`}>
                {["Casual weekend look", "Outfit for date night", "Style my blue jeans", "Wedding guest ideas"].map(q => (
                  <button 
                    key={q} 
                    onClick={() => { setInput(q); handleSend(); }}
                    className="p-3.5 sm:p-3 bg-white border-[3px] border-black rounded-2xl sm:rounded-2xl text-[13px] sm:text-xs font-black text-black hover:bg-[#CCFF00] transition-all text-center sm:text-left shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`max-w-[90%] sm:max-w-[80%] flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} min-w-0`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 border-2 border-black rounded-xl sm:rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-[#06D6A0] text-black' : 'bg-[#A388EE] text-black shadow-[2px_2px_0_0_#000]'}`}>
                  {msg.role === 'user' ? <User size={16} strokeWidth={2.5}/> : <Bot size={18} strokeWidth={2.5}/>}
                </div>
                <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
                  <div className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-[15px] font-black leading-relaxed break-words whitespace-pre-wrap border-[3px] border-black shadow-[4px_4px_0_0_#000] ${msg.role === 'user' ? 'bg-[#E3FBCC] text-black' : 'bg-white text-black'}`}>
                    {msg.text}
                  </div>
                  
                  {msg.itemIds && msg.itemIds.length > 0 && (
                    <div className="bg-white p-4 sm:p-6 rounded-[2rem] border-[3px] border-black shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-700 w-full overflow-hidden mt-4">
                      <div className="flex items-center justify-between border-b-[3px] border-black pb-4">
                         <div className="flex flex-col">
                           <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-widest bg-[#CCFF00] px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] w-max">Outfit Bundle</span>
                           <span className="text-[10px] sm:text-xs text-black/60 font-black mt-2">{msg.itemIds.length} pieces synchronized</span>
                         </div>
                          <button 
                            onClick={() => handleLoggedItem(msg.itemIds!, msg.id)}
                            disabled={msg.isLogged}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all ${
                              msg.isLogged 
                              ? 'bg-[#EAEAEA] text-black/40 border-2 border-black/10 shadow-none cursor-not-allowed' 
                              : 'bg-[#A388EE] text-black border-[3px] border-black hover:bg-[#CCFF00]'
                            }`}
                          >
                            {msg.isLogged ? <CheckCircle size={16} /> : <CheckCircle size={16} />} 
                            {msg.isLogged ? 'Wear Logged' : 'Log Wear'}
                          </button>
                      </div>
                      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar">
                        {msg.itemIds.map(id => {
                          const item = wardrobe.find(i => i.id === id);
                          if (!item) return null;
                          return (
                            <div key={id} className="flex-shrink-0 w-28 sm:w-36 space-y-3">
                              <div className="aspect-[3/4] bg-[#F4F1FD] rounded-2xl relative flex items-center justify-center overflow-hidden border-[3px] border-black p-2 transition-all shadow-[4px_4px_0_0_#EAEAEA]">
                                {showPhotos ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover animate-in fade-in duration-500 rounded-lg" />
                                ) : (
                                  <div className="w-full h-full animate-in fade-in duration-500 flex items-center justify-center">
                                     <div className="absolute inset-0 opacity-10 blur-xl" style={{ backgroundColor: item.hexColor }} />
                                     <svg viewBox="0 0 24 24" className="w-full h-full p-2 relative z-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                                       <SilhouetteIcon silhouette={item.silhouette} color={item.hexColor} category={item.category} />
                                     </svg>
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-tighter rounded-md border border-white/50">
                                  {item.category}
                                </div>
                              </div>
                              <p className="text-[11px] font-black text-center text-black leading-tight uppercase truncate">{item.name}</p>
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
            <div className="flex justify-start">
              <div className="flex gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-black rounded-xl sm:rounded-2xl bg-[#A388EE] text-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                  <Loader2 size={18} className="animate-spin" strokeWidth={2.5}/>
                </div>
                <div className="p-4 sm:p-5 bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-2xl text-sm sm:text-[15px] text-black font-black flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" />
                  </span>
                  Stylist is thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className={`p-1.5 sm:p-6 bg-white border-t-0 sm:border-t-[3px] border-black ${isKeyboardVisible ? 'p-0.5' : ''}`}>
          <form onSubmit={handleSend} className={`max-w-3xl mx-auto flex gap-2 sm:gap-3 items-center bg-[#F4F1FD] p-1 rounded-[2.5rem] border-[3px] border-black transition-all ${isKeyboardVisible ? 'shadow-none border-[2px]' : 'focus-within:bg-white focus-within:shadow-[6px_6px_0_0_#000]'}`}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              placeholder="What should I wear today?" 
              className={`flex-1 min-w-0 bg-transparent px-4 sm:px-6 py-1 sm:py-3.5 text-sm sm:text-base font-black outline-none text-black placeholder:text-black/30 w-full`}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className={`shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full sm:rounded-[2rem] flex items-center justify-center transition-all border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000] ${input.trim() && !loading ? 'bg-[#CCFF00] hover:scale-105 active:translate-y-1 active:translate-x-1 active:shadow-none' : 'bg-white text-black opacity-30 cursor-not-allowed'}`}
            >
              <Send size={18} className="sm:w-[20px] sm:h-[20px] mr-0.5" strokeWidth={2.5}/>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OutfitRecommender;
