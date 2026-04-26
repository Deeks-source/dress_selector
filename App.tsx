import React, { useState, useEffect } from 'react';
import { 
  Shirt, 
  Sparkles, 
  LayoutGrid, 
  ShoppingBag, 
  User as UserIcon, 
  LogIn, 
  LogOut,
  Plus,
  Globe
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { ClothingItem, Language, ChatMessage, DesignerState, View } from './types';
import WardrobeGrid from './components/WardrobeGrid';
import Onboarding from './components/Onboarding';
import OutfitRecommender from './components/OutfitRecommender';
import CostumeDesigner from './components/CostumeDesigner';
import Profile from './components/Profile';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Keyboard } from '@capacitor/keyboard';
import { syncWardrobeItem, deleteWardrobeItemDB, syncChatMessage, getOrInitUser, subscribeToMemory, subscribeToWardrobe, subscribeToChats, appendMemoryFact } from './services/firebaseService';

const DESIGNER_KEY = 'stylemind_designer_cache';

const translations = {
  en: { wardrobe: 'Closet', recommend: 'Stylist', designer: 'Designer', profile: 'Profile' },
  hi: { wardrobe: 'अलमारी', recommend: 'स्टाइलिस्ट', designer: 'डिजाइनर', profile: 'प्रोफ़ाइल' },
  es: { wardrobe: 'Armario', recommend: 'Estilista', designer: 'Diseñador', profile: 'Perfil' },
  fr: { wardrobe: 'Garde-robe', recommend: 'Styliste', designer: 'Designer', profile: 'Profil' },
  ja: { wardrobe: 'クローゼット', recommend: 'スタイリスト', designer: 'デザイナー', profile: 'プロフィール' },
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('wardrobe'); // Start in Wardrobe as default
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [language, setLanguage] = useState<Language>('en');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  const [designerCache, setDesignerCache] = useState<DesignerState | null>(() => {
    const saved = localStorage.getItem(DESIGNER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.initialize();
        } catch (e) { console.error("Google Auth Init Error:", e); }
        
        Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
        Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await getOrInitUser(user.uid, user.email || '');
        const unsubWardrobe = subscribeToWardrobe(user.uid, (items) => {
          setWardrobe(items);
          // If items exist and we are stuck in onboarding, move to wardrobe
          if (items.length > 0 && view === 'onboarding') setView('wardrobe');
        });
        const unsubChats = subscribeToChats(user.uid, setChatHistory);
        const unsubMemory = subscribeToMemory(user.uid, setMemory);
        return () => {
          unsubWardrobe();
          unsubChats();
          unsubMemory();
        };
      } else {
        setWardrobe([]);
        setChatHistory([]);
        setMemory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddItems = async (items: ClothingItem[]) => {
    if (user) {
      for (const item of items) {
        await syncWardrobeItem(user.uid, item);
      }
    } else {
      setWardrobe(prev => [...prev, ...items]);
    }
    setView('wardrobe');
  };

  const handleDeleteItem = async (id: string) => {
    if (user) {
      await deleteWardrobeItemDB(user.uid, id);
    } else {
      setWardrobe(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleUpdateItem = async (item: ClothingItem) => {
    if (user) {
      await syncWardrobeItem(user.uid, item);
    } else {
      setWardrobe(prev => prev.map(i => i.id === item.id ? item : i));
    }
  };

  const markAsWorn = async (itemIds: string[]) => {
    const updatedWardrobe = wardrobe.map(item => {
      if (itemIds.includes(item.id)) {
        const updated = { ...item, wearCount: (item.wearCount || 0) + 1 };
        if (user) syncWardrobeItem(user.uid, updated);
        return updated;
      }
      return item;
    });
    if (!user) setWardrobe(updatedWardrobe);
  };

  const syncChatState = async (history: ChatMessage[]) => {
    setChatHistory(history);
    if (user && history.length > 0) {
      const lastMsg = history[history.length - 1];
      await syncChatMessage(user.uid, lastMsg);
    }
  };

  const handleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication.idToken;
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } catch (e) {
      console.error("Login Error:", e);
    }
  };

  useEffect(() => {
    if (designerCache) {
      localStorage.setItem(DESIGNER_KEY, JSON.stringify(designerCache));
    }
  }, [designerCache]);

  const t = translations[language];

  if (user === null && Capacitor.isNativePlatform()) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#F3EFFC] items-center justify-center p-8 text-center font-sans">
          <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
             <div className="w-24 h-24 bg-[#CCFF00] rounded-[2.5rem] flex items-center justify-center text-black mx-auto shadow-[8px_8px_0_0_#000]">
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
      {!keyboardVisible && (
        <header className="shrink-0 z-50 bg-white/100 border-b-[3px] border-black px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center relative">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('wardrobe')}>
            <div className="w-10 h-10 bg-[#CCFF00] rounded-xl flex items-center justify-center text-black shadow-[4px_4px_0_0_#000] group-hover:scale-105 transition-transform">
              <Shirt size={22} strokeWidth={2.5}/>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black hidden sm:block">StyleMind</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 bg-[#F4F1FD] px-3 py-1.5 rounded-xl text-black">
              <Globe size={16} strokeWidth={2.5}/>
              <select 
                value={language} onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-sm font-black focus:outline-none pr-1 cursor-pointer outline-none"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="es">ES</option>
                <option value="fr">FR</option>
                <option value="ja">JA</option>
              </select>
            </div>

            <nav className="hidden sm:flex gap-1 bg-white p-1.5 rounded-2xl border-[3px] border-black items-center">
              <button onClick={() => setView('wardrobe')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'wardrobe' ? 'bg-[#CCFF00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]' : 'text-black hover:bg-[#EAEAEA]/50'}`}>
                <LayoutGrid size={18} strokeWidth={2.5}/>
                <span>{t.wardrobe}</span>
              </button>
              <button onClick={() => setView('recommend')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'recommend' ? 'bg-[#CCFF00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]' : 'text-black hover:bg-[#EAEAEA]/50'}`}>
                <Sparkles size={18} strokeWidth={2.5}/>
                <span>{t.recommend}</span>
              </button>
              <button onClick={() => setView('designer')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all ${view === 'designer' ? 'bg-[#CCFF00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]' : 'text-black hover:bg-[#EAEAEA]/50'}`}>
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
      )}

      <main className={`flex-1 max-w-7xl mx-auto w-full ${view === 'recommend' ? 'px-0 sm:px-8 pt-0 sm:pt-6' : 'px-4 sm:px-8 py-6 sm:py-10'} flex flex-col overflow-y-auto ${!keyboardVisible ? 'pb-[100px] sm:pb-10' : 'pb-0'} relative`}>
        {view === 'onboarding' && <Onboarding onItemsAdded={handleAddItems} wardrobe={wardrobe} onComplete={() => setView('wardrobe')} />}
        {view === 'wardrobe' && <WardrobeGrid items={wardrobe} onDelete={handleDeleteItem} onUpdate={handleUpdateItem} onAddMore={() => setView('onboarding')} language={language} />}
        {view === 'recommend' && <OutfitRecommender wardrobe={wardrobe} language={language} chatHistory={chatHistory} setChatHistory={syncChatState} onMarkAsWorn={markAsWorn} userMemory={memory} userUid={user?.uid} isKeyboardVisible={keyboardVisible} />}
        {view === 'designer' && <CostumeDesigner wardrobe={wardrobe} language={language} cache={designerCache} setCache={setDesignerCache} />}
        {view === 'profile' && user && <Profile user={user} onSignOut={() => auth.signOut()} />}
      </main>

      {/* Mobile Bottom Navigation - ALWAYS VISIBLE unless keyboard is up */}
      {!keyboardVisible && (
        <nav className="fixed bottom-0 left-0 w-full bg-white flex justify-around items-end pb-8 pt-4 px-2 z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] sm:hidden">
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
      )}

    </div>
  );
}

export default App;
