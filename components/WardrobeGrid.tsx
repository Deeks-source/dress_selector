
import React, { useState } from 'react';
import { ClothingItem, ClothingCategory, Language } from '../types';
import ItemCard from './ItemCard';
import { Filter, Search, PlusCircle, Sparkles } from 'lucide-react';

interface WardrobeGridProps {
  items: ClothingItem[];
  onDelete: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
  onAddMore: () => void;
  language: Language;
}

const translations = {
  en: { title: 'My Closet', add: 'Add', placeholder: 'Search colors, vibes, or names...', empty: 'Nothing found' },
  hi: { title: 'मेरी अलमारी', add: 'और जोड़ें', placeholder: 'रंग, वाइब या नाम खोजें...', empty: 'कुछ नहीं मिला' },
  es: { title: 'Mi Armario', add: 'Añadir', placeholder: 'Buscar por color, nombre o vibra...', empty: 'No hay nada' },
  fr: { title: 'Mon Placard', add: 'Ajouter', placeholder: 'Chercher couleurs, noms...', empty: 'Rien trouvé' },
  ja: { title: 'クローゼット', add: '追加', placeholder: 'カラー、名前、雰囲気で検索...', empty: '見つかりませんでした' }
};

const WardrobeGrid: React.FC<WardrobeGridProps> = ({ items, onDelete, onUpdate, onAddMore, language }) => {
  const [filter, setFilter] = useState<ClothingCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const t = translations[language];

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                        item.description.toLowerCase().includes(search.toLowerCase()) ||
                        item.color.toLowerCase().includes(search.toLowerCase()) ||
                        item.style.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = ['all', ...Object.values(ClothingCategory)];

  return (
    <div className="space-y-8 sm:space-y-10 relative pb-32 sm:pb-0">
      <div className="flex flex-row items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-black tracking-tight flex items-center gap-3">
             {t.title} <Sparkles size={24} className="text-[#FFD166]" strokeWidth={2.5} />
          </h2>
        </div>
        <button 
          onClick={onAddMore}
          className="hidden sm:flex items-center justify-center gap-2 bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:shadow-[#6B4EFF]/30 hover:-translate-y-0.5 active:translate-y-1 active:translate-x-1 active:shadow-none px-5 py-2.5 rounded-xl font-black text-sm transition-all shrink-0"
        >
          <PlusCircle size={18} strokeWidth={2.5} />
          <span>{t.add}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 -mx-2 sm:mx-0 sm:px-0">
          <div className="w-2 sm:hidden shrink-0"></div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-5 sm:px-6 py-2.5 sm:py-2.5 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm font-black capitalize whitespace-nowrap transition-all ${
                filter === cat 
                ? 'bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000]' 
                : 'bg-white text-black hover:text-black hover:bg-white border-[3px] border-black'
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="w-2 sm:hidden shrink-0"></div>
        </div>
        <div className="relative flex-1 group hidden sm:block max-w-xs ml-auto">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-black transition-colors w-4 h-4 z-10" strokeWidth={2.5} />
          <input 
            type="text" 
            placeholder={t.placeholder} 
            className="w-full pl-5 pr-10 py-2.5 bg-white border-[3px] border-black rounded-2xl sm:rounded-[2rem] transition-all text-sm font-black text-black  focus:border-black focus:shadow-[2px_2px_0_0_#000] focus:outline-none placeholder:text-black"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onDelete={onDelete} 
              onUpdate={onUpdate} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 sm:py-32 bg-white border-[3px] border-black rounded-3xl ">
          <div className="mx-auto w-20 h-20 bg-[#A388EE] text-black rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6  border border-black">
            <Filter size={32} strokeWidth={2.5} />
          </div>
          <h3 className="text-black font-black text-xl tracking-tight">{t.empty}</h3>
          <p className="text-black max-w-xs mx-auto mt-2 text-sm font-black">
            No matching clothes in your closet. Try another search.
          </p>
        </div>
      )}

    </div>
  );
};

export default WardrobeGrid;
