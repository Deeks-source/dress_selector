
import React, { useState, useEffect } from 'react';
import { ClothingItem, Language, DesignerState, DesignerProduct, PriceTier } from '../types';
import { getShoppingSuggestions } from '../services/geminiService';
import { ShoppingBag, Sparkles, Loader2, MapPin, ExternalLink, RefreshCcw, Tag, MessageSquare, Save, Trash2, DollarSign, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CostumeDesignerProps {
  wardrobe: ClothingItem[];
  language: Language;
  cache: DesignerState | null;
  setCache: (state: DesignerState) => void;
}

const SilhouetteIcon: React.FC<{ silhouette: string, color: string }> = ({ silhouette, color }) => {
  const common = { fill: color, stroke: '#000', strokeWidth: '2.5', strokeLinejoin: 'round' as any, strokeLinecap: 'round' as any };
  const s = (silhouette || 'tee').toLowerCase();
  
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

interface ProductCardProps {
  product: DesignerProduct;
  feedbackInputs: Record<string, string>;
  setFeedbackInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSaveFeedback: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, feedbackInputs, setFeedbackInputs, handleSaveFeedback }) => {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="group bg-white rounded-[2rem] border-[3px] border-black shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:shadow-[2px_2px_0_0_#000] overflow-hidden hover:shadow-[6px_6px_0_0_#000] transition-all duration-500 flex flex-col">
      {/* Visual Area */}
      <div className="aspect-[3/4] bg-[#FFF4E0] relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] blur-[60px]" style={{ backgroundColor: product.hexColor }} />
        
        {product.imageUrl && !imgError ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0 scale-95'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : null}

        {(!isLoaded || imgError) && (
          <div className="p-8 sm:p-16 w-full h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
             <svg viewBox="0 0 24 24" className="w-12 h-12 sm:w-20 sm:h-20 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] opacity-100">
                <SilhouetteIcon silhouette={product.silhouette} color={product.hexColor} />
             </svg>
             <span className="text-[10px] font-black text-black uppercase tracking-wider text-center">
               {imgError ? 'Visual Syncing...' : 'Fetching Live Image...'}
             </span>
          </div>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-[#E3FBCC] text-[#06D6A0] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1  animate-in slide-in-from-left-2 backdrop-blur-md">
             <CheckCircle2 size={12} strokeWidth={2.5}/> Product Matched
          </div>
          <div className="bg-white/90 text-black px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1  backdrop-blur-md border-[3px] border-black">
             <ShieldCheck size={12} strokeWidth={2.5} /> Secure Link
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-white/90 px-4 py-2 rounded-xl text-lg font-black text-black  border-[3px] border-black backdrop-blur-md">
          {product.price}
        </div>
        
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 px-4 py-2 rounded-xl text-[10px] font-black text-black uppercase tracking-wider  border-[3px] border-black backdrop-blur-md">
          <Tag size={12} className="text-black" strokeWidth={2.5} />
          {product.store}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-5 sm:p-8 bg-white flex-1 flex flex-col">
        <div className="flex-1 space-y-4 sm:space-y-5">
          <div className="space-y-1">
            <span className="text-[9px] sm:text-[10px] font-black text-black uppercase tracking-wider bg-white border-[3px] border-black rounded-md px-2 py-1 ">{product.store} • Official Listing</span>
            <h4 className="text-lg sm:text-[22px] font-black text-black leading-[1.1] pt-2 line-clamp-2 break-words whitespace-normal">
              {product.name}
            </h4>
          </div>
          
          <div className="p-4 bg-[#A388EE] rounded-2xl border border-black ">
             <p className="text-[9px] font-black text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
               <Sparkles size={12} strokeWidth={2.5} /> Why it fits:
             </p>
             <p className="text-xs sm:text-sm font-black text-black leading-relaxed">
               {product.reason}
             </p>
          </div>

          <a 
            href={product.url} target="_blank" rel="noopener noreferrer"
            className="w-full bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000] hover:bg-[#5A3EE0] hover:shadow-[8px_8px_0_0_#000] hover:shadow-[#6B4EFF]/30 py-4 rounded-xl font-black text-sm text-center flex items-center justify-center gap-2 active:translate-y-1 active:translate-x-1 active:shadow-none transition-all group/btn"
          >
            Go to store <ExternalLink size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" strokeWidth={2.5} />
          </a>
        </div>

        {/* Feedback Section */}
        <div className="mt-8 pt-6 border-t-[3px] border-black space-y-4">
          <div className="flex items-center gap-2">
             <MessageSquare size={14} className="text-black" strokeWidth={2.5} />
             <span className="text-[9px] font-black uppercase text-black tracking-wider">Feedback Memory</span>
          </div>
          
          {product.userFeedback ? (
            <div className="flex items-center justify-between p-3.5 bg-red-50 rounded-xl border border-red-100 ">
               <p className="text-xs font-black text-red-800">"{product.userFeedback}"</p>
               <button 
                 onClick={() => setFeedbackInputs({...feedbackInputs, [product.id]: ''})}
                 className="text-red-500 bg-white rounded-lg p-1.5  border border-red-100 hover:scale-110 transition-transform"
               >
                  <Trash2 size={14} strokeWidth={2.5} />
               </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Dislike brand? Price high? Tell us..."
                className="flex-1 bg-white px-4 py-3 rounded-xl text-xs font-black outline-none border-[3px] border-black transition-all text-black placeholder:text-black focus:bg-white focus:border-black focus:"
                value={feedbackInputs[product.id] || ''}
                onChange={(e) => setFeedbackInputs({...feedbackInputs, [product.id]: e.target.value})}
              />
              <button 
                onClick={() => handleSaveFeedback(product.id)}
                disabled={!feedbackInputs[product.id]}
                className="p-3 bg-white text-black border-[3px] border-black  rounded-xl hover:bg-[#A388EE] hover:border-black transition-all disabled:opacity-50 disabled:bg-white disabled:text-black active:translate-y-1 active:translate-x-1 active:shadow-none"
              >
                <Save size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CostumeDesigner: React.FC<CostumeDesignerProps> = ({ wardrobe, language, cache, setCache }) => {
  const [loading, setLoading] = useState(false);
  const [locationStr, setLocationStr] = useState<string | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [priceTier, setPriceTier] = useState<PriceTier>('budget');

  const favorites = [...wardrobe].sort((a, b) => b.wearCount - a.wearCount).filter(i => i.wearCount > 0).slice(0, 3);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocationStr(`Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`);
      }, () => setLocationStr("Global"));
    }
  }, []);

  const refreshLookbook = async () => {
    if (loading) return;
    setLoading(true);
    
    const pastFeedback = (cache?.products || [])
      .filter(p => p.userFeedback)
      .map(p => `${p.name}: ${p.userFeedback}`);

    try {
      const result = await getShoppingSuggestions(wardrobe, locationStr, pastFeedback, priceTier, language);
      if (result) {
        setCache({
          lastUpdated: new Date().toISOString(),
          products: result.products || [],
          advice: result.advice || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeedback = (productId: string) => {
    if (!cache) return;
    const text = feedbackInputs[productId];
    const updatedProducts = cache.products.map(p => 
      p.id === productId ? { ...p, userFeedback: text } : p
    );
    setCache({ ...cache, products: updatedProducts });
  };

  if (wardrobe.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center space-y-8 animate-in fade-in">
        <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 sm:w-32 sm:h-32 bg-[#A388EE] text-black rounded-2xl sm:rounded-[2rem] flex items-center justify-center shadow-[4px_4px_0_0_#000]">
          <ShoppingBag size={48} strokeWidth={2.5} className="sm:w-16 sm:h-16" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-5xl font-black text-black tracking-tight">Your Closet is Empty</h2>
          <p className="text-black font-black text-lg max-w-sm mx-auto mt-4">Add clothes to your boutique first so the designer knows your style.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-32 px-4 sm:px-6 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 sm:gap-8 border-b-[3px] border-black pb-8 sm:pb-10">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-5xl font-black text-black tracking-tight flex items-center gap-3 sm:gap-4">
            <ShoppingBag className="text-black w-10 h-10 sm:w-12 sm:h-12" strokeWidth={2.5}/> Shop The Look
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-black text-[10px] sm:text-xs font-black uppercase rounded-xl border-[3px] border-black flex items-center gap-2 ">
               <MapPin size={14} strokeWidth={2.5}/> {locationStr || "Locating..."}
            </div>
            
            <div className="flex bg-white/50 p-1 rounded-xl border-[3px] border-black  flex-wrap">
               {(['budget', 'standard', 'premium'] as PriceTier[]).map((tier) => (
                 <button
                   key={tier}
                   onClick={() => setPriceTier(tier)}
                   className={`px-4 sm:px-5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                     priceTier === tier ? 'bg-[#CCFF00] text-black shadow-[4px_4px_0_0_#000]' : 'text-black hover:text-black hover:bg-[#EAEAEA]'
                   }`}
                 >
                   <div className="flex items-center gap-1.5">
                      {tier === 'premium' ? <Sparkles size={14} strokeWidth={2.5}/> : <DollarSign size={14} strokeWidth={2.5}/>}
                      {tier}
                   </div>
                 </button>
               ))}
            </div>
          </div>
        </div>
        
        <button 
           onClick={refreshLookbook}
           disabled={loading}
           className="flex items-center justify-center gap-3 sm:gap-4 bg-[#CCFF00] text-black shadow-[6px_6px_0_0_#000] hover:hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-1 active:translate-y-1 active:translate-x-1 active:shadow-none px-6 sm:px-10 py-4 sm:py-5 rounded-[2rem] font-black transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5}/> : <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5}/>}
          <div className="text-left">
            <p className="text-base sm:text-lg leading-tight">Generate {priceTier} Items</p>
            <p className="text-[9px] sm:text-[10px] text-black/70 font-black tracking-wider uppercase mt-1">Cross-Verified Grounding</p>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="py-32 text-center space-y-8 animate-pulse">
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <Loader2 size={100} className="text-black animate-spin absolute z-0 opacity-20" strokeWidth={2}/>
              <div className="relative z-10 bg-[#A388EE] p-5 rounded-3xl  border border-black">
                 <ShieldCheck size={40} className="text-black" strokeWidth={2.5}/>
              </div>
           </div>
           <h3 className="text-2xl sm:text-4xl font-black text-black tracking-tight">Syncing Store Catalogs...</h3>
           <p className="text-black font-black text-sm sm:text-base max-w-sm mx-auto">
             Cross-referencing product images with live store URLs to ensure perfect visual synchronization.
           </p>
        </div>
      ) : cache ? (
        <div className="space-y-8 sm:space-y-12 flex-1 min-h-0">
           <div className="bg-[#FFF4E0] p-4 sm:p-10 rounded-3xl border-[3px] border-black  flex flex-col md:flex-row gap-5 sm:gap-8 items-center animate-in zoom-in-95">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#A388EE] rounded-2xl flex items-center justify-center text-black flex-shrink-0  border border-white">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5}/>
            </div>
            <p className="text-lg sm:text-xl font-black text-black leading-relaxed text-center md:text-left italic">
              "{cache.advice}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-8 sm:gap-10">
            {cache.products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                feedbackInputs={feedbackInputs}
                setFeedbackInputs={setFeedbackInputs}
                handleSaveFeedback={handleSaveFeedback}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-32 text-center text-black">
           <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6  border-[3px] border-black">
              <DollarSign size={40} className="text-black" />
           </div>
           <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight mb-2">Designer Catalog Ready</h3>
           <p className="text-sm font-black">Select your budget and click Generate to see verified matches.</p>
        </div>
      )}
    </div>
  );
};

export default CostumeDesigner;
