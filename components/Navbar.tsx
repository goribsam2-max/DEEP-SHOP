
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onOpenMenu: () => void;
  hasUnreadNotify?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onOpenMenu, hasUnreadNotify }) => {
  return (
    <nav className="sticky top-0 z-[60] glass h-20 flex items-center justify-between px-4 md:px-12 border-b border-slate-200 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenMenu}
          className="w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-primary transition-all border border-slate-200 dark:border-white/10"
        >
          <i className="fas fa-bars-staggered text-lg"></i>
        </button>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg p-0.5 bg-white">
             <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-full h-full object-cover rounded-lg" alt="Logo" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase brand-font">DEEP SHOP</span>
            <span className="text-[7px] font-black tracking-[0.3em] text-primary uppercase mt-1">অফিসিয়াল স্টোর</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link to="/profile" className="relative w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10">
          <i className="far fa-bell text-xl"></i>
          {hasUnreadNotify && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-black animate-pulse"></span>
          )}
        </Link>
        
        <Link to="/profile" className="flex items-center gap-3 pl-2">
          <div className="w-11 h-11 bg-slate-100 dark:bg-white/10 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
            {user ? (
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&size=128`} 
                alt={user.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><i className="fas fa-user text-slate-400"></i></div>
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
