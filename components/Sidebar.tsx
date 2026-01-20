
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
    { icon: 'fa-tiktok', label: 'TikTok', color: 'hover:text-pink-500', link: 'https://tiktok.com/@deepshopbd' },
    { icon: 'fa-facebook', label: 'Facebook', color: 'hover:text-blue-600', link: 'https://facebook.com/deepshopbd' },
    { icon: 'fa-telegram', label: 'Message', color: 'hover:text-sky-400', link: 'https://t.me/deepshop_admin' },
    { icon: 'fa-paper-plane', label: 'Channel', color: 'hover:text-sky-500', link: 'https://t.me/deepshopbd' },
    { icon: 'fa-whatsapp', label: 'WhatsApp', color: 'hover:text-green-500', link: 'https://wa.me/8801778953114' },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed top-0 left-0 bottom-0 w-[80%] md:w-[380px] z-[101] bg-white dark:bg-black border-r border-slate-100 dark:border-white/5 transition-transform duration-500 ease-ios ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-10 overflow-y-auto no-scrollbar">
          
          <div className="flex items-center justify-between mb-12">
            <Link to="/" onClick={onClose} className="flex items-center gap-4">
              <h2 className="text-2xl font-black tracking-tighter uppercase">Deep Shop</h2>
            </Link>
            <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <nav className="space-y-1 mb-12">
            <SidebarLink to="/" label="Home" onClick={onClose} />
            <SidebarLink to="/cart" label="My Cart" onClick={onClose} />
            <SidebarLink to="/profile" label="My Account" onClick={onClose} />
            <SidebarLink to="/sell-phone" label="Sell Device" onClick={onClose} />
            {user?.isAdmin && <SidebarLink to="/admin" label="Admin Dashboard" onClick={onClose} />}
          </nav>

          {user ? (
            <div className="mt-auto p-6 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center gap-4">
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2e8b57&color=fff&bold=true`} className="w-10 h-10 rounded-full" alt={user.name} />
               <div className="min-w-0">
                 <h4 className="font-bold text-xs truncate uppercase tracking-tight">{user.name}</h4>
                 <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5">{user.rewardPoints || 0} Points</p>
               </div>
            </div>
          ) : (
            <Link 
              to="/auth" 
              onClick={onClose} 
              className="mt-auto bg-slate-900 dark:bg-white dark:text-black text-white h-14 rounded-xl flex items-center justify-center font-bold text-[10px] uppercase tracking-[0.2em]"
            >
              Sign In
            </Link>
          )}

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-white/5">
             <div className="grid grid-cols-5 gap-4 justify-items-center">
                {socialLinks.map(s => (
                  <a key={s.label} href={s.link} target="_blank" className={`text-slate-400 ${s.color} transition-all hover:scale-125`}>
                    <i className={`fab ${s.icon} text-lg`}></i>
                  </a>
                ))}
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SidebarLink: React.FC<{ to: string, label: string, onClick: () => void }> = ({ to, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => `flex items-center h-12 px-6 rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900'}`}
  >
    {label}
  </NavLink>
);

export default Sidebar;
