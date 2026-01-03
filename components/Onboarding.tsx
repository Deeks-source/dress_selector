
import React, { useState, useRef } from 'react';
import { ClothingItem, ClothingCategory } from '../types';
import { analyzeClothingImage } from '../services/geminiService';
import { Loader2, CheckCircle2, AlertCircle, X, ImageIcon, Plus, Scissors, ArrowRight } from 'lucide-react';

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
            const croppedBase64 = await cropItem(pending.base64, res.box_2d);
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

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-32 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
          <Scissors size={14} /> Style Extraction
        </div>
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">Digital Boutique</h2>
        <p className="text-slate-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
          Upload clear photos. AI will extract your clothes and design your boutique.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className={`p-6 rounded-[2.5rem] border-4 flex items-center justify-between transition-all ${hasShirt ? 'border-green-100 bg-green-50' : 'border-slate-100 bg-white'}`}>
          <div className="flex flex-col">
            <span className={`text-sm font-black tracking-tight ${hasShirt ? 'text-green-700' : 'text-slate-400'}`}>SHIRTS</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{hasShirt ? 'Ready' : 'Missing'}</span>
          </div>
          {hasShirt ? <CheckCircle2 size={32} className="text-green-500" /> : <div className="w-8 h-8 rounded-full border-4 border-slate-100" />}
        </div>
        <div className={`p-6 rounded-[2.5rem] border-4 flex items-center justify-between transition-all ${hasPants ? 'border-green-100 bg-green-50' : 'border-slate-100 bg-white'}`}>
          <div className="flex flex-col">
            <span className={`text-sm font-black tracking-tight ${hasPants ? 'text-green-700' : 'text-slate-400'}`}>PANTS</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{hasPants ? 'Ready' : 'Missing'}</span>
          </div>
          {hasPants ? <CheckCircle2 size={32} className="text-green-500" /> : <div className="w-8 h-8 rounded-full border-4 border-slate-100" />}
        </div>
      </div>

      {!analyzing && (
        <div className="relative group">
          <input type="file" multiple ref={fileInputRef} accept="image/*" onChange={handleFileSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div className="border-4 border-dashed border-slate-200 rounded-[3rem] p-20 text-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/30 group-hover:scale-[1.01]">
            <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-200 group-hover:rotate-6 transition-transform">
              <Plus size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Select Photos</h3>
            <p className="text-slate-400 mt-4 text-lg font-medium">Clear photos of individual items work best.</p>
          </div>
        </div>
      )}

      {pendingQueue.length > 0 && (
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl space-y-8">
          <h4 className="text-2xl font-black text-slate-800 flex items-center gap-4">
            <ImageIcon size={28} className="text-indigo-500" />
            Queued for Boutique ({pendingQueue.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {pendingQueue.map((pending, idx) => (
              <div key={pending.id} className={`aspect-[4/5] rounded-[2rem] overflow-hidden relative border-4 transition-all duration-500 ${analyzing && processingIndex === idx ? 'border-indigo-500 scale-110 shadow-3xl z-10' : 'border-slate-50 opacity-80'}`}>
                <img src={pending.base64} alt="Pending" className={`w-full h-full object-cover ${analyzing && processingIndex !== idx ? 'blur-md' : ''}`} />
                {!analyzing && (
                  <button onClick={() => setPendingQueue(prev => prev.filter(p => p.id !== pending.id))} className="absolute top-3 right-3 p-2.5 bg-white/90 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white shadow-xl transition-all">
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {analyzing && (
            <div className="pt-6 space-y-4">
              <div className="flex justify-between text-sm font-black text-indigo-600 uppercase tracking-widest">
                <span>Designing Digital Boutique...</span>
                <span>{Math.round(((processingIndex! + 1) / pendingQueue.length) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-full transition-all duration-1000 ease-in-out" style={{ width: `${((processingIndex! + 1) / pendingQueue.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-2 border-rose-100 text-rose-700 p-8 rounded-[2.5rem] flex items-center gap-6 animate-in slide-in-from-top-4">
          <AlertCircle size={32} />
          <p className="text-xl font-bold">{error}</p>
        </div>
      )}

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50 flex flex-col gap-4">
        {/* Added explicit override button if items exist */}
        {wardrobe.length > 0 && !analyzing && pendingQueue.length === 0 && (
          <button 
            onClick={onComplete}
            className="flex items-center justify-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest bg-white/80 backdrop-blur py-3 rounded-2xl border border-indigo-100 shadow-xl hover:bg-white transition-all"
          >
            Enter Boutique Closet <ArrowRight size={14} />
          </button>
        )}

        <button
          onClick={startBatchProcessing}
          disabled={analyzing || (pendingQueue.length === 0 && wardrobe.length === 0)}
          className={`w-full py-6 rounded-[2.5rem] font-black text-2xl transition-all shadow-3xl flex items-center justify-center gap-5 active:scale-95 ${
            analyzing 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : pendingQueue.length > 0 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-300 ring-8 ring-indigo-50' 
              : wardrobe.length > 0 ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
          }`}
        >
          {analyzing ? 'Processing...' : pendingQueue.length > 0 ? 'Launch Boutique' : wardrobe.length > 0 ? 'Enter Closet' : 'Add to Closet'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
