
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const socialLinks = [
    { icon: 'fa-tiktok', label: 'TikTok', color: 'hover:text-pink-500', link: 'https://www.tiktok.com/@deep.shop.official?_r=1&_t=ZS-93D97uEogBV' },
    { icon: 'fa-facebook', label: 'Facebook', color: 'hover:text-blue-600', link: 'https://www.facebook.com/share/188AxriwWq/?mibextid=wwXIfr' },
    { icon: 'fa-telegram', label: 'Channel', color: 'hover:text-sky-500', link: 'https://t.me/s10xiosback' },
    { icon: 'fa-whatsapp', label: 'WhatsApp', color: 'hover:text-green-500', link: 'https://wa.me/8801778953114' },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 bottom-0 w-[85%] md:w-[400px] z-[101] glass border-r border-white/20 shadow-2xl transition-transform duration-500 ease-ios ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-8 overflow-y-auto no-scrollbar">
          
          {/* Brand */}
          <div className="flex items-center justify-between mb-12">
            <Link to="/" onClick={onClose} className="flex items-center gap-3">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl">
                 <i className="fas fa-gem text-2xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">DEEP SHOP</h2>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Premium Official</p>
              </div>
            </Link>
            <button onClick={onClose} className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-400 hover:text-danger transition-colors">
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>

          {/* User Profile Summary */}
          {user ? (
            <div className="glass p-6 rounded-ios-lg border-white/40 mb-10 shadow-inner">
               <div className="flex items-center gap-4">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2e8b57&color=fff`} className="w-16 h-16 rounded-2xl shadow-lg border-2 border-primary/20" />
                  <div>
                    <h4 className="font-black text-lg">{user.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.rewardPoints || 0} DEEP POINTS</p>
                  </div>
               </div>
            </div>
          ) : (
            <Link 
              to="/auth" 
              onClick={onClose} 
              className="bg-primary text-white h-[80px] rounded-2xl flex items-center justify-center gap-5 font-black text-lg uppercase tracking-widest mb-10 shadow-[0_20px_50px_rgba(46,139,87,0.3)] hover:scale-[1.02] active:scale-95 transition-all border-b-8 border-black/10"
            >
              <i className="fas fa-sign-in-alt text-xl"></i> Login to Account
            </Link>
          )}

          {/* Navigation */}
          <nav className="space-y-4 mb-12">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Main Directory</h5>
            <SidebarLink to="/" icon="fa-house" label="Storefront" onClick={onClose} />
            <SidebarLink to="/cart" icon="fa-shopping-bag" label="My Cart" onClick={onClose} />
            <SidebarLink to="/profile" icon="fa-user-circle" label="My Account" onClick={onClose} />
            <SidebarLink to="/sell-phone" icon="fa-mobile-screen-button" label="Sell Your Phone" onClick={onClose} />
            {user?.isAdmin && <SidebarLink to="/admin" icon="fa-shield-halved" label="Admin Dashboard" onClick={onClose} />}
          </nav>

          {/* Social Hub */}
          <div className="mt-auto pt-8 border-t border-slate-200 dark:border-white/10">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 ml-2 text-center">Join Deep Community</h5>
            <div className="grid grid-cols-4 gap-4">
              {socialLinks.map(s => (
                <a key={s.label} href={s.link} target="_blank" className="flex flex-col items-center gap-2 group">
                   <div className={`w-14 h-14 glass rounded-2xl flex items-center justify-center text-xl text-slate-400 ${s.color} transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl`}>
                     <i className={`fab ${s.icon}`}></i>
                   </div>
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
          
          <p className="text-[9px] font-black text-slate-400 uppercase text-center mt-12 tracking-widest opacity-50">Deep Shop Bangladesh © 2026</p>
        </div>
      </div>
    </>
  );
};

const SidebarLink: React.FC<{ to: string, icon: string, label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => `flex items-center gap-4 h-16 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
  >
    <i className={`fas ${icon} w-6`}></i>
    {label}
  </NavLink>
);

export default Sidebar;
