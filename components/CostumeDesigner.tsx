
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
  const common = { fill: color, stroke: 'white', strokeWidth: '1' };
  switch (silhouette?.toLowerCase()) {
    case 'tee': return <path {...common} d="M12 4L16 6V10H14V20H10V10H8V6L12 4Z" />;
    case 'jeans': return <path {...common} d="M7 4H17L19 20H13L12 12L11 20H5L7 4Z" />;
    case 'hoodie': return <path {...common} d="M12 2C10 2 8 4 8 6L4 8V12H6V20H18V12H20V8L16 6C16 4 14 2 12 2Z" />;
    case 'sneakers': return <path {...common} d="M4 18L6 14L14 14L20 18V20H4V18Z" />;
    case 'jacket': return <path {...common} d="M12 4L18 6V20H6V6L12 4ZM12 6L9 20H15L12 6Z" />;
    default: return <rect {...common} x="6" y="7" width="12" height="10" rx="2" />;
  }
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
    <div className="group bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-3xl transition-all duration-500 flex flex-col">
      {/* Visual Area */}
      <div className="aspect-[3/4] bg-slate-50 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 blur-[80px]" style={{ backgroundColor: product.hexColor }} />
        
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
          <div className="p-16 w-full h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in">
             <svg viewBox="0 0 24 24" className="w-24 h-24 drop-shadow-2xl opacity-80">
                <SilhouetteIcon silhouette={product.silhouette} color={product.hexColor} />
             </svg>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">
               {imgError ? 'Visual Syncing...' : 'Fetching Live Image...'}
             </span>
          </div>
        )}

        <div className="absolute top-8 left-8 flex flex-col gap-2">
          <div className="bg-green-500 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-lg border border-white/20 animate-in slide-in-from-left-2">
             <CheckCircle2 size={10} /> Product Matched
          </div>
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-lg border border-white/20">
             <ShieldCheck size={10} /> Secure Link
          </div>
        </div>

        <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-xl px-6 py-4 rounded-[2rem] text-xl font-black text-indigo-600 shadow-2xl border border-indigo-50">
          {product.price}
        </div>
        
        <div className="absolute bottom-8 left-8 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
          <Tag size={14} className="text-indigo-400" />
          {product.store}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-10 flex-1 flex flex-col">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.store} • Official Listing</span>
            <h4 className="text-2xl font-black text-slate-900 leading-[1.1] group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h4>
          </div>
          
          <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
             <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
               <Sparkles size={12} /> Why it fits:
             </p>
             <p className="text-sm font-bold text-slate-700 leading-snug">
               {product.reason}
             </p>
          </div>

          <a 
            href={product.url} target="_blank" rel="noopener noreferrer"
            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-center flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95 group/btn"
          >
            Go to {product.store} <ExternalLink size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </a>
        </div>

        {/* Feedback Section */}
        <div className="mt-10 pt-10 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
             <MessageSquare size={16} className="text-slate-400" />
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Feedback Memory</span>
          </div>
          
          {product.userFeedback ? (
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
               <p className="text-xs font-bold text-indigo-700">"{product.userFeedback}"</p>
               <button 
                 onClick={() => setFeedbackInputs({...feedbackInputs, [product.id]: ''})}
                 className="text-indigo-400 hover:text-rose-500 transition-colors"
               >
                  <Trash2 size={14} />
               </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Dislike brand? Price high? Tell us..."
                className="flex-1 bg-slate-50 px-4 py-3 rounded-xl text-xs font-medium outline-none border border-transparent focus:bg-white focus:border-indigo-100 transition-all"
                value={feedbackInputs[product.id] || ''}
                onChange={(e) => setFeedbackInputs({...feedbackInputs, [product.id]: e.target.value})}
              />
              <button 
                onClick={() => handleSaveFeedback(product.id)}
                disabled={!feedbackInputs[product.id]}
                className="p-3 bg-white text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30"
              >
                <Save size={18} />
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
        <div className="mx-auto w-32 h-32 bg-slate-100 rounded-[3.5rem] flex items-center justify-center text-slate-300">
          <ShoppingBag size={64} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Your Closet is Empty</h2>
        <p className="text-slate-500 font-medium">Add clothes to your boutique first so the designer knows your style.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-16 pb-32 px-4 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 border-b border-slate-200 pb-12">
        <div className="space-y-4">
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
            <ShoppingBag className="text-indigo-600" size={56} /> Shop The Look
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-xl border border-indigo-100 flex items-center gap-2">
               <MapPin size={12} /> {locationStr || "Locating..."}
            </div>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
               {(['budget', 'standard', 'premium'] as PriceTier[]).map((tier) => (
                 <button
                   key={tier}
                   onClick={() => setPriceTier(tier)}
                   className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     priceTier === tier ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                   }`}
                 >
                   <div className="flex items-center gap-1">
                      {tier === 'premium' ? <Sparkles size={12}/> : <DollarSign size={12} />}
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
          className="flex items-center gap-4 bg-indigo-600 text-white px-12 py-6 rounded-[2.5rem] font-black shadow-3xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <RefreshCcw size={24} />}
          <div className="text-left">
            <p className="text-xl leading-none">Generate {priceTier} Items</p>
            <p className="text-[10px] opacity-60 font-black tracking-widest uppercase mt-1">Cross-Verified Grounding</p>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="py-40 text-center space-y-10 animate-pulse">
           <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
              <Loader2 size={100} className="text-indigo-600 animate-spin absolute" />
              <div className="relative z-10 bg-white p-4 rounded-full shadow-2xl">
                 <ShieldCheck size={40} className="text-green-500" />
              </div>
           </div>
           <h3 className="text-4xl font-black text-slate-800 tracking-tight">Syncing Store Catalogs...</h3>
           <p className="text-slate-400 font-bold uppercase tracking-widest text-sm max-w-md mx-auto">
             Cross-referencing product images with live store URLs to ensure perfect visual synchronization.
           </p>
        </div>
      ) : cache ? (
        <div className="space-y-20">
          <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-indigo-50 flex flex-col md:flex-row gap-10 items-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white flex-shrink-0 shadow-lg">
              <Sparkles size={32} />
            </div>
            <p className="text-3xl font-bold text-slate-800 leading-tight italic">
              "{cache.advice}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-12">
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
        <div className="py-40 text-center">
           <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <DollarSign size={40} />
           </div>
           <h3 className="text-2xl font-black text-slate-800">Designer Catalog Ready</h3>
           <p className="text-slate-400 font-medium">Select your budget and click Generate to see verified matches.</p>
        </div>
      )}
    </div>
  );
};

export default CostumeDesigner;
