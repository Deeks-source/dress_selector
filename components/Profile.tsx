import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, User as UserIcon, LayoutGrid, CheckCircle } from 'lucide-react';
import { ClothingItem } from '../types';

interface ProfileProps {
  user: User;
  onSignOut: () => void;
  wardrobe: ClothingItem[];
}

const Profile: React.FC<ProfileProps> = ({ user, onSignOut, wardrobe }) => {
  const totalItems = wardrobe.length;
  const totalWears = wardrobe.reduce((acc, item) => acc + (item.wearCount || 0), 0);

  return (
    <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col pt-4 sm:pt-8 px-4 sm:px-0">
      <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight mb-8">Profile</h2>
      
      <div className="bg-white border-[3px] border-black p-6 sm:p-8 rounded-3xl shadow-[6px_6px_0_0_#000] flex flex-col items-center sm:items-start sm:flex-row gap-6 mb-8">
        <div className="w-24 h-24 rounded-full border-[3px] border-black overflow-hidden bg-[#CCFF00] flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_#000]">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={40} className="text-black" strokeWidth={2.5} />
          )}
        </div>
        
        <div className="flex flex-col flex-1 items-center sm:items-start text-center sm:text-left gap-1">
          <h3 className="text-xl sm:text-2xl font-black text-black">{user.displayName || 'StyleMind Stylist'}</h3>
          <p className="text-base text-black/70 font-bold mb-4">{user.email}</p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-[#CCFF00] border-2 border-black rounded-xl text-[10px] font-black shadow-[2px_2px_0_0_#000]">
              Pro Member
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_0_#000] text-center sm:text-left">
          <div className="w-10 h-10 bg-[#A388EE] rounded-xl flex items-center justify-center text-black mb-3 mx-auto sm:mx-0">
            <LayoutGrid size={20} strokeWidth={2.5} />
          </div>
          <div className="text-3xl font-black text-black">{totalItems}</div>
          <div className="text-xs font-black text-black/60 uppercase tracking-wider">Wardrobe Items</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border-[3px] border-black shadow-[4px_4px_0_0_#000] text-center sm:text-left">
          <div className="w-10 h-10 bg-[#FFD166] rounded-xl flex items-center justify-center text-black mb-3 mx-auto sm:mx-0">
            <CheckCircle size={20} strokeWidth={2.5} />
          </div>
          <div className="text-3xl font-black text-black">{totalWears}</div>
          <div className="text-xs font-black text-black/60 uppercase tracking-wider">Total logged wears</div>
        </div>
      </div>
      
      <div className="bg-white border-[3px] border-black rounded-3xl shadow-[6px_6px_0_0_#000] overflow-hidden">
        <div className="p-4 sm:p-6 border-b-[3px] border-black bg-[#EAEAEA]">
          <h3 className="text-lg font-black text-black uppercase tracking-wider">Account Settings</h3>
        </div>
        <div className="p-4 sm:p-6 bg-white">
          <button 
            onClick={onSignOut}
            className="w-full sm:w-auto px-6 py-4 bg-[#FF4444] text-white border-[3px] border-black rounded-2xl font-black tracking-wide text-lg shadow-[4px_4px_0_0_#000] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={20} strokeWidth={3} />
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
