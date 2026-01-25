

import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen }) => {
  const content = (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Beguni Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e0a3d] via-[#4c1d95] to-[#2e1065]"></div>
      
      {/* Wavy Animated Threads (Thin sutar moto lines) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-[200%] h-full absolute animate-wave-slow">
          <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path d="M0 50 Q 125 0, 250 50 T 500 50 T 750 50 T 1000 50" className="suta-line" />
            <path d="M0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60" className="suta-line" opacity="0.6" />
            <path d="M0 40 Q 100 80, 200 40 T 400 40 T 600 40 T 800 40" className="suta-line" opacity="0.4" />
            <path d="M0 70 Q 200 20, 400 70 T 800 70 T 1200 70" className="suta-line" opacity="0.2" />
          </svg>
        </div>
      </div>

      {/* Center Brand Identity */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-28 h-28 bg-white/5 backdrop-blur-xl rounded-[36px] p-0.5 shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/10 mb-8 overflow-hidden animate-pulse">
          <img 
            src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" 
            className="w-full h-full object-cover rounded-[34px]" 
            alt="Deep Shop Logo" 
          />
        </div>
        
        <div className="text-center animate-fade-in">
          <h2 className="text-2xl font-black text-white uppercase brand-font mb-4 tracking-normal">
            DEEP SHOP
          </h2>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-white/50 uppercase">অপেক্ষা করুন</span>
            <div className="flex gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 blur-[120px] rounded-full pointer-events-none"></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[5000]">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-80 rounded-[44px] overflow-hidden mt-8 shadow-2xl">
      {content}
    </div>
  );
};

export default Loader;
