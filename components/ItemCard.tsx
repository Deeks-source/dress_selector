
import React, { useState } from 'react';
import { ClothingItem, ClothingCategory } from '../types';
import { Trash2, Edit3, Palette, Box, Tag, Camera, Sparkles, Shirt } from 'lucide-react';

interface ItemCardProps {
  item: ClothingItem;
  onDelete: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
}

// Minimalist Silhouette Icons as SVG Components
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

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [editData, setEditData] = useState<ClothingItem>(item);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <div className="group bg-white rounded-3xl sm:rounded-[2.5rem] border-[3px] border-black  overflow-hidden hover:shadow-[6px_6px_0_0_#000] transition-all duration-500">
      {/* Visual Area */}
      <div className="aspect-[4/5] relative bg-[#FFF4E0] flex flex-col p-3 sm:p-6 pb-4 sm:pb-6">
        
        {showPhoto ? (
          /* Real Photo (Reality Mode) */
          <div className="absolute inset-0 z-10 animate-in fade-in zoom-in-95 duration-300">
            <img 
              src={item.image} 
              alt={item.name} 
              className="w-full h-full object-cover"
            />
            {/* Overlay buttons to remain accessible */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 right-4 sm:right-6 flex justify-between items-start z-20">
              <div className="flex flex-col gap-2">
                <span className="px-2 py-1.5 sm:px-4 sm:py-2 bg-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-2xl text-black border-[3px] border-black shadow-[4px_4px_0_0_#000]">
                  {item.category}
                </span>
                <span className="px-2 py-1.5 sm:px-3 sm:py-1.5 bg-[#CCFF00] text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl text-black border-[3px] border-black shadow-[2px_2px_0_0_#000] w-fit">
                  Worn {item.wearCount || 0}x
                </span>
              </div>
              <button 
                onClick={() => setShowPhoto(false)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-[3px] border-black active:translate-y-1 active:translate-x-1 active:shadow-none transition-all outline-none bg-white text-black shadow-[4px_4px_0_0_#000] hover:bg-gray-50`}
                title="Switch to Studio Mode"
              >
                <Sparkles size={18} strokeWidth={2.5}/>
              </button>
            </div>
            <span className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 px-2 py-1.5 sm:px-4 sm:py-2 bg-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-2xl text-black border-[3px] border-black shadow-[4px_4px_0_0_#000]">
              Original
            </span>
          </div>
        ) : (
          /* Digital Twin (Studio Mode) */
          <div className="w-full h-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300 relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                <span className="px-2 py-1.5 sm:px-4 sm:py-2 bg-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-2xl text-black border-[3px] border-black shadow-[4px_4px_0_0_#000]">
                  {item.category}
                </span>
                <span className="px-2 py-1.5 sm:px-3 sm:py-1.5 bg-[#CCFF00] text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl text-black border-[3px] border-black shadow-[2px_2px_0_0_#000] w-fit">
                  Worn {item.wearCount || 0}x
                </span>
              </div>
              <button 
                onClick={() => setShowPhoto(true)}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-[3px] border-black active:translate-y-1 active:translate-x-1 active:shadow-none transition-all outline-none bg-white text-black shadow-[4px_4px_0_0_#000] hover:bg-gray-50`}
                title="View Actual Photo"
              >
                <Camera size={18} strokeWidth={2.5}/>
              </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center -mt-4">
              <div className="w-[70px] h-[70px] sm:w-[140px] sm:h-[140px] relative flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-full h-full opacity-100 filter drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                  <SilhouetteIcon silhouette={item.silhouette} color={item.hexColor} category={item.category} />
                </svg>
              </div>
            </div>

            <div className="w-full text-center">
               <span className="text-[9px] sm:text-[11px] font-black tracking-widest text-black uppercase">Studio Visual</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 bg-white flex flex-col justify-between flex-1">
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in duration-300">
             <div>
              <label className="text-[10px] font-black text-black uppercase tracking-wider mb-1.5 block">Friendly Name</label>
              <input 
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({...editData, name: e.target.value})}
                className="w-full text-sm sm:text-base font-black bg-white border-[3px] border-black px-4 py-3 focus:bg-white focus:border-black focus: outline-none rounded-xl transition-all"
              />
            </div>
            <div className="flex gap-2 sm:gap-3 pt-2">
              <button onClick={handleSave} className="flex-1 bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-[#5A3EE0] hover:shadow-[8px_8px_0_0_#000] py-3 rounded-xl font-black text-xs transition-all">Save</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-white text-black border-[3px] border-black active:translate-y-1 active:translate-x-1 active:shadow-none hover:bg-white py-3 rounded-xl font-black text-xs transition-all">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col flex-1 min-w-0">
              <h4 className="text-lg sm:text-[22px] font-black text-black leading-[1.1] mb-2 line-clamp-2 break-words whitespace-normal">{item.name}</h4>
              <p className="text-[11px] sm:text-[13px] font-black text-black line-clamp-2 leading-snug">
                {item.description}
              </p>
              <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button onClick={() => setIsEditing(true)} className="p-2 sm:p-2.5 bg-white border-[3px] border-black text-black rounded-[14px] hover:bg-gray-50 transition-all active:translate-y-1 active:translate-x-1 active:shadow-none outline-none">
                  <Edit3 size={18} strokeWidth={2.5}/>
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2 sm:p-2.5 bg-white border-[3px] border-black text-black rounded-[14px] hover:bg-gray-50 transition-all active:translate-y-1 active:translate-x-1 active:shadow-none outline-none">
                  <Trash2 size={18} strokeWidth={2.5}/>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 sm:gap-3 pt-2 sm:pt-3 mt-1 sm:pt-4 sm:mt-2 border-t-[3px] border-black">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full shrink-0 border-[3px] border-black" style={{ backgroundColor: item.hexColor }} />
                <span className="text-xs sm:text-[14px] font-black leading-none text-black truncate">{item.color}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Box size={20} className="text-black shrink-0" strokeWidth={2.5}/>
                <span className="text-xs sm:text-[14px] font-black leading-none text-black truncate">{item.material}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Tag size={18} className="text-black shrink-0" strokeWidth={2.5}/>
                <span className="text-xs sm:text-[14px] font-black leading-none text-black truncate">Worn {item.wearCount || 0} times</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
