
import React, { useState } from 'react';
import { ClothingItem, ClothingCategory } from '../types';
import { Trash2, Edit3, Palette, Box, Tag, Camera, Sparkles, Shirt } from 'lucide-react';

interface ItemCardProps {
  item: ClothingItem;
  onDelete: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
}

// Minimalist Silhouette Icons as SVG Components
const SilhouetteIcon = ({ silhouette, color, category }: { silhouette: string, color: string, category: string }) => {
  // Common styles
  const common = { fill: color, stroke: 'white', strokeWidth: '1' };
  
  // Choose SVG path based on silhouette
  switch (silhouette.toLowerCase()) {
    case 'tee':
      return <path {...common} d="M12 4L16 6V10H14V20H10V10H8V6L12 4Z" />;
    case 'hoodie':
      return <path {...common} d="M12 2C10 2 8 4 8 6L4 8V12H6V20H18V12H20V8L16 6C16 4 14 2 12 2Z" />;
    case 'polo':
      return <path {...common} d="M12 4L16 6V10H14V20H10V10H8V6L12 4ZM10 6L12 8L14 6L12 4L10 6Z" />;
    case 'dress-shirt':
      return <path {...common} d="M12 4L16 5V20H8V5L12 4ZM10 6V8H14V6L12 5L10 6Z" />;
    case 'jeans':
    case 'chinos':
    case 'pants':
      return <path {...common} d="M7 4H17L19 20H13L12 12L11 20H5L7 4Z" />;
    case 'shorts':
      return <path {...common} d="M7 4H17L18 12H13L12 10L11 12H6L7 4Z" />;
    case 'skirt':
      return <path {...common} d="M9 4H15L19 20H5L9 4Z" />;
    case 'sneakers':
      return <path {...common} d="M4 18L6 14L14 14L20 18V20H4V18Z" />;
    case 'boots':
      return <path {...common} d="M6 6V18H18L16 14H10V6H6Z" />;
    case 'watch':
      return <path {...common} d="M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2Z M12 6V12L16 14" />;
    case 'hat':
      return <path {...common} d="M12 4C8 4 4 6 4 10V12H20V10C20 6 16 4 12 4Z M2 12H22V14H2V12Z" />;
    default:
      return <rect {...common} x="6" y="6" width="12" height="12" rx="2" />;
  }
};

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [editData, setEditData] = useState<ClothingItem>(item);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div className="group bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
      {/* Visual Area */}
      <div className="aspect-[4/5] relative bg-slate-50 overflow-hidden flex items-center justify-center p-8">
        {/* Toggle Button */}
        <button 
          onClick={() => setShowPhoto(!showPhoto)}
          className={`absolute top-6 right-6 z-20 p-4 rounded-2xl shadow-xl transition-all active:scale-90 ${
            showPhoto ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'
          }`}
          title={showPhoto ? "Switch to Studio Mode" : "View Actual Photo"}
        >
          {showPhoto ? <Sparkles size={20} /> : <Camera size={20} />}
        </button>

        {/* Digital Twin (Studio Mode) */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 transition-all duration-700 ${showPhoto ? 'opacity-0 scale-90 blur-lg' : 'opacity-100 scale-100 blur-0'}`}>
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Soft Glow based on item color */}
            <div 
              className="absolute w-3/4 h-3/4 rounded-full opacity-10 blur-[60px]" 
              style={{ backgroundColor: item.hexColor }}
            />
            <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-2xl">
              <SilhouetteIcon silhouette={item.silhouette} color={item.hexColor} category={item.category} />
            </svg>
          </div>
          <span className="mt-8 text-[10px] font-black tracking-[0.2em] text-slate-300 uppercase">Studio Visual</span>
        </div>

        {/* Real Photo (Reality Mode) */}
        <div className={`absolute inset-0 transition-all duration-700 ${showPhoto ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-xl pointer-events-none'}`}>
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <span className="absolute bottom-6 left-6 text-[10px] font-black tracking-[0.2em] text-white/80 uppercase">Original Capture</span>
        </div>

        <div className="absolute top-6 left-6 z-10">
          <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-900 shadow-lg border border-white/50">
            {item.category}
          </span>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-8 space-y-5">
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in duration-300">
             <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Friendly Name</label>
              <input 
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="w-full text-xl font-bold border-b-2 border-slate-100 py-2 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95">Save</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm active:scale-95">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h4 className="text-2xl font-black text-slate-900 leading-tight mb-2">{item.name}</h4>
                <p className="text-base font-medium text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setIsEditing(true)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                  <Edit3 size={18} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-2">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: item.hexColor }} />
                <span className="text-sm font-bold truncate tracking-tight text-slate-500">{item.color}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Tag size={18} className="text-indigo-500" />
                <span className="text-sm font-bold truncate tracking-tight text-slate-500">{item.style}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Box size={18} className="text-indigo-500" />
                <span className="text-sm font-bold truncate tracking-tight text-slate-500">{item.material}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">{item.season}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
