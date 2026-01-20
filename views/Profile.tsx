
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, Order, Notification, SellRequest } from '../types';
import Loader from '../components/Loader';
import Receipt from '../components/Receipt';
import RankBadge from '../components/RankBadge';
import { useSearchParams } from 'react-router-dom';
import { NotificationContext } from '../App';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'selling' | 'notifications'>('orders');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const { notify } = useContext(NotificationContext);

  useEffect(() => {
    if (!user?.uid) return;
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notifications') setActiveTab('notifications');
    if (tabParam === 'selling') setActiveTab('selling');

    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), where('userInfo.userId', '==', user.uid)), (snap) => {
      const ords = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      ords.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(ords);
    });

    const unsubscribeRequests = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.uid)), (snap) => {
      const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SellRequest);
      reqs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setSellRequests(reqs);
    });

    const unsubscribeNotif = onSnapshot(query(collection(db, 'users', user.uid, 'notifications')), (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      notifs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => { unsubscribeOrders(); unsubscribeNotif(); unsubscribeRequests(); };
  }, [user?.uid, searchParams]);

  const handleWhatsAppSell = (req: SellRequest) => {
    const adminPhone = '8801778953114';
    const message = encodeURIComponent(`আমি ${user.name}, আমার ${req.deviceName} বিক্রি করার জন্য রিকোয়েস্ট দিয়েছিলাম।`);
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[32px] mb-8 flex flex-col md:flex-row items-center gap-10 border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-slate-50 p-1 bg-white flex-shrink-0 relative">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} alt={user.name} className="w-full h-full rounded-full object-cover" />
          <div className="absolute -bottom-1 -right-1">
             <RankBadge rank={user.rankOverride || 'bronze'} size="sm" showLabel={false} />
          </div>
        </div>

        <div className="text-center md:text-left flex-1 min-w-0">
          <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tight truncate mb-2">{user.name}</h1>
          <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">{user.email}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-4">
             <RankBadge rank={user.rankOverride || 'bronze'} size="sm" />
             <div className="px-4 py-1.5 bg-primary/5 rounded-full text-[8px] font-black uppercase tracking-widest text-primary border border-primary/10">
               {user.rewardPoints || 0} Reward Points
             </div>
          </div>
        </div>

        <button onClick={() => auth.signOut()} className="h-10 px-8 border border-red-500/20 text-red-500 font-bold rounded-xl uppercase tracking-widest text-[8px] hover:bg-red-50 transition-all w-full md:w-auto">
          Sign Out
        </button>
      </div>

      {/* Tabs Container - Optimized Grid for Mobile */}
      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl p-1 mb-10">
        <div className="grid grid-cols-3 gap-1">
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`h-9 rounded-xl font-bold text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('selling')} 
            className={`h-9 rounded-xl font-bold text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'selling' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400'}`}
          >
            Selling
          </button>
          <button 
            onClick={() => setActiveTab('notifications')} 
            className={`h-9 rounded-xl font-bold text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeTab === 'notifications' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400'}`}
          >
            Notifications
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'orders' && (
          orders.length > 0 ? orders.map(order => (
            <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center gap-4">
                <span className="font-bold text-[9px] uppercase tracking-widest text-slate-400">ID: #{order.id.substring(0,8).toUpperCase()}</span>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black uppercase tracking-widest text-primary px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">{order.status}</span>
                   <button onClick={() => setSelectedReceipt(order)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><i className="fas fa-file-invoice"></i></button>
                </div>
              </div>
              <div className="p-6">
                 {order.products?.map((p, i) => (
                   <div key={i} className="flex gap-4 items-center mb-3 last:mb-0">
                      <img src={p.image} className="w-10 h-10 object-contain bg-slate-50 dark:bg-black/20 rounded-lg p-1.5" alt={p.name} />
                      <div className="flex-1 min-w-0"><p className="font-bold text-[10px] uppercase truncate">{p.name}</p><p className="text-[8px] font-bold text-slate-400">Qty: {p.quantity}</p></div>
                      <span className="font-bold text-xs">৳{(p.price * p.quantity).toLocaleString()}</span>
                   </div>
                 ))}
              </div>
            </div>
          )) : <div className="text-center py-20 opacity-20 uppercase font-bold text-[10px] tracking-[0.2em]">No history found</div>
        )}

        {activeTab === 'selling' && (
          <div className="space-y-4">
            {sellRequests.map(req => (
              <div key={req.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div>
                  <h4 className="font-bold text-[11px] uppercase tracking-tight">{req.deviceName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Expected: ৳{req.expectedPrice.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'approved' ? 'bg-green-100 text-green-600' : req.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-primary/5 text-primary'}`}>
                    {req.status}
                  </span>
                  {req.status === 'approved' && (
                    <button 
                      onClick={() => handleWhatsAppSell(req)}
                      className="h-9 px-5 bg-[#25D366] text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <i className="fab fa-whatsapp"></i> Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sellRequests.length === 0 && <div className="text-center py-20 opacity-20 uppercase font-bold text-[10px] tracking-[0.2em]">No requests found</div>}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notifications.map(n => (
              <div key={n.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <h4 className="font-bold text-[10px] uppercase mb-2 text-primary">{n.title}</h4>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && <div className="text-center py-20 opacity-20 uppercase font-bold text-[10px] tracking-[0.2em]">Inbox is empty</div>}
          </div>
        )}
      </div>
      {selectedReceipt && <Receipt order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

export default Profile;
