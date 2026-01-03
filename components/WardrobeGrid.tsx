
import React, { useState } from 'react';
import { ClothingItem, ClothingCategory, Language } from '../types';
import ItemCard from './ItemCard';
import { Filter, Search, PlusCircle } from 'lucide-react';

interface WardrobeGridProps {
  items: ClothingItem[];
  onDelete: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
  onAddMore: () => void;
  language: Language;
}

const translations = {
  en: { title: 'My Closet', add: 'Add More', placeholder: 'Search colors, vibes, or names...', empty: 'Nothing found' },
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
    const matchesFilter = filter === 'all' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                        item.description.toLowerCase().includes(search.toLowerCase()) ||
                        item.color.toLowerCase().includes(search.toLowerCase()) ||
                        item.style.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = ['all', ...Object.values(ClothingCategory)];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{items.length} Total Items</p>
        </div>
        <button 
          onClick={onAddMore}
          className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 active:scale-95"
        >
          <PlusCircle size={24} />
          {t.add}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" size={24} />
          <input 
            type="text" 
            placeholder={t.placeholder} 
            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-medium shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-8 py-4 rounded-[1.5rem] text-sm font-black capitalize whitespace-nowrap transition-all tracking-tight ${
                filter === cat 
                ? 'bg-slate-900 text-white shadow-xl' 
                : 'bg-white text-slate-500 border-2 border-slate-50 hover:border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
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
        <div className="text-center py-32 bg-white border-4 border-dashed border-slate-100 rounded-[3rem]">
          <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
            <Filter size={48} />
          </div>
          <h3 className="text-slate-800 font-black text-2xl tracking-tight">{t.empty}</h3>
          <p className="text-slate-400 max-w-xs mx-auto mt-4 text-lg font-medium">
            No matching clothes in your closet. Try another search.
          </p>
        </div>
      )}
    </div>
  );
};

export default WardrobeGrid;
