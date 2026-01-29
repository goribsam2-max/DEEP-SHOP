import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setItems(cart);
    };
    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-10 flex flex-col items-center justify-center py-40 animate-fade-in">
        <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-[40px] flex items-center justify-center text-4xl text-slate-300 mb-10 border border-slate-100 dark:border-white/5 shadow-inner">
          <i className="fas fa-shopping-basket"></i>
        </div>
        <h2 className="text-2xl font-black uppercase brand-font mb-4">ব্যাগটি সম্পূর্ণ খালি!</h2>
        <p className="text-slate-400 mb-12 text-center text-[10px] font-bold uppercase tracking-[0.3em]">আপনি এখনো কোন গ্যাজেট ব্যাগ-এ যোগ করেননি</p>
        <Link to="/" className="btn-primary h-16 w-full max-w-xs">
          কেনাকাটা শুরু করুন <i className="fas fa-arrow-right ml-3"></i>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-5 md:p-12 animate-fade-in pb-40">
      <h1 className="text-2xl md:text-4xl font-black uppercase brand-font mb-12">ব্যাগ <span className="text-primary">সামারি</span></h1>
      
      <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">
        {/* Left Side: Items List */}
        <div className="w-full lg:flex-1 space-y-5">
          {items.map(item => (
            <div key={item.id} className="p-6 rounded-[32px] border border-slate-100 dark:border-white/5 flex gap-6 items-center bg-white dark:bg-zinc-900/60 shadow-sm transition-hover hover:shadow-md">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-slate-50 dark:bg-black p-4 flex-shrink-0 border border-slate-100 dark:border-white/5">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-black text-[13px] md:text-[15px] uppercase text-slate-700 dark:text-slate-200 line-clamp-1 mb-1 tracking-tight">{item.name}</h3>
                    <p className="text-primary font-black text-lg brand-font">৳{item.price.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-5 bg-slate-100 dark:bg-black px-5 py-2.5 rounded-2xl border border-slate-200/50 dark:border-white/5 w-max">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-400 hover:text-primary transition-all active:scale-125">
                      <i className="fas fa-minus text-[10px]"></i>
                    </button>
                    <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-400 hover:text-primary transition-all active:scale-125">
                      <i className="fas fa-plus text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 transition-all border border-rose-100 dark:border-rose-500/20">
                <i className="fas fa-trash-alt text-base"></i>
              </button>
            </div>
          ))}
        </div>

        {/* Right Side: Sticky Checkout Card */}
        <div className="w-full lg:w-[400px] lg:sticky lg:top-32 bg-slate-50 dark:bg-zinc-900/60 p-10 rounded-[56px] border border-slate-100 dark:border-white/5 shadow-2xl">
          <h2 className="text-[10px] font-black uppercase text-slate-400 mb-10 tracking-[0.4em] text-center">Checkout Summary</h2>
          <div className="space-y-6 mb-10">
            <div className="flex justify-between items-center px-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">সাবটোটাল</span>
              <span className="font-black text-base">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ডেলিভারি চার্জ</span>
              <span className="text-primary font-black uppercase text-[9px] tracking-widest">Calculated Next</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-8"></div>
            <div className="flex justify-between items-center px-4">
              <span className="text-xs font-black uppercase tracking-[0.2em]">সর্বমোট বিল</span>
              <span className="text-4xl font-black text-primary brand-font">৳{subtotal.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="btn-primary w-full h-20 !text-[13px] !tracking-[0.25em]"
          >
            অর্ডার সম্পন্ন করুন <i className="fas fa-shopping-cart ml-3"></i>
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-4 opacity-40 grayscale">
             <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/Bkash_logo.png" className="h-4" alt="bkash" />
             <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Nagad_Logo.svg/1200px-Nagad_Logo.svg.png" className="h-4" alt="nagad" />
             <span className="text-[8px] font-black uppercase">Secure Payment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
