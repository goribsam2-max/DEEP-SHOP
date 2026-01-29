import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen }) => {
  const content = (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Deep Black */}
      <div className="absolute inset-0 bg-[#050505]"></div>
      
      {/* Blurry Green Side Effects (As per requested image) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Wavy Animated Threads (Thin sutar moto lines) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-[200%] h-full absolute animate-wave-slow">
          <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path d="M0 50 Q 125 0, 250 50 T 500 50 T 750 50 T 1000 50" className="suta-line" />
            <path d="M0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60" className="suta-line" opacity="0.6" />
            <path d="M0 40 Q 100 80, 200 40 T 400 40 T 600 40 T 800 40" className="suta-line" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Center Brand Identity */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-32 h-32 bg-white/5 backdrop-blur-xl rounded-[40px] p-0.5 shadow-[0_0_80px_rgba(56,255,0,0.15)] border border-white/10 mb-8 overflow-hidden animate-float">
          <img 
            src="https://i.ibb.co.com/mrgXJBvG/IMG-2747.jpg" 
            className="w-full h-full object-cover rounded-[38px]" 
            alt="Deep Shop Logo" 
          />
        </div>
        
        <div className="text-center animate-fade-in">
          <h2 className="text-2xl font-black text-white uppercase brand-font mb-4 tracking-tighter">
            DEEP <span className="text-primary">SHOP</span>
          </h2>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">LOADING EXPERIENCE</span>
            <div className="flex gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
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
