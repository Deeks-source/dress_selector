
import React, { useState, useRef, useEffect } from 'react';
import { ClothingItem, ClothingCategory } from '../types';
import { analyzeClothingImage } from '../services/geminiService';
import { Loader2, CheckCircle2, AlertCircle, X, ImageIcon, Plus, Scissors, ArrowRight, Wand2, ClipboardPaste } from 'lucide-react';

interface OnboardingProps {
  onItemsAdded: (items: ClothingItem[]) => void;
  wardrobe: ClothingItem[];
  onComplete: () => void;
}

interface PendingUpload {
  id: string;
  base64: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ onItemsAdded, wardrobe, onComplete }) => {
  const [pendingQueue, setPendingQueue] = useState<PendingUpload[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newPending: PendingUpload[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const compressedBase64 = await compressImage(file);
              newPending.push({ id: Math.random().toString(36).substr(2, 9), base64: compressedBase64 });
            } catch (err) {
              setError("An image from clipboard could not be loaded.");
            }
          }
        }
      }

      if (newPending.length > 0) {
        setPendingQueue(prev => [...prev, ...newPending]);
        setError(null);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const hasShirt = wardrobe.some(i => i.category === ClothingCategory.SHIRT);
  const hasPants = wardrobe.some(i => i.category === ClothingCategory.PANTS);
  // We keep this purely as a visual indicator for the user to help them get started
  const isRecommendedMet = hasShirt && hasPants;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  const cropItem = (originalBase64: string, box: number[]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = originalBase64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const [ymin, xmin, ymax, xmax] = box;
        const left = (xmin / 1000) * img.width;
        const top = (ymin / 1000) * img.height;
        const width = ((xmax - xmin) / 1000) * img.width;
        const height = ((ymax - ymin) / 1000) * img.height;
        const padding = Math.min(width, height) * 0.1;
        const pLeft = Math.max(0, left - padding);
        const pTop = Math.max(0, top - padding);
        const pWidth = Math.min(img.width - pLeft, width + padding * 2);
        const pHeight = Math.min(img.height - pTop, height + padding * 2);
        canvas.width = pWidth;
        canvas.height = pHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, pLeft, pTop, pWidth, pHeight, 0, 0, pWidth, pHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    });
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    const newPending: PendingUpload[] = [];
    for (const file of Array.from(files) as File[]) {
      try {
        const compressedBase64 = await compressImage(file);
        newPending.push({ id: Math.random().toString(36).substr(2, 9), base64: compressedBase64 });
      } catch (err) { setError("One or more images could not be loaded."); }
    }
    setPendingQueue(prev => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startBatchProcessing = async () => {
    // If user clicks button and queue is empty, they must want to proceed if items exist
    if (pendingQueue.length === 0) {
      if (wardrobe.length > 0) onComplete();
      return;
    }

    setAnalyzing(true);
    setError(null);
    const successfullyProcessed: ClothingItem[] = [];

    for (let i = 0; i < pendingQueue.length; i++) {
      setProcessingIndex(i);
      const pending = pendingQueue[i];
      try {
        const analysis = await analyzeClothingImage(pending.base64);
        if (analysis && analysis.length > 0) {
          for (const res of analysis) {
            const croppedBase64 = Array.isArray(res.box_2d) && res.box_2d.length === 4 
              ? await cropItem(pending.base64, res.box_2d)
              : pending.base64;
            successfullyProcessed.push({
              id: Math.random().toString(36).substr(2, 9),
              image: croppedBase64,
              name: res.name || 'Unnamed Item',
              category: (res.category as ClothingCategory) || ClothingCategory.OTHER,
              silhouette: res.silhouette || 'tee',
              color: res.color || 'Unknown',
              hexColor: res.hexColor || '#CBD5E1',
              material: res.material || 'Unknown',
              pattern: res.pattern || 'Solid',
              style: res.style || 'Casual',
              season: res.season || 'All-season',
              description: res.description || 'No description provided.',
              wearCount: 0 
            });
          }
        }
      } catch (err) {
        setError(`AI error. Try clear lighting.`);
      }
    }

    if (successfullyProcessed.length > 0) {
      onItemsAdded(successfullyProcessed);
      setPendingQueue([]);
      // FIX: Immediately allow transition after processing if items were found
      onComplete();
    } else {
      setError("No clothes detected. Try taking a clearer photo on a plain background.");
    }
    setAnalyzing(false);
    setProcessingIndex(null);
  };

  const handlePasteClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const newPending: PendingUpload[] = [];
      
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], "pasted-image.png", { type });
            const compressedBase64 = await compressImage(file);
            newPending.push({ id: Math.random().toString(36).substr(2, 9), base64: compressedBase64 });
          }
        }
      }

      if (newPending.length > 0) {
        setPendingQueue(prev => [...prev, ...newPending]);
        setError(null);
      } else {
        setError("No image found in clipboard. Try copying an image first.");
      }
    } catch (err) {
      setError("Unable to access clipboard. Please use Ctrl+V or upload manually.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-[800ms] pb-32 px-4">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#A388EE] text-black rounded-2xl sm:rounded-[2rem] text-[10px] sm:text-xs font-black uppercase tracking-wider  border border-black">
          <Scissors size={14} className="" strokeWidth={2.5}/> Style Extraction
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-black tracking-tight leading-tight">Digital Boutique</h2>
        <p className="text-black text-sm sm:text-base font-black max-w-lg mx-auto leading-relaxed">
          Upload clear photos. AI will extract your clothes and design your boutique.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className={`p-4 sm:p-5 rounded-3xl border flex items-center justify-between transition-all ${hasShirt ? 'border-transparent bg-[#A388EE]  text-black' : 'border-black bg-white shadow-[4px_4px_0_0_#000]'}`}>
          <div className="flex flex-col">
            <span className={`text-xs sm:text-sm font-black tracking-tight ${hasShirt ? 'text-black' : 'text-black'}`}>SHIRTS</span>
            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${hasShirt ? 'text-black/70' : 'text-black'}`}>{hasShirt ? 'Ready' : 'Missing'}</span>
          </div>
          {hasShirt ? <CheckCircle2 size={24} className="text-black sm:w-7 sm:h-7" /> : <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-2xl sm:rounded-[2rem] border-2 border-black border-dashed" />}
        </div>
        <div className={`p-4 sm:p-5 rounded-3xl border flex items-center justify-between transition-all ${hasPants ? 'border-transparent bg-[#A388EE]  text-black' : 'border-black bg-white shadow-[4px_4px_0_0_#000]'}`}>
          <div className="flex flex-col">
            <span className={`text-xs sm:text-sm font-black tracking-tight ${hasPants ? 'text-black' : 'text-black'}`}>PANTS</span>
            <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${hasPants ? 'text-black/70' : 'text-black'}`}>{hasPants ? 'Ready' : 'Missing'}</span>
          </div>
          {hasPants ? <CheckCircle2 size={24} className="text-black sm:w-7 sm:h-7" /> : <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-2xl sm:rounded-[2rem] border-2 border-black border-dashed" />}
        </div>
      </div>

      {!analyzing && (
        <div className="space-y-4">
          <div className="relative group">
            <input type="file" multiple ref={fileInputRef} accept="image/*" onChange={handleFileSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="border border-dashed border-black rounded-[2rem] sm:rounded-[2.5rem] p-10 sm:p-16 text-center transition-all group-hover:bg-white group-hover:border-black bg-white group-hover:scale-[1.01]">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-[#A388EE] border border-white rounded-[1.5rem] flex items-center justify-center text-black mb-4 sm:mb-6  group-hover:scale-105 group-hover:rotate-3 transition-transform">
                <Plus size={32} strokeWidth={2.5} className="sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight">Select Photos</h3>
              <p className="text-black mt-2 sm:mt-3 text-sm font-black">Clear photos of individual items work best.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handlePasteClick}
              className="flex-1 bg-white border-[3px] border-black p-4 rounded-2xl font-black text-black flex items-center justify-center gap-3 hover:bg-[#F4F1FD] transition-all shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none"
            >
              <ClipboardPaste size={20} className="text-[#A388EE]" strokeWidth={2.5} />
              <span>Paste from Clipboard (Ctrl+V)</span>
            </button>
          </div>
        </div>
      )}

      {pendingQueue.length > 0 && (
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-[3px] border-black  space-y-6">
          <h4 className="text-lg sm:text-xl font-black text-black flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#A388EE] text-black flex items-center justify-center text-sm font-black">{pendingQueue.length}</div>
            Queued for Boutique
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {pendingQueue.map((pending, idx) => (
              <div key={pending.id} className={`aspect-[4/5] rounded-2xl overflow-hidden relative border-[3px] border-black transition-all duration-500  ${analyzing && processingIndex === idx ? 'border-black shadow-[2px_2px_0_0_#000] shadow-[#6B4EFF]/10 scale-[1.02] z-10' : ''}`}>
                <img src={pending.base64} alt="Pending" className={`w-full h-full object-cover transition-all duration-700 ${analyzing && processingIndex !== idx ? 'blur-[2px] opacity-70' : 'hover:scale-105'}`} />
                {!analyzing && (
                  <button onClick={() => setPendingQueue(prev => prev.filter(p => p.id !== pending.id))} className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm text-black border-[3px] border-black rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all ">
                    <X size={16} strokeWidth={2.5}/>
                  </button>
                )}
                {analyzing && processingIndex === idx && (
                   <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[1px] z-20">
                     <div className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-[#06D6A0]  animate-pulse border border-white">
                        <Wand2 size={24} strokeWidth={2.5} />
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {analyzing && (
            <div className="pt-6 space-y-3">
              <div className="flex justify-between text-[10px] font-black text-black uppercase tracking-wider">
                <span>Designing Digital Boutique...</span>
                <span>{Math.round(((processingIndex! + 1) / pendingQueue.length) * 100)}%</span>
              </div>
              <div className="w-full bg-[#EAEAEA] h-3 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-inner relative">
                <div className="bg-[#CCFF00] h-full transition-all duration-1000 ease-in-out relative flex items-center justify-center overflow-hidden" style={{ width: `${((processingIndex! + 1) / pendingQueue.length) * 100}%` }}>
                   <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1.5rem_1.5rem] animate-[stripes_1s_linear_infinite]" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 p-6 rounded-2xl flex items-center gap-4  animate-in slide-in-from-top-4">
          <AlertCircle size={24} strokeWidth={2.5}/>
          <p className="text-sm font-black">{error}</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t-[3px] border-black px-4 py-4 sm:py-6 z-50 flex flex-col gap-3">
        <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row gap-3">
          {wardrobe.length > 0 && !analyzing && pendingQueue.length === 0 && (
            <button 
              onClick={onComplete}
              className="flex-1 flex items-center justify-center gap-2 text-black font-black text-sm bg-[#EAEAEA] hover:bg-[#D0D0D0] py-4 rounded-2xl transition-all"
            >
              Enter Boutique <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={startBatchProcessing}
            disabled={analyzing || (pendingQueue.length === 0 && wardrobe.length === 0)}
            className={`flex-[2] py-4 rounded-2xl font-black text-sm sm:text-base transition-all flex items-center justify-center gap-2 sm:gap-3  ${
              analyzing 
              ? 'bg-[#EAEAEA] text-black cursor-not-allowed' 
              : pendingQueue.length > 0 
                ? 'bg-[#CCFF00] text-black shadow-[#6B4EFF]/20 hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-0.5 active:translate-y-1 active:translate-x-1 active:shadow-none' 
                : wardrobe.length > 0 ? 'bg-[#CCFF00] text-black shadow-[#6B4EFF]/20 hover:shadow-[8px_8px_0_0_#000] hover:-translate-y-0.5 active:translate-y-1 active:translate-x-1 active:shadow-none' : 'bg-[#EAEAEA] text-black cursor-not-allowed'
            }`}
          >
            {analyzing ? (
              <><Loader2 className="animate-spin" size={20} strokeWidth={2.5}/> Processing...</>
            ) : pendingQueue.length > 0 ? (
              <><Wand2 size={20} strokeWidth={2.5}/> Launch Boutique extraction</>
            ) : wardrobe.length > 0 ? (
              <><ArrowRight size={20} strokeWidth={2.5}/> Enter Boutique</>
            ) : (
              <><ImageIcon size={20} strokeWidth={2.5}/> Add to Closet ({pendingQueue.length})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
