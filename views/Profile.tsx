
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { User, Order, Notification, OrderStatus } from '../types';
import Loader from '../components/Loader';
import Receipt from '../components/Receipt';
import RankBadge from '../components/RankBadge';
import { Link } from 'react-router-dom';
import { NotificationContext } from '../App';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'sales' | 'notifications'>('orders');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const { notify } = useContext(NotificationContext);

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('userInfo.userId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      setOrders(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    const unsubSales = onSnapshot(query(collection(db, 'orders'), where('sellerId', '==', user.uid)), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      setSales(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    const unsubNotif = onSnapshot(query(collection(db, 'users', user.uid, 'notifications')), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      setNotifications(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => { unsubOrders(); unsubSales(); unsubNotif(); };
  }, [user?.uid]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      notify(`স্ট্যাটাস পরিবর্তন হয়েছে: ${status.toUpperCase()}`, 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-[40px] md:rounded-[56px] p-8 md:p-16 mb-12 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-[40px] border-4 border-white/10 p-1.5 bg-white/5 backdrop-blur-xl">
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=e11d48&color=fff&bold=true&size=512`} className="w-full h-full rounded-[32px] object-cover shadow-2xl" alt="P" />
            </div>
            <div className="absolute -bottom-4 -right-4"><RankBadge rank={user?.rankOverride || 'bronze'} size="md" showLabel={false} /></div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
               <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{user?.name}</h1>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-8">{user?.email}</p>
          </div>

          <div className="flex flex-col gap-3">
             <button onClick={() => auth.signOut()} className="h-12 px-8 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest">লগ আউট</button>
             {user?.isAdmin && !user.isShadowMode && <Link to="/admin" className="h-12 px-8 bg-primary text-white rounded-2xl flex items-center justify-center text-[9px] font-black uppercase tracking-widest">অ্যাডমিন প্যানেল</Link>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-1.5 mb-10 overflow-x-auto no-scrollbar border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="flex gap-1.5">
          {['orders', 'sales', 'notifications'].map((tab: any) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 px-6 ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}>
              {tab === 'sales' ? `বেচাকেনা (${sales.length})` : tab === 'orders' ? 'আমার অর্ডার' : 'নোটিফিকেশন'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'sales' && (
          <div className="space-y-8">
            {sales.map(o => (
              <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="flex items-center gap-5">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(o.userInfo?.userName || 'B')}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[22px]" alt="U" />
                          <div>
                             <h4 className="font-black text-sm uppercase">{o.userInfo?.userName}</h4>
                             <p className="text-xs font-bold text-slate-400">{o.userInfo?.phone}</p>
                             <span className="text-[9px] font-black text-primary uppercase mt-1 inline-block">অর্ডার আইডি: #{o.id.substring(0,8)}</span>
                          </div>
                       </div>

                       <div className="p-8 bg-slate-50 dark:bg-black/30 rounded-[32px] border border-slate-100 dark:border-white/10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">অর্ডার ডিটেইলস</p>
                          {o.products?.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center mb-2 last:mb-0 border-b border-slate-200 dark:border-white/5 pb-2 last:border-0">
                               <p className="text-xs font-bold uppercase">{p.name} <span className="text-primary ml-1">x{p.quantity}</span></p>
                               <p className="text-xs font-black">৳{p.price.toLocaleString()}</p>
                            </div>
                          ))}
                          <div className="mt-4 pt-4 border-t-2 border-slate-200 dark:border-white/10 flex justify-between">
                             <span className="text-[10px] font-black uppercase text-slate-400">সর্বমোট</span>
                             <span className="text-lg font-black text-primary">৳{o.totalAmount.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/10">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">ভেরিফিকেশন তথ্য ({o.verificationType?.toUpperCase()})</p>
                          
                          {o.verificationType === 'nid' ? (
                            <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <p className="text-[9px] font-black text-slate-400 uppercase">এনআইডি কার:</p>
                                     <p className="text-xs font-bold uppercase">{o.parentInfo?.parentType === 'Mother' ? 'মায়ের' : 'বাবার'}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-black text-slate-400 uppercase">অভিভাবকের নাম:</p>
                                     <p className="text-xs font-bold uppercase">{o.parentInfo?.parentName}</p>
                                  </div>
                               </div>
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase">অভিভাবকের নম্বর:</p>
                                  <p className="text-xs font-bold">{o.parentInfo?.parentPhone}</p>
                               </div>
                            </div>
                          ) : (
                            <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase">ট্রানজেকশন আইডি:</p>
                               <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest bg-white dark:bg-black/40 p-3 rounded-xl mt-2 select-all">{o.transactionId || 'N/A'}</p>
                            </div>
                          )}

                          <div className="mt-6 pt-6 border-t border-primary/10">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-2">ডেলিভারি ঠিকানা:</p>
                             <p className="text-xs font-bold leading-relaxed">{o.address?.fullAddress}</p>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">অর্ডার স্ট্যাটাস আপডেট করুন</label>
                          <select 
                            value={o.status} 
                            onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)} 
                            className="w-full h-14 bg-slate-900 text-white rounded-[20px] px-6 text-[10px] font-black uppercase outline-none border border-white/10"
                          >
                             {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
            {sales.length === 0 && <div className="text-center py-40 opacity-20 uppercase font-black tracking-widest">এখনো কোন বিক্রি হয়নি</div>}
          </div>
        )}

        {/* ... Rest of the tabs logic stays same ... */}
        {activeTab === 'orders' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {orders.map(o => (
             <div key={o.id} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 flex flex-col gap-6 shadow-sm">
                <div className="flex justify-between items-start">
                   <div>
                     <span className="text-[10px] font-black text-primary uppercase">অর্ডার আইডি: #{o.id?.substring(0,8)}</span>
                     <h4 className="font-black text-lg">৳{o.totalAmount?.toLocaleString()}</h4>
                     <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{o.verificationType === 'nid' ? 'NID ভেরিফাইড' : '৩০০ অগ্রিম'}</p>
                   </div>
                   <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border tracking-widest ${o.status === 'delivered' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-primary/5 text-primary'}`}>{o.status}</span>
                </div>
                <button onClick={() => setSelectedReceipt(o)} className="w-full h-14 bg-slate-50 dark:bg-black/40 rounded-2xl text-[9px] font-black uppercase tracking-widest">রিসিট ডাউনলোড করুন</button>
             </div>
           ))}
           {orders.length === 0 && <div className="col-span-full text-center py-40 opacity-20 uppercase font-black tracking-widest">কোন অর্ডার পাওয়া যায়নি</div>}
         </div>
        )}

        {activeTab === 'notifications' && (
           <div className="space-y-4">
           {notifications.map(n => (
             <div key={n.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex gap-6 items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0"><i className="fas fa-bell"></i></div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight mb-2">{n.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{n.message}</p>
                  <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">
                     {n.timestamp?.seconds ? new Date(n.timestamp.seconds * 1000).toLocaleString() : 'এখনই'}
                  </span>
                </div>
             </div>
           ))}
           {notifications.length === 0 && <div className="text-center py-40 opacity-20 uppercase font-black tracking-widest">কোন নোটিফিকেশন নেই</div>}
        </div>
        )}
      </div>

      {selectedReceipt && <Receipt order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

export default Profile;
