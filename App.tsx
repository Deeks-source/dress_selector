
import React, { useState, useEffect } from 'react';
import { View, ClothingItem, ClothingCategory, Language, ChatMessage, DesignerState } from './types';
import Onboarding from './components/Onboarding';
import WardrobeGrid from './components/WardrobeGrid';
import OutfitRecommender from './components/OutfitRecommender';
import CostumeDesigner from './components/CostumeDesigner';
import { Shirt, LayoutGrid, Sparkles, ShoppingBag, Globe } from 'lucide-react';

const WARDROBE_KEY = 'stylemind_wardrobe';
const CHAT_KEY = 'stylemind_chat_v2';
const DESIGNER_KEY = 'stylemind_designer_cache';

const translations = {
  en: { wardrobe: 'Closet', recommend: 'Stylist', designer: 'Designer', lang: 'EN' },
  hi: { wardrobe: 'अलमारी', recommend: 'स्टाइलिश', designer: 'डिज़ाइनर', lang: 'HI' },
  es: { wardrobe: 'Armario', recommend: 'Estilista', designer: 'Diseñador', lang: 'ES' },
  fr: { wardrobe: 'Placard', recommend: 'Styliste', designer: 'Créateur', lang: 'FR' },
  ja: { wardrobe: 'クローゼット', recommend: 'スタイリスト', designer: 'デザイナー', lang: 'JA' }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('onboarding');
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [designerCache, setDesignerCache] = useState<DesignerState | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const savedWardrobe = localStorage.getItem(WARDROBE_KEY);
    const savedChat = localStorage.getItem(CHAT_KEY);
    const savedDesigner = localStorage.getItem(DESIGNER_KEY);
    
    if (savedWardrobe) {
      const items = JSON.parse(savedWardrobe);
      setWardrobe(items);
      // RELAXED: If user has ANY items, they can see their wardrobe. No more hard shirt/pants block.
      if (items.length > 0) {
        setView('wardrobe');
      }
    }
    if (savedChat) setChatHistory(JSON.parse(savedChat));
    if (savedDesigner) setDesignerCache(JSON.parse(savedDesigner));
  }, []);

  useEffect(() => {
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(wardrobe));
    localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory));
    if (designerCache) localStorage.setItem(DESIGNER_KEY, JSON.stringify(designerCache));
  }, [wardrobe, chatHistory, designerCache]);

  const markAsWorn = (itemIds: string[]) => {
    setWardrobe(prev => prev.map(item => 
      itemIds.includes(item.id) ? { ...item, wearCount: item.wearCount + 1 } : item
    ));
  };

  const t = translations[language] || translations['en'];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(wardrobe.length > 0 ? 'wardrobe' : 'onboarding')}>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Shirt size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 hidden sm:block">StyleMind</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <Globe size={18} className="text-slate-400 ml-1" />
            <select 
              value={language} onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none pr-1 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          {view !== 'onboarding' && (
            <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setView('wardrobe')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${view === 'wardrobe' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>
                <LayoutGrid size={18} />
                <span className="hidden md:inline">{t.wardrobe}</span>
              </button>
              <button onClick={() => setView('recommend')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${view === 'recommend' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>
                <Sparkles size={18} />
                <span className="hidden md:inline">{t.recommend}</span>
              </button>
              <button onClick={() => setView('designer')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${view === 'designer' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}>
                <ShoppingBag size={18} />
                <span className="hidden md:inline">{t.designer}</span>
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-12">
        {view === 'onboarding' && <Onboarding onItemsAdded={(items) => setWardrobe(p => [...p, ...items])} wardrobe={wardrobe} onComplete={() => setView('wardrobe')} />}
        {view === 'wardrobe' && <WardrobeGrid items={wardrobe} onDelete={(id) => setWardrobe(p => p.filter(i => i.id !== id))} onUpdate={(upd) => setWardrobe(p => p.map(i => i.id === upd.id ? upd : i))} onAddMore={() => setView('onboarding')} language={language} />}
        {view === 'recommend' && <OutfitRecommender wardrobe={wardrobe} language={language} chatHistory={chatHistory} setChatHistory={setChatHistory} onMarkAsWorn={markAsWorn} />}
        {view === 'designer' && <CostumeDesigner wardrobe={wardrobe} language={language} cache={designerCache} setCache={setDesignerCache} />}
      </main>
    </div>
  );
};

export default App;
