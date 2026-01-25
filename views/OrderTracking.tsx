
import React, { useState, useContext } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return notify('দয়া করে অর্ডার আইডি দিন', 'info');
    
    setLoading(true);
    setOrder(null);
    try {
      const docRef = doc(db, 'orders', orderId.trim());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        notify('এই আইডির কোন অর্ডার পাওয়া যায়নি', 'error');
      }
    } catch (e: any) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const stages: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pending', label: 'অর্ডার পেন্ডিং', icon: 'fa-clock' },
    { status: 'processing', label: 'প্রসেসিং হচ্ছে', icon: 'fa-cog' },
    { status: 'packaging', label: 'প্যাকেজিং হচ্ছে', icon: 'fa-box-open' },
    { status: 'shipped', label: 'শিপড হয়েছে', icon: 'fa-truck-fast' },
    { status: 'delivered', label: 'ডেলিভারড', icon: 'fa-check-double' },
  ];

  const currentStageIndex = stages.findIndex(s => s.status === order?.status);

  return (
    <div className="flex-1 p-6 md:p-12 animate-fade-in bg-white dark:bg-black pb-32">
       <div className="flex items-center gap-4 mb-10 mt-4">
          <button onClick={() => navigate(-1)} className="w-11 h-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/5 active:scale-90 transition-all">
             <i className="fas fa-chevron-left text-slate-400"></i>
          </button>
          <div className="flex flex-col">
             <h1 className="text-xl font-black uppercase tracking-tight brand-font leading-none">ORDER <span className="text-primary">TRACKING</span></h1>
             <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Check Order Status</p>
          </div>
       </div>

       <form onSubmit={handleTrack} className="mb-12 relative">
          <input 
            placeholder="অর্ডার আইডি দিন (যেমন: XyZ123...)" 
            className="w-full h-18 px-6 pr-20 bg-slate-50 dark:bg-zinc-900 rounded-[28px] outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all shadow-inner"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 w-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-search"></i>}
          </button>
       </form>

       {order && (
         <div className="space-y-10 animate-slide-up">
            <div className="p-8 bg-slate-50 dark:bg-zinc-900/50 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm">
               <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">অর্ডার স্ট্যাটাস</p>
                    <h3 className="text-2xl font-black uppercase text-primary brand-font">{order.status}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">পরিমাণ</p>
                    <h3 className="text-xl font-black">৳{order.totalAmount.toLocaleString()}</h3>
                  </div>
               </div>

               {/* Tracking Timeline */}
               <div className="relative pl-10 space-y-12">
                  <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-white/5"></div>
                  {stages.map((stage, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isLast = idx === stages.length - 1;

                    return (
                      <div key={idx} className={`relative flex items-center gap-6 ${!isCompleted ? 'opacity-30' : ''}`}>
                         <div className={`absolute -left-8 w-5 h-5 rounded-full z-10 flex items-center justify-center transition-all ${isCompleted ? 'bg-primary shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-slate-200 dark:bg-zinc-800'}`}>
                            {isCompleted && <i className="fas fa-check text-[8px] text-white"></i>}
                         </div>
                         
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${isCurrent ? 'bg-primary text-white scale-110 shadow-xl' : 'bg-slate-100 dark:bg-black text-slate-400'}`}>
                            <i className={`fas ${stage.icon}`}></i>
                         </div>
                         
                         <div>
                            <h4 className={`text-sm font-black uppercase tracking-tight ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{stage.label}</h4>
                            {isCurrent && <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 animate-pulse">বর্তমানে এখানে আছে</p>}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="bg-primary/5 p-8 rounded-[40px] border border-primary/10">
               <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">অর্ডার ডিটেইলস</h4>
               <div className="space-y-4">
                  {order.products.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] font-bold">
                       <span className="text-slate-500 uppercase">{p.name} x {p.quantity}</span>
                       <span className="text-slate-900 dark:text-white">৳{p.price.toLocaleString()}</span>
                    </div>
                  ))}
               </div>
               <div className="mt-6 pt-6 border-t border-primary/10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">ডেলিভারি ঠিকানা:</span>
                  <span className="text-[11px] font-black uppercase text-right truncate max-w-[200px]">{order.address.fullAddress}</span>
               </div>
            </div>
         </div>
       )}

       {!order && !loading && (
         <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <i className="fas fa-map-location-dot text-6xl mb-6"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center">আপনার আইডি দিয়ে ট্র্যাক করুন</p>
         </div>
       )}
    </div>
  );
};

export default OrderTracking;
