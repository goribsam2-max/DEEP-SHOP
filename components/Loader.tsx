
import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen }) => {
  const loaderContent = (
    <div className="flex flex-col items-center gap-10 animate-fade-in">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Animated Rings */}
        <div className="absolute inset-0 rounded-[38px] border-[3px] border-slate-100 dark:border-white/5"></div>
        <div className="absolute inset-0 rounded-[38px] border-t-[3px] border-primary animate-spin shadow-[0_0_25px_rgba(225,29,72,0.4)]"></div>
        <div className="absolute inset-4 rounded-[28px] border-[2px] border-primary/20 animate-[spin_3s_linear_infinite] direction-reverse"></div>
        
        {/* Floating Brand Logo */}
        <div className="z-10 bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl transform hover:scale-110 transition-transform">
           <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-12 h-12 rounded-xl object-cover shadow-inner" alt="DEEP SHOP" />
        </div>
        
        {/* Glow Pulse */}
        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full animate-pulse"></div>
      </div>
      
      <div className="flex flex-col items-center text-center space-y-3">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white brand-font">
          DEEP <span className="text-primary">SHOP</span>
        </h2>
        <div className="flex flex-col items-center gap-2">
           <div className="flex gap-1.5">
             <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
             <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
             <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
             লোড হচ্ছে... দয়া করে অপেক্ষা করুন
           </p>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex items-center justify-center p-8">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-32">
      {loaderContent}
    </div>
  );
};

export default Loader;
