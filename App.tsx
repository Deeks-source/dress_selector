
import React, { useState, useEffect } from 'react';
import { View, ClothingItem, ClothingCategory, Language, ChatMessage, DesignerState } from './types';
import Onboarding from './components/Onboarding';
import WardrobeGrid from './components/WardrobeGrid';
import OutfitRecommender from './components/OutfitRecommender';
import CostumeDesigner from './components/CostumeDesigner';
import Profile from './components/Profile';
import { Shirt, LayoutGrid, Sparkles, ShoppingBag, Globe, LogIn, Plus } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, User as AuthUser } from 'firebase/auth';
import { auth } from './firebase';
import { syncWardrobeItem, deleteWardrobeItemDB, syncChatMessage, getOrInitUser, subscribeToMemory, subscribeToWardrobe, subscribeToChats, appendMemoryFact, updateChatMessageLoggedStatus } from './services/firebaseService';

const DESIGNER_KEY = 'stylemind_designer_cache';

const translations = {
  en: { wardrobe: 'Closet', recommend: 'Stylist', designer: 'Designer', lang: 'EN', login: 'Login' },
  hi: { wardrobe: 'अलमारी', recommend: 'स्टाइलिश', designer: 'डिज़ाइनर', lang: 'HI', login: 'लॉग इन' },
  es: { wardrobe: 'Armario', recommend: 'Estilista', designer: 'Diseñador', lang: 'ES', login: 'Acceso' },
  fr: { wardrobe: 'Placard', recommend: 'Styliste', designer: 'Créateur', lang: 'FR', login: 'Connexion' },
  ja: { wardrobe: 'クローゼット', recommend: 'スタイリスト', designer: 'デザイナー', lang: 'JA', login: 'ログイン' }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('onboarding');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [designerCache, setDesignerCache] = useState<DesignerState | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
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
        setIsInitializing(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscriptions
    const unsubMem = subscribeToMemory(user.uid, setMemory);
    const unsubWardrobe = subscribeToWardrobe(user.uid, (items) => {
      setWardrobe(items);
      if (items.length > 0 && view === 'onboarding') setView('wardrobe');
    });

    return () => {
      unsubMem();
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
    
    // Optimistic update for wardrobe wear counts
    setWardrobe(prev => prev.map(item => 
      itemIds.includes(item.id) ? { ...item, wearCount: (item.wearCount || 0) + 1 } : item
    ));

    try {
      await Promise.all(
        wardrobe
          .filter(item => itemIds.includes(item.id))
          .map(item => syncWardrobeItem(user.uid, { ...item, wearCount: (item.wearCount || 0) + 1 }))
      );
    } catch (error) {
      console.error("Failed to log wear:", error);
    }
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

  const t = translations[language] || translations['en'];

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
          <div className="flex items-center gap-1 bg-[#F4F1FD] px-2 py-0.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-black">
            <Globe size={12} className="sm:w-[14px]" strokeWidth={2.5}/>
            <select 
              value={language} onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-[10px] sm:text-sm font-black focus:outline-none pr-1 cursor-pointer outline-none"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
              <option value="ja">JA</option>
            </select>
          </div>

          <nav className="hidden sm:flex gap-1 bg-white p-1.5 rounded-2xl border-[3px] border-black items-center">
            <button onClick={() => setView('wardrobe')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'wardrobe' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <LayoutGrid size={18} strokeWidth={2.5}/>
              <span>{t.wardrobe}</span>
            </button>
            <button onClick={() => setView('recommend')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'recommend' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <Sparkles size={18} strokeWidth={2.5}/>
              <span>{t.recommend}</span>
            </button>
            <button onClick={() => setView('designer')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'designer' ? 'bg-white text-black ' : 'text-black hover:text-black hover:bg-[#EAEAEA]/50'}`}>
              <ShoppingBag size={18} strokeWidth={2.5}/>
              <span>{t.designer}</span>
            </button>
            {user && <div className="w-[3px] h-6 bg-[#D0D0D0] mx-1 rounded-full"></div>}
            {user && (
              <button 
                onClick={() => setView('profile')} 
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

      <main className={`flex-1 max-w-7xl mx-auto w-full ${view === 'recommend' ? 'px-0 pt-0 sm:px-8 overflow-hidden bg-white sm:bg-transparent' : 'px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto'} ${isKeyboardVisible ? 'pb-0' : 'pb-[100px] sm:pb-10'} flex flex-col relative`}>
        {view === 'onboarding' && <Onboarding onItemsAdded={handleAddItems} wardrobe={wardrobe} onComplete={() => setView('wardrobe')} />}
        {view === 'wardrobe' && <WardrobeGrid items={wardrobe} onDelete={handleDeleteItem} onUpdate={handleUpdateItem} onAddMore={() => setView('onboarding')} language={language} />}
        {view === 'recommend' && <OutfitRecommender wardrobe={wardrobe} language={language} onMarkAsWorn={markAsWorn} userMemory={memory} userUid={user?.uid} />}
        {view === 'designer' && <CostumeDesigner wardrobe={wardrobe} language={language} cache={designerCache} setCache={setDesignerCache} />}
        {view === 'profile' && user && <Profile user={user} onSignOut={() => auth.signOut()} wardrobe={wardrobe} />}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 w-full bg-white flex justify-around items-end pb-8 pt-4 px-2 z-50 rounded-t-[2.5rem] border-t-[3px] border-black shadow-[0_-10px_40px_rgba(0,0,0,0.06)] sm:hidden transition-transform duration-300 ${isKeyboardVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <button onClick={() => setView('wardrobe')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'wardrobe' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'wardrobe' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
             <LayoutGrid size={22} className={view === 'wardrobe' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">Closet</span>
        </button>
        <button onClick={() => setView('designer')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'designer' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'designer' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
            <ShoppingBag size={22} className={view === 'designer' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">Shop</span>
        </button>
        
        <div className="relative -top-6">
          <button onClick={() => setView('onboarding')} className="bg-[#CCFF00] text-black p-4 rounded-2xl sm:rounded-[2rem] shadow-[4px_4px_0_0_#000] shadow-[#6B4EFF]/40 hover:scale-105 active:translate-y-1 active:translate-x-1 active:shadow-none transition-all outline outline-8 outline-[#F3EFFC]">
             <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        <button onClick={() => setView('recommend')} className={`flex flex-col items-center gap-1.5 w-16 ${view === 'recommend' ? 'text-black' : 'text-black'}`}>
          <div className={`${view === 'recommend' ? 'bg-[#F4F1FD] p-2 rounded-xl' : 'p-2'}`}>
             <Sparkles size={22} className={view === 'recommend' ? 'fill-current opacity-20' : ''} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black">AI Stylist</span>
        </button>
        
        <div onClick={() => setView('profile')} className={`flex flex-col cursor-pointer items-center gap-1.5 w-16 text-black ${view === 'profile' ? 'opacity-100' : 'opacity-80'}`}>
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
