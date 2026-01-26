

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!auth.currentUser;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pb-8 px-6 pointer-events-none md:hidden">
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-slate-200 dark:border-white/5 h-16 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-between w-full max-w-md px-4 pointer-events-auto">
        
        {/* Left Side Items */}
        <div className="flex items-center justify-around flex-[2]">
          <NavItem to="/" icon="fa-home" label="হোম" />
          <NavItem to="/explore" icon="fa-compass" label="খুঁজুন" />
        </div>

        {/* Center Action Button */}
        <div className="relative -top-7 px-4">
          <button 
            onClick={() => isLoggedIn ? navigate('/add-product') : navigate('/auth')}
            className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-[0_12px_24px_rgba(225,29,72,0.4)] active:scale-90 transition-all duration-300 border-4 border-white dark:border-zinc-950 group"
          >
            <i className="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-500"></i>
          </button>
        </div>

        {/* Right Side Items */}
        <div className="flex items-center justify-around flex-[2]">
          <NavItem to="/cart" icon="fa-shopping-bag" label="ব্যাগ" />
          <NavItem to="/profile" icon="fa-user-circle" label="প্রোফাইল" />
        </div>

      </div>
    </div>
  );
};

const NavItem = ({ to, icon, label }: { to: string, icon: string, label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `flex flex-col items-center justify-center w-full h-12 transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-400'}`}
  >
    {({ isActive }) => (
      <>
        <i className={`fas ${icon} text-lg ${isActive ? 'scale-110 mb-0.5' : ''} transition-all`}></i>
        <span className="text-[7px] font-black uppercase mt-1 tracking-wider">{label}</span>
      </>
    )}
  </NavLink>
);

export default BottomNav;
