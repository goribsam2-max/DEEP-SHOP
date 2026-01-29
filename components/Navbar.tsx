import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { auth } from '../services/firebase';

interface NavbarProps {
  user: User | null;
  onOpenMenu: () => void;
  hasUnreadNotify?: boolean;
  showBack?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onOpenMenu, hasUnreadNotify, showBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!auth.currentUser;

  const navLinks = [
    { to: '/', label: 'হোম', icon: 'fa-home' },
    { to: '/explore', label: 'এক্সপ্লোর', icon: 'fa-compass' },
    { to: '/cart', label: 'ব্যাগ', icon: 'fa-shopping-bag' },
  ];

  return (
    <nav className="sticky top-0 z-[60] bg-white/80 dark:bg-black/80 backdrop-blur-xl h-20 flex items-center justify-center border-b border-slate-200 dark:border-white/5 shadow-sm px-4 md:px-8">
      <div className="max-w-7xl w-full flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-8">
          {showBack ? (
            <button 
              onClick={() => navigate(-1)}
              className="w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 active:scale-90 transition-all border border-slate-200 dark:border-white/10"
            >
              <i className="fas fa-chevron-left text-lg"></i>
            </button>
          ) : (
            <button 
              onClick={onOpenMenu}
              className="w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-primary transition-all border border-slate-200 dark:border-white/10"
            >
              <i className="fas fa-bars-staggered text-lg"></i>
            </button>
          )}
          
          <Link to="/" className="flex items-center gap-3 guide-home">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg p-0.5 bg-black shrink-0">
               <img src="https://i.ibb.co.com/mrgXJBvG/IMG-2747.jpg" className="w-full h-full object-cover rounded-lg" alt="Logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase brand-font">DEEP <span className="text-primary">SHOP</span></span>
              <span className="text-[6px] font-black tracking-[0.3em] text-primary uppercase mt-1">অফিসিয়াল স্টোর</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            {navLinks.map(link => (
              <Link 
                key={link.to} 
                to={link.to} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === link.to ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <i className={`fas ${link.icon} mr-2`}></i>
                {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link 
                to="/add-product" 
                className="ml-2 px-5 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <i className="fas fa-plus mr-2"></i>
                পণ্য যোগ করুন
              </Link>
            )}
          </div>
        </div>

       <div className="flex items-center gap-2">
        <Link to="/messages" className="relative w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10">
          <i className="far fa-comment text-xl"></i>
          {hasUnreadNotify && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-black animate-pulse"></span>
          )}
        </Link>
          
          <Link to="/profile" className="flex items-center pl-2 guide-profile group">
            <div className="hidden lg:flex flex-col items-end mr-3">
               <span className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1">প্রোফাইল</span>
               <span className="text-[11px] font-black text-slate-800 dark:text-white leading-none truncate max-w-[100px]">{user?.name || 'লগইন'}</span>
            </div>
            <div className="w-11 h-11 bg-slate-100 dark:bg-white/10 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group-hover:border-primary transition-colors">
              {user?.profilePic ? (
                <img 
                  src={user.profilePic} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              ) : user ? (
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=008F5B&color=fff&bold=true&size=128`} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><i className="fas fa-user text-slate-400"></i></div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
