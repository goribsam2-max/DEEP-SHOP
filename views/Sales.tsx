import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { User, Order, OrderStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Sales: React.FC<{ user: User }> = ({ user }) => {
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    // Seller specific query
    const q = query(
      collection(db, 'orders'), 
      where('sellerId', '==', user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      // Client-side sorting for immediate results
      const sorted = data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setSales(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Sales Snapshot Error:", err.code, err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      notify(`অর্ডার স্ট্যাটাস আপডেট হয়েছে: ${status.toUpperCase()}`, 'success');
    } catch (e: any) {
      notify(e.message, 'error');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-32">
      <div className="px-8 pt-12 pb-6 flex items-center gap-5 sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl z-50 border-b border-slate-50 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="flex flex-col">
           <h1 className="text-lg font-black uppercase brand-font leading-none">সেলস <span className="text-primary">প্যানেল</span></h1>
           <p className="text-[7px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Merchant Sales Dashboard</p>
        </div>
      </div>

      <div className="px-4 py-8 space-y-10">
        {sales.map((order) => (
          <div key={order.id} className="p-8 border border-slate-100 dark:border-white/5 rounded-[48px] bg-white dark:bg-zinc-900/40 shadow-xl overflow-hidden relative">
            
            {/* Order Header */}
            <div className="flex justify-between items-start mb-10">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl shadow-inner">
                     <i className="fas fa-file-invoice"></i>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">অর্ডার আইডি</span>
                    <h4 className="font-black text-xs uppercase text-primary">#{order.id.substring(0,12)}</h4>
                    <p className="text-[8px] font-bold text-slate-400 mt-1">তারিখ: {order.timestamp?.seconds ? new Date(order.timestamp.seconds * 1000).toLocaleString() : 'এখনই'}</p>
                  </div>
               </div>
               <div className="text-right">
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase border ${order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-primary/5 text-primary border-primary/20'}`}>
                    {order.status}
                  </span>
               </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
               <div className="p-6 bg-slate-50 dark:bg-black/40 rounded-[32px] border border-slate-100 dark:border-white/5">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                     <i className="fas fa-user-circle"></i> কাস্টমার তথ্য
                  </h5>
                  <div className="space-y-3">
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase text-slate-400">নাম:</span>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{order.userInfo?.userName}</p>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase text-slate-400">মোবাইল:</span>
                        <p className="text-sm font-black text-primary">{order.userInfo?.phone || order.address?.phone}</p>
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-slate-50 dark:bg-black/40 rounded-[32px] border border-slate-100 dark:border-white/5">
                  <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                     <i className="fas fa-map-marker-alt"></i> ডেলিভারি ঠিকানা
                  </h5>
                  <p className="text-xs font-bold leading-relaxed text-slate-600 dark:text-slate-300 uppercase italic">
                    {order.address?.fullAddress || 'ঠিকানা পাওয়া যায়নি'}
                  </p>
               </div>
            </div>

            {/* Order Items */}
            <div className="bg-slate-50 dark:bg-black/40 p-6 rounded-[32px] space-y-4 mb-10">
               {order.products?.map((p, i) => (
                 <div key={i} className="flex justify-between items-center text-xs font-bold">
                    <div className="flex flex-col">
                       <span className="uppercase text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{p.name}</span>
                       <span className="text-[8px] text-slate-400 uppercase">পরিমাণ: {p.quantity}</span>
                    </div>
                    <span className="text-slate-900 dark:text-white font-black">৳{(p.price || 0).toLocaleString()}</span>
                 </div>
               ))}
               <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">টোটাল বিল</span>
                  <span className="text-2xl font-black text-primary brand-font tracking-tighter">৳{(order.totalAmount || 0).toLocaleString()}</span>
               </div>
            </div>

            {/* Status Update */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-4 mb-2 block tracking-widest">স্ট্যাটাস আপডেট</label>
                  <select 
                    value={order.status} 
                    onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                    className="w-full h-14 bg-slate-900 text-white rounded-[24px] px-6 text-[10px] font-black uppercase outline-none focus:ring-2 ring-primary/30 transition-all shadow-lg"
                  >
                     {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               
               <div className="flex flex-col justify-end">
                  <button 
                    onClick={() => window.open(`https://wa.me/${order.userInfo?.phone || order.address?.phone}`, '_blank')}
                    className="w-full h-14 bg-green-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-500/20"
                  >
                    <i className="fab fa-whatsapp text-lg"></i> কাস্টমারকে নক দিন
                  </button>
               </div>
            </div>

          </div>
        ))}

        {sales.length === 0 && (
          <div className="py-40 flex flex-col items-center justify-center opacity-20 text-center">
             <div className="w-24 h-24 border-4 border-dashed border-slate-300 rounded-[44px] flex items-center justify-center mb-6">
                <i className="fas fa-hand-holding-dollar text-4xl"></i>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">এখনো কোন বিক্রি হয়নি</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;