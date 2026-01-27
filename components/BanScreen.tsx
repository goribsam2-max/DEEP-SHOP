import React from 'react';

interface BanScreenProps {
  reason?: string;
  ip?: string;
  deviceId?: string;
}

const BanScreen: React.FC<BanScreenProps> = ({ reason, ip, deviceId }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-black flex flex-col items-center justify-center p-8 animate-fade-in select-none">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-24 h-24 bg-rose-500 rounded-[40px] flex items-center justify-center text-white text-4xl shadow-2xl shadow-rose-500/30 mb-10 animate-pulse">
          <i className="fas fa-user-slash"></i>
        </div>
        
        <h1 className="text-3xl font-black uppercase brand-font tracking-tight mb-4 text-slate-900 dark:text-white">
          ACCESS <span className="text-primary">DENIED</span>
        </h1>
        
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">
          আপনার অ্যাকাউন্ট অথবা এই ডিভাইসটি আমাদের প্ল্যাটফর্ম থেকে স্থায়ীভাবে বহিষ্কার করা হয়েছে।
        </p>

        <div className="w-full bg-slate-50 dark:bg-white/5 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 space-y-6 mb-12">
           <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em]">ব্যানের কারণ</span>
              <p className="text-[11px] font-black text-rose-500 uppercase">{reason || 'Violating Terms of Service'}</p>
           </div>
           
           <div className="h-px bg-slate-200 dark:bg-white/10"></div>

           <div className="flex justify-between items-center">
              <div className="text-left">
                <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Device ID</span>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{deviceId?.substring(0, 16)}...</p>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Client IP</span>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{ip || 'Detecting...'}</p>
              </div>
           </div>
        </div>

        <div className="space-y-4 w-full">
           <a 
            href="https://t.me/deepshopback" 
            target="_blank"
            className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
           >
             <i className="fab fa-telegram-plane"></i> আপিল করুন (Telegram)
           </a>
           <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] opacity-40">Security Code: DS-BAN-PRO-SECURED</p>
        </div>
      </div>
    </div>
  );
};

export default BanScreen;
