
import React, { useState, useEffect } from 'react';
import { View, ClothingItem, ClothingCategory, ChatMessage, DesignerState, CalendarEvent } from './types';
import Onboarding from './components/Onboarding';
import WardrobeGrid from './components/WardrobeGrid';
import OutfitRecommender from './components/OutfitRecommender';
import CostumeDesigner from './components/CostumeDesigner';
import Profile from './components/Profile';
import { Planner } from './components/Planner';
import { Shirt, LayoutGrid, Sparkles, ShoppingBag, Globe, LogIn, Plus, Calendar } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, User as AuthUser } from 'firebase/auth';
import { auth } from './firebase';
import { syncWardrobeItem, deleteWardrobeItemDB, syncChatMessage, getOrInitUser, subscribeToMemory, subscribeToWardrobe, subscribeToChats, appendMemoryFact, updateChatMessageLoggedStatus, subscribeToEvents, syncEvent, deleteEventDB } from './services/firebaseService';

const DESIGNER_KEY = 'stylemind_designer_cache';

const App: React.FC = () => {
  const [view, setView] = useState<View>('onboarding');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [designerCache, setDesignerCache] = useState<DesignerState | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recommendQuery, setRecommendQuery] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Authentication and Data Subscription Effect
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        // Initialize user in DB
        await getOrInitUser(u.uid, u.email);
        setIsInitializing(false);
      } else {
        setWardrobe([]);
        setMemory([]);
        setEvents([]);
        setIsInitializing(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscriptions
    const unsubMem = subscribeToMemory(user.uid, setMemory);
    const unsubEvents = subscribeToEvents(user.uid, setEvents);
    const unsubWardrobe = subscribeToWardrobe(user.uid, (items) => {
      setWardrobe(items);
      setView(currentView => {
        if (items.length > 0 && currentView === 'onboarding') return 'wardrobe';
        return currentView;
      });
    });

    return () => {
      unsubMem();
      unsubEvents();
      unsubWardrobe();
    };
  }, [user]);

  // Sync designer cache locally
  useEffect(() => {
    const savedDesigner = localStorage.getItem(DESIGNER_KEY);
    if (savedDesigner) setDesignerCache(JSON.parse(savedDesigner));
  }, []);

  useEffect(() => {
    if (designerCache) localStorage.setItem(DESIGNER_KEY, JSON.stringify(designerCache));
  }, [designerCache]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const isCapacitor = window.hasOwnProperty('capacitor') || window.hasOwnProperty('Capacitor') || /Capacitor/i.test(navigator.userAgent);
    
    if (isCapacitor) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  };

  const handleAddItems = async (items: ClothingItem[]) => {
    if (!user) return;
    for (const item of items) {
      await syncWardrobeItem(user.uid, item);
    }
  };

  const handleUpdateItem = async (item: ClothingItem) => {
    if (!user) return;
    await syncWardrobeItem(user.uid, item);
  };

  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    await deleteWardrobeItemDB(user.uid, id);
  };

  const syncChatState = async (newHistory: ChatMessage[]) => {
    setChatHistory(newHistory);
    if (!user) return;
    // Sync the newest message
    const msg = newHistory[newHistory.length - 1];
    if (msg) {
      await syncChatMessage(user.uid, msg);
    }
  };

  const markAsWorn = async (itemIds: string[], messageId?: string) => {
    if (!user) return;
    
    const now = new Date().toISOString();

    // Optimistic update for wardrobe wear counts
    setWardrobe(prev => prev.map(item => 
      itemIds.includes(item.id) ? { ...item, wearCount: (item.wearCount || 0) + 1, lastWorn: now } : item
    ));

    try {
      await Promise.all(
        wardrobe
          .filter(item => itemIds.includes(item.id))
          .map(item => syncWardrobeItem(user.uid, { ...item, wearCount: (item.wearCount || 0) + 1, lastWorn: now }))
      );
    } catch (error) {
      console.error("Failed to log wear:", error);
    }
  };

  const handleNavigate = (newView: View) => {
    setView(newView);
    if (newView !== 'recommend') setRecommendQuery('');
  };

  const handleAskGeminiForOutfit = (eventId: string, eventDetails: string) => {
    setRecommendQuery(eventDetails);
    setView('recommend');
  };

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      // Use a slightly more lenient threshold for keyboard detection
      setIsKeyboardVisible(currentHeight < initialHeight * 0.85);
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3EFFC] flex-col gap-6">
        <div className="w-20 h-20 bg-[#CCFF00] rounded-[1.5rem] flex items-center justify-center text-black shadow-[6px_6px_0_0_#000] shadow-[#6B4EFF]/20 animate-bounce">
           <Shirt size={40} strokeWidth={2.5} />
        </div>
        <div className="text-xl font-black text-black tracking-tight animate-pulse">Loading StyleMind...</div>
      </div>
    );
  }

    if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3EFFC] items-center justify-center px-4">
         <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[6px_6px_0_0_#000] max-w-sm w-full text-center space-y-8">
            <div className="mx-auto w-24 h-24 bg-[#CCFF00] rounded-[2rem] flex items-center justify-center text-black shadow-[4px_4px_0_0_#000]">
               <Shirt size={48} strokeWidth={2.5} />
            </div>
            <div>
               <h1 className="text-4xl font-black text-black tracking-tight">StyleMind</h1>
               <p className="text-black font-black mt-3 text-lg leading-snug">Login to save your closet and build your style profile.</p>
            </div>
            <button onClick={handleLogin} className="w-full flex items-center justify-center gap-3 bg-[#CCFF00] text-black hover:bg-[#5A3EE0] font-black py-4 rounded-2xl transition-all text-xl shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none">
              <LogIn size={24} strokeWidth={2.5} /> Login with Google
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F3EFFC] font-sans antialiased text-black overflow-hidden relative">
      <header className={`shrink-0 z-50 bg-white border-b-[3px] border-black transition-all duration-300 ${isKeyboardVisible || (view === 'recommend' && window.innerWidth < 640) ? 'h-0 overflow-hidden border-0' : 'px-4 sm:px-8 py-2 sm:py-3 flex justify-between items-center'}`}>
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('wardrobe')}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#CCFF00] rounded-lg flex items-center justify-center text-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000]">
            <Shirt size={18} strokeWidth={2.5}/>
          </div>
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-black">StyleMind</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden sm:flex gap-1 bg-white p-1.5 rounded-2xl border-[3px] border-black items-center">
            <button onClick={() => handleNavigate('wardrobe')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'wardrobe' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <LayoutGrid size={18} strokeWidth={2.5}/>
              <span>Closet</span>
            </button>
            <button onClick={() => handleNavigate('planner')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'planner' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <Calendar size={18} strokeWidth={2.5}/>
              <span>Planner</span>
            </button>
            <button onClick={() => handleNavigate('recommend')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'recommend' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <Sparkles size={18} strokeWidth={2.5}/>
              <span>Stylist</span>
            </button>
            <button onClick={() => handleNavigate('designer')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'designer' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <ShoppingBag size={18} strokeWidth={2.5}/>
              <span>Designer</span>
            </button>
            {user && <div className="w-[3px] h-6 bg-[#D0D0D0] mx-1 rounded-full"></div>}
            {user && (
              <button 
                onClick={() => handleNavigate('profile')} 
                className={`flex items-center gap-2 p-1 rounded-xl transition-all ${view === 'profile' ? 'bg-[#CCFF00] border-[2px] border-black shadow-[2px_2px_0_0_#000]' : 'hover:bg-[#EAEAEA]/50 border-[2px] border-transparent'}`}
                title="Profile"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#D0D0D0] border-2 border-black flex items-center justify-center">
                  {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-300"></div>}
                </div>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className={`flex-1 max-w-7xl mx-auto w-full ${view === 'recommend' || view === 'planner' ? 'px-0 pt-0 sm:px-8 overflow-hidden bg-white sm:bg-transparent' : 'px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto'} ${isKeyboardVisible ? 'pb-0' : 'pb-[115px] sm:pb-10'} flex flex-col relative`}>
        {view === 'onboarding' && <Onboarding onItemsAdded={handleAddItems} wardrobe={wardrobe} onComplete={() => handleNavigate('wardrobe')} />}
        {view === 'wardrobe' && <WardrobeGrid items={wardrobe} onDelete={handleDeleteItem} onUpdate={handleUpdateItem} onAddMore={() => handleNavigate('onboarding')} language="en" />}
        {view === 'planner' && <Planner events={events} wardrobe={wardrobe} memory={memory} onNavigate={handleNavigate} onAddEvent={(e) => user && syncEvent(user.uid, e)} onUpdateEvent={(e) => user && syncEvent(user.uid, e)} onDeleteEvent={(id) => user && deleteEventDB(user.uid, id)} onAskGeminiForOutfit={handleAskGeminiForOutfit} onMarkAsWorn={markAsWorn} />}
        {view === 'recommend' && <OutfitRecommender wardrobe={wardrobe} language="en" onMarkAsWorn={markAsWorn} userMemory={memory} userUid={user?.uid} isKeyboardVisible={isKeyboardVisible} initialQuery={recommendQuery} />}
        {view === 'designer' && <CostumeDesigner wardrobe={wardrobe} language="en" cache={designerCache} setCache={setDesignerCache} />}
        {view === 'profile' && user && <Profile user={user} onSignOut={() => auth.signOut()} wardrobe={wardrobe} />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 w-full bg-white flex justify-around items-end pb-6 pt-4 px-2 z-50 rounded-t-[2.5rem] border-t-[3px] border-black shadow-[0_-10px_40px_rgba(0,0,0,0.06)] sm:hidden transition-all duration-300 ${isKeyboardVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <button onClick={() => handleNavigate('wardrobe')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'wardrobe' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'wardrobe' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
             <LayoutGrid size={22} className={view === 'wardrobe' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">Closet</span>
        </button>
        <button onClick={() => handleNavigate('planner')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'planner' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'planner' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
            <Calendar size={22} className={view === 'planner' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">Planner</span>
        </button>
        
        <div className="relative -top-6">
          <button onClick={() => handleNavigate('onboarding')} className="bg-[#CCFF00] text-black p-4 rounded-2xl sm:rounded-[2rem] shadow-[4px_4px_0_0_#000] shadow-[#6B4EFF]/40 hover:scale-105 active:translate-y-1 active:translate-x-1 active:shadow-none transition-all outline outline-8 outline-[#F3EFFC]">
             <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <button onClick={() => handleNavigate('recommend')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'recommend' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'recommend' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
             <Sparkles size={22} className={view === 'recommend' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">Stylist</span>
        </button>
        
        <div onClick={() => handleNavigate('profile')} className={`flex flex-col cursor-pointer items-center gap-1.5 w-16 text-black ${view === 'profile' ? 'opacity-100' : 'opacity-80'}`}>
          <div className={`${view === 'profile' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
             <div className="w-6 h-6 rounded-2xl sm:rounded-[2rem] bg-[#D0D0D0] border-2 border-black overflow-hidden flex items-center justify-center">
                {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-300"></div>}
             </div>
          </div>
          <span className="text-[10px] font-black">Profile</span>
        </div>
      </nav>

    </div>
  );
};

export default App;
