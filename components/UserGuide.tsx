import React, { useState, useEffect } from 'react';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'center';
}

const UserGuide: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const steps: TourStep[] = [
    {
      selector: '.guide-home',
      title: 'আমাদের অফিসিয়াল স্টোর',
      description: 'ডিভ শপ-এর লেটেস্ট কালেকশন দেখতে সবসময় এখানে ক্লিক করুন।',
      position: 'bottom'
    },
    {
      selector: '.guide-explore',
      title: 'নতুন গ্যাজেট খুঁজুন',
      description: 'হাজারো প্রিমিয়াম গ্যাজেট ক্যাটাগরি অনুযায়ী এখান থেকে ব্রাউজ করুন।',
      position: 'top'
    },
    {
      selector: '.guide-cart',
      title: 'আপনার শপিং ব্যাগ',
      description: 'পছন্দের সব প্রোডাক্ট এখানে থাকবে। সরাসরি চেকআউট করতে পারবেন।',
      position: 'top'
    },
    {
      selector: '.guide-profile',
      title: 'পার্সোনাল ড্যাশবোর্ড',
      description: 'অর্ডার ট্র্যাকিং, ব্যালেন্স এবং পেমেন্ট ডিটেইলস এখান থেকে ম্যানেজ করুন।',
      position: 'bottom'
    }
  ];

  useEffect(() => {
    const updateHighlight = () => {
      const step = steps[currentStep];
      const element = document.querySelector(step.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          opacity: 1
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightStyle({ opacity: 0 });
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-auto">
      {/* Dark Overlay with "Hole" Effect via backdrop-filter and mask or simple shadow logic */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"></div>

      {/* Focus Highlight Box */}
      <div 
        className="absolute z-[10001] border-2 border-primary rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all duration-500 ease-ios pointer-events-none"
        style={highlightStyle}
      >
        <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-2xl"></div>
      </div>

      {/* Content Tooltip */}
      <div 
        className={`absolute z-[10002] w-[calc(100%-48px)] max-w-sm transition-all duration-500 ease-ios flex flex-col items-center`}
        style={{ 
          // Combined conditional properties to avoid duplicate keys in object literal
          top: current.position === 'bottom' 
            ? `calc(${highlightStyle.top}px + ${highlightStyle.height}px + 20px)` 
            : current.position === 'center' 
              ? '50%' 
              : 'auto',
          bottom: current.position === 'top' ? `calc(100vh - ${highlightStyle.top}px + 20px)` : 'auto',
          left: '50%',
          transform: current.position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)'
        }}
      >
        <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-2xl border border-white/10 w-full animate-slide-up">
           <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-5">
              <i className="fas fa-lightbulb"></i>
           </div>
           <h3 className="text-xl font-black uppercase brand-font tracking-tight mb-3 text-slate-900 dark:text-white leading-none">
             {current.title}
           </h3>
           <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed uppercase">
             {current.description}
           </p>

           <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                 {steps.map((_, i) => (
                   <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200 dark:bg-white/10'}`}></div>
                 ))}
              </div>
              <button 
                onClick={handleNext}
                className="h-12 px-8 btn-primary !rounded-2xl !text-[10px] shadow-xl"
              >
                {currentStep === steps.length - 1 ? 'শুরু করি!' : 'পরবর্তী'}
              </button>
           </div>
        </div>
        
        {/* Floating Indicator Arrow (Simplified) */}
        <div className={`mt-4 ${current.position === 'bottom' ? 'rotate-180 mb-4' : 'mt-4'} text-primary animate-bounce`}>
           <i className={`fas ${current.position === 'bottom' ? 'fa-caret-up' : 'fa-caret-down'} text-2xl`}></i>
        </div>
      </div>

      <button 
        onClick={onComplete}
        className="absolute top-10 right-10 z-[10003] text-[10px] font-black uppercase text-white/40 hover:text-white tracking-[0.2em] transition-all"
      >
        Skip Tour
      </button>
    </div>
  );
};

export default UserGuide;