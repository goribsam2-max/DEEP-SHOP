

import React from 'react';
import { auth } from '../services/firebase';
import { User } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import RankBadge from '../components/RankBadge';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();

  const menuItems = [
    { to: '/my-orders', label: 'আমার অর্ডারসমূহ', icon: 'fa-box-open', color: 'text-blue-500' },
    { to: '/notifications', label: 'নোটিফিকেশন বক্স', icon: 'fa-bell', color: 'text-amber-500' },
    { to: '/sales', label: 'সেলার প্যানেল (বিক্রয় তথ্য)', icon: 'fa-chart-pie', color: 'text-primary', sellerOnly: true },
    { to: '/track-order', label: 'অর্ডার ট্র্যাকিং সিস্টেম', icon: 'fa-location-arrow', color: 'text-rose-500' },
  ];

  const isSeller = user.isSellerApproved || user.isAdmin;

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-white dark:bg-[#050505]">
      {/* Header with Back Button */}
      <div className="px-8 pt-12 pb-8 border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-6 mb-10">
           <button 
             onClick={() => navigate(-1)} 
             className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100 dark:border-white/5"
           >
             <i className="fas fa-chevron-left"></i>
           </button>
           <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">পার্সোনাল প্রোফাইল</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[28px] bg-slate-100 dark:bg-white/5 p-1 relative shadow-2xl">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true&size=128`} 
              className="w-full h-full rounded-[24px] object-cover" 
              alt={user.name} 
            />
            <div className="absolute -bottom-1 -right-1">
               <RankBadge rank={user.rankOverride || 'bronze'} size="sm" showLabel={false} />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black uppercase text-slate-900 dark:text-white leading-tight mb-1 truncate brand-font">{user.name}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate opacity-60">{user.email}</p>
            {isSeller && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/20 animate-pulse">
                Verified Seller
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      <div className="mx-6 mt-8 px-8 py-7 bg-slate-900 dark:bg-zinc-900 text-white rounded-[36px] flex items-center justify-between shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center text-primary border border-white/10">
               <i className="fas fa-wallet text-lg"></i>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">ওয়ালেট ব্যালেন্স</span>
               <span className="text-xl font-black brand-font italic">৳{user.walletBalance?.toLocaleString() || 0}</span>
            </div>
         </div>
         <Link to="/profile" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors relative z-10">
            <i className="fas fa-plus-circle"></i>
         </Link>
      </div>

      {/* Menu List */}
      <div className="flex-1 px-4 py-10 space-y-2">
        {menuItems.map((item) => {
          if (item.sellerOnly && !isSeller) return null;
          return (
            <Link 
              key={item.to} 
              to={item.to} 
              className="flex items-center justify-between h-18 px-6 rounded-[24px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-[0.98] group border border-transparent hover:border-slate-100 dark:hover:border-white/5"
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl bg-slate-50 dark:bg-black flex items-center justify-center ${item.color} bg-opacity-10 group-hover:scale-110 transition-transform shadow-sm`}>
                  <i className={`fas ${item.icon} text-base`}></i>
                </div>
                <div className="flex flex-col">
                   <span className="text-sm font-black uppercase text-slate-700 dark:text-slate-300 tracking-tight">{item.label}</span>
                   {item.sellerOnly && <span className="text-[7px] font-bold text-primary uppercase mt-0.5 tracking-widest">Merchant Dashboard</span>}
                </div>
              </div>
              <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:translate-x-2 transition-transform"></i>
            </Link>
          );
        })}
        
        {user.isAdmin && (
          <Link to="/admin" className="flex items-center justify-between h-18 px-6 rounded-[24px] bg-primary/5 hover:bg-primary/10 transition-all group border border-primary/10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                <i className="fas fa-crown text-base"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase text-primary tracking-tight">অ্যাডমিন প্যানেল</span>
                <span className="text-[7px] font-bold text-primary/60 uppercase mt-0.5 tracking-widest">Full System Control</span>
              </div>
            </div>
            <i className="fas fa-arrow-right text-[10px] text-primary group-hover:translate-x-2 transition-transform"></i>
          </Link>
        )}

        <button 
          onClick={() => auth.signOut()}
          className="w-full flex items-center justify-between h-18 px-6 rounded-[24px] hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-all group mt-10"
        >
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
              <i className="fas fa-power-off text-base"></i>
            </div>
            <span className="text-sm font-black uppercase text-rose-500 tracking-tight">অ্যাকাউন্ট থেকে লগ আউট</span>
          </div>
        </button>
      </div>

      <div className="p-10 text-center opacity-30 pb-32">
        <p className="text-[8px] font-black uppercase tracking-[0.6em] text-slate-400">Deep Shop Bangladesh v2.5 OFFICIAL</p>
      </div>
    </div>
  );
};

export default Profile;
