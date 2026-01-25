
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, updateDoc, doc, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { Order, OrderStatus, User, Product, SiteConfig, SellerRank } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const Admin: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'products' | 'users' | 'requests' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    const unsubProds = onSnapshot(query(collection(db, 'products'), orderBy('timestamp', 'desc')), (snap) => {
      setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
    });
    const unsubReqs = onSnapshot(query(collection(db, 'seller_requests'), where('status', '==', 'pending')), (snap) => {
      setSellerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as SiteConfig);
      setLoading(false);
    });

    return () => { unsubOrders(); unsubProds(); unsubUsers(); unsubReqs(); unsubConfig(); };
  }, []);

  const adminProducts = allProducts.filter(p => p.sellerId === auth.currentUser?.uid || !p.sellerId);
  const adminOrders = orders.filter(o => o.sellerId === auth.currentUser?.uid || !o.sellerId);

  const sidebarItems = [
    { id: 'dashboard', label: 'হোম', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z' },
    { id: 'orders', label: 'অর্ডার', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { id: 'products', label: 'পণ্য', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'users', label: 'ইউজার', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'requests', label: 'সেলার', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'settings', label: 'সেটিংস', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-black max-w-none">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-white/5 flex-col h-screen sticky top-0 z-[100]">
        <div className="p-8 flex flex-col h-full">
          <h2 className="text-xl font-black brand-font tracking-tighter uppercase mb-12">DEEP <span className="text-primary">ADMIN</span></h2>
          <nav className="space-y-3 flex-1">
            {sidebarItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-4 h-12 px-5 rounded-2xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 font-black' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-bold'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => navigate('/')} className="mt-auto flex items-center gap-4 h-12 px-5 text-slate-400 hover:text-primary transition-all group font-black text-[10px] uppercase tracking-widest">
             <i className="fas fa-sign-out-alt"></i>
             ওয়েবসাইটে ফিরুন
          </button>
        </div>
      </aside>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 z-[200]">
         <nav className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/5 h-16 rounded-full shadow-2xl flex items-center justify-around px-4">
            {sidebarItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`relative w-11 h-11 flex items-center justify-center rounded-full transition-all ${activeView === item.id ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'text-slate-400'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {activeView === item.id && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border border-primary"></span>
                )}
              </button>
            ))}
            <button onClick={() => navigate('/')} className="w-11 h-11 flex items-center justify-center text-slate-400">
               <i className="fas fa-arrow-left"></i>
            </button>
         </nav>
      </div>

      {/* --- CONTENT AREA --- */}
      <main className="flex-1 p-5 md:p-12 overflow-x-hidden pb-32 md:pb-12 max-w-full">
        {/* Page Header (Mobile Only) */}
        <div className="md:hidden flex items-center justify-between mb-10 mt-2">
           <h1 className="text-xl font-black brand-font uppercase tracking-tighter">DEEP <span className="text-primary">ADMIN</span></h1>
           <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <i className="fas fa-crown"></i>
           </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {activeView === 'dashboard' && <Dashboard orders={adminOrders} products={adminProducts} users={allUsers} />}
          {activeView === 'orders' && <OrdersList orders={adminOrders} notify={notify} />}
          {activeView === 'products' && <ProductsList products={adminProducts} notify={notify} navigate={navigate} />}
          {activeView === 'users' && <UsersList users={allUsers} notify={notify} navigate={navigate} />}
          {activeView === 'requests' && <SellerRequests requests={sellerRequests} notify={notify} />}
          {activeView === 'settings' && <GlobalSettings config={config} notify={notify} />}
        </div>
      </main>
    </div>
  );
};

/* --- SUB COMPONENTS (Optimized for Mobile) --- */

const Dashboard = ({ orders, products, users }: any) => (
  <div className="animate-fade-in space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
       <StatCard label="মোট অর্ডার" val={orders.length} icon="fa-shopping-cart" color="bg-blue-500" />
       <StatCard label="মোট প্রোডাক্ট" val={products.length} icon="fa-box" color="bg-rose-500" />
       <StatCard label="মোট ইউজার" val={users.length} icon="fa-users" color="bg-amber-500" />
    </div>
    <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] md:rounded-[56px] border border-slate-100 dark:border-white/5 shadow-sm">
       <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">অ্যাডমিন ওভারভিউ</h3>
       <div className="p-6 md:p-10 bg-slate-50 dark:bg-black/20 rounded-[32px] border border-dashed border-slate-200 dark:border-white/10">
          <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">স্বাগতম অ্যাডমিন। আপনার ড্যাশবোর্ড এখন মোবাইলেও ব্যবহারের উপযোগী। বাম পাশের মেনু বা নিচের বার থেকে প্রয়োজনীয় সেকশনে যান।</p>
       </div>
    </div>
  </div>
);

const FraudPill = ({ phone, notify }: { phone: string, notify: any }) => {
  const [status, setStatus] = useState<'loading' | 'clean' | 'fraud'>('loading');
  const [report, setReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`https://www.fraudbd.com/api/check?phone=${phone}`);
        const data = await res.json();
        setReport(data);
        setStatus(data.status === 'fraud' ? 'fraud' : 'clean');
      } catch (e) {
        setStatus('clean');
      }
    };
    check();
  }, [phone]);

  if (status === 'loading') return <div className="w-16 h-6 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-full"></div>;

  return (
    <>
      <button 
        onClick={() => setShowReport(true)}
        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${status === 'fraud' ? 'bg-primary text-white' : 'bg-green-500 text-white'}`}
      >
        {status === 'fraud' ? 'Fraud Alert' : 'Trusted'}
      </button>

      {showReport && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowReport(false)}>
           <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] max-w-sm w-full animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                 <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-white text-2xl mb-4 shadow-xl ${status === 'fraud' ? 'bg-primary' : 'bg-green-500'}`}>
                    <i className={`fas ${status === 'fraud' ? 'fa-triangle-exclamation' : 'fa-shield-check'}`}></i>
                 </div>
                 <h4 className="text-xl font-black uppercase brand-font">FRAUD REPORT</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Phone: {phone}</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-black/40 rounded-[28px] mb-8">
                 <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed text-center">
                   {report?.message || 'এই নম্বরটি আমাদের ডাটাবেসে ফ্রড হিসেবে রেকর্ড করা নেই। লেনদেনের আগে সতর্ক থাকুন।'}
                 </p>
              </div>
              <button onClick={() => setShowReport(false)} className="w-full h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl">বন্ধ করুন</button>
           </div>
        </div>
      )}
    </>
  );
};

const OrdersList = ({ orders, notify }: any) => {
  const updateStatus = async (id: string, s: OrderStatus) => {
    try { await updateDoc(doc(db, 'orders', id), { status: s }); notify('আপডেট সফল!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-10">
      <h2 className="text-xl font-black uppercase brand-font mb-4">অর্ডার <span className="text-primary">ম্যানেজমেন্ট</span></h2>
      <div className="grid grid-cols-1 gap-6">
        {orders.map((o: any) => (
          <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[44px] md:rounded-[56px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between gap-8">
              <div className="flex-1 space-y-6">
                 <div className="flex items-center flex-wrap gap-3">
                    <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em] bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">Order #{o.id?.substring(0,8).toUpperCase()}</span>
                    {o.userInfo?.phone && <FraudPill phone={o.userInfo.phone} notify={notify} />}
                 </div>
                 <div>
                    <h4 className="font-black text-xl md:text-2xl uppercase tracking-tighter leading-none">{o.userInfo?.userName || 'অজানা ইউজার'}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{o.userInfo?.phone} | {o.paymentMethod?.toUpperCase()}</p>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {o.products?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                         <span className="text-[10px] font-black uppercase tracking-tight">{p.name}</span>
                         <span className="text-[10px] font-black text-primary">x{p.quantity}</span>
                      </div>
                    ))}
                 </div>
                 <div className="pt-6 border-t border-slate-50 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">ডেলিভারি ঠিকানা:</p>
                    <p className="text-xs font-bold leading-relaxed text-slate-600 dark:text-slate-300">{o.address?.fullAddress}</p>
                 </div>
              </div>

              <div className="lg:w-72 flex flex-col gap-4">
                 <div className="text-left lg:text-right mb-4">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest opacity-50">মোট বিল</p>
                    <h3 className="text-3xl font-black brand-font tracking-tighter text-slate-900 dark:text-white">৳{o.totalAmount?.toLocaleString()}</h3>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-slate-400 pl-4 tracking-widest">স্ট্যাটাস আপডেট</label>
                    <select 
                        value={o.status} 
                        onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)} 
                        className="w-full h-14 bg-slate-900 text-white rounded-[24px] px-6 text-[10px] font-black uppercase outline-none border border-white/10 shadow-lg"
                    >
                        {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <button onClick={() => window.open(`https://wa.me/${o.userInfo?.phone}`, '_blank')} className="w-full h-14 bg-green-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <i className="fab fa-whatsapp text-base"></i> WhatsApp
                 </button>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="py-40 text-center opacity-20 uppercase font-black tracking-[0.5em] text-[10px]">অর্ডার পাওয়া যায়নি</div>}
      </div>
    </div>
  );
};

const ProductsList = ({ products, notify, navigate }: any) => {
  const deleteProd = async (id: string) => {
    if (!window.confirm('মুছে ফেলতে চান?')) return;
    try { await deleteDoc(doc(db, 'products', id)); notify('প্রোডাক্ট ডিলিট হয়েছে', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <h2 className="text-xl font-black uppercase brand-font">প্রোডাক্ট <span className="text-primary">ম্যানেজমেন্ট</span></h2>
         <button onClick={() => navigate('/add-product')} className="w-full md:w-auto px-10 h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95">নতুন প্রোডাক্ট</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 p-5 md:p-8 rounded-[40px] border border-slate-100 dark:border-white/5 group relative shadow-sm hover:shadow-2xl transition-all flex flex-col">
             <div className="aspect-square bg-slate-50 dark:bg-black/40 p-6 md:p-10 rounded-[32px] mb-6 overflow-hidden flex items-center justify-center relative shadow-inner">
                <img src={p.image?.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt="" />
                {p.stock !== 'instock' && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-primary text-white px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-widest">Out Stock</span>
                  </div>
                )}
             </div>
             <h4 className="font-black text-[11px] md:text-xs uppercase truncate mb-2 leading-tight flex-1">{p.name}</h4>
             <p className="text-primary font-black brand-font text-lg md:text-xl mb-6">৳{p.price.toLocaleString()}</p>
             <div className="flex gap-2">
                <button onClick={() => navigate(`/edit-product/${p.id}`)} className="flex-1 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-500 hover:bg-primary/10 hover:text-primary transition-all">এডিট</button>
                <button onClick={() => deleteProd(p.id)} className="flex-1 h-12 bg-primary/10 text-primary rounded-2xl text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all">ডিলিট</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UsersList = ({ users, notify, navigate }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = users.filter((u: User) => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const toggleBan = async (uid: string, current: boolean) => {
    try { await updateDoc(doc(db, 'users', uid), { isBanned: !current }); notify(current ? 'আনব্যান সফল!' : 'ব্যান করা হয়েছে!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  const updateRank = async (uid: string, rank: SellerRank) => {
    try { await updateDoc(doc(db, 'users', uid), { rankOverride: rank }); notify('র‍্যাঙ্ক আপডেট সফল!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  const handleShadowLogin = (u: User) => {
    localStorage.setItem('shadow_user', JSON.stringify(u));
    notify(`Shadow Login: ${u.name}`, 'info');
    window.location.reload();
  };

  return (
    <div className="animate-fade-in space-y-10">
      <h2 className="text-xl font-black uppercase brand-font">ইউজার <span className="text-primary">ম্যানেজমেন্ট</span></h2>
      <div className="relative group">
         <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
         <input 
            placeholder="নাম, ইমেইল বা ফোন দিয়ে সার্চ..." 
            className="w-full h-18 px-16 bg-white dark:bg-zinc-900 rounded-[32px] outline-none font-bold text-sm border border-slate-100 dark:border-white/5 shadow-sm group-focus-within:border-primary/20 transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
         />
      </div>

      <div className="grid grid-cols-1 gap-5">
        {filtered.map((u: User) => (
          <div key={u.uid} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[40px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm hover:shadow-xl transition-all">
             <div className="flex items-center gap-6 flex-1 w-full">
                <div className="relative shrink-0">
                   <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e11d48&color=fff&bold=true&size=128`} className="w-16 h-16 md:w-20 md:h-20 rounded-[28px] shadow-lg border-4 border-white dark:border-black/40" alt="" />
                   {u.isBanned && <div className="absolute inset-0 bg-red-500/60 rounded-[28px] flex items-center justify-center text-white text-[9px] font-black uppercase">BANNED</div>}
                </div>
                <div className="min-w-0">
                   <h4 className="font-black text-base md:text-xl uppercase tracking-tighter truncate leading-tight">{u.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest truncate">{u.email} | {u.phone}</p>
                   <div className="flex gap-2 mt-3">
                      <span className="text-[8px] font-black uppercase px-3 py-1 bg-slate-100 dark:bg-black/40 rounded-lg text-slate-500 border border-slate-200 dark:border-white/5">৳{u.walletBalance || 0}</span>
                      <span className="text-[8px] font-black uppercase px-3 py-1 bg-primary/5 rounded-lg text-primary border border-primary/10">Pts: {u.rewardPoints || 0}</span>
                   </div>
                </div>
             </div>
             
             <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                <div className="flex flex-col gap-1.5 flex-1 md:flex-none">
                   <label className="text-[8px] font-black uppercase text-slate-400 ml-3 tracking-widest opacity-50">Seller Rank</label>
                   <select 
                      value={u.rankOverride || 'bronze'} 
                      onChange={(e) => updateRank(u.uid, e.target.value as SellerRank)}
                      className="h-11 bg-slate-50 dark:bg-black rounded-2xl px-5 text-[10px] font-black uppercase border border-slate-200 dark:border-white/5 outline-none cursor-pointer shadow-inner"
                   >
                      {['bronze', 'silver', 'gold', 'platinum', 'diamond', 'hero', 'grand'].map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                </div>

                <div className="flex gap-2 flex-1 md:flex-none">
                    <button onClick={() => handleShadowLogin(u)} className="flex-1 md:w-11 md:h-11 h-11 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90 border border-slate-200 dark:border-white/5 shadow-sm" title="Login as User">
                        <i className="fas fa-sign-in-alt"></i>
                    </button>
                    
                    <button onClick={() => toggleBan(u.uid, !!u.isBanned)} className={`flex-[2] md:px-8 h-11 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-lg ${u.isBanned ? 'bg-green-500 text-white border-green-400' : 'bg-primary text-white border-primary/40 shadow-primary/20'}`}>
                        {u.isBanned ? 'Unban User' : 'Ban User'}
                    </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SellerRequests = ({ requests, notify }: any) => {
  const handleAction = async (id: string, uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'seller_requests', id), { status });
      if (status === 'approved') await updateDoc(doc(db, 'users', uid), { isSellerApproved: true });
      notify(`রিকোয়েস্ট ${status === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}!`, 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-10">
       <h2 className="text-xl font-black uppercase brand-font">সেলার <span className="text-primary">অনুরোধ</span></h2>
       <div className="grid grid-cols-1 gap-6">
          {requests.map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[44px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
               <div className="flex items-center gap-6 w-full md:w-auto">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 md:w-20 md:h-20 rounded-[28px] shadow-lg border-4 border-white dark:border-black/40" alt="" />
                  <div>
                    <h4 className="font-black text-xl uppercase tracking-tighter leading-tight">{r.userName}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-2">{r.userPhone}</p>
                    <p className="text-[9px] font-bold text-primary mt-2 uppercase tracking-[0.3em]">Verification Pending</p>
                  </div>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                  <button onClick={() => handleAction(r.id, r.userId, 'rejected')} className="flex-1 md:px-12 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all border border-slate-200 dark:border-white/10">রিজেক্ট</button>
                  <button onClick={() => handleAction(r.id, r.userId, 'approved')} className="flex-1 md:px-12 h-16 bg-primary text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all">অ্যাপ্রুভ</button>
               </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
               <i className="fas fa-user-check text-6xl mb-6"></i>
               <p className="uppercase font-black tracking-[0.4em] text-[10px]">পেন্ডিং রিকোয়েস্ট নেই</p>
            </div>
          )}
       </div>
    </div>
  );
};

const GlobalSettings = ({ config, notify }: any) => {
  const [form, setForm] = useState({
    headerText: config?.headerNotification?.text || '',
    headerEnabled: config?.headerNotification?.enabled || false,
    nidRequired: config?.nidRequired || false,
    advanceRequired: config?.advanceRequired || false
  });

  const saveSettings = async () => {
    try {
      await updateDoc(doc(db, 'site_config', 'global'), {
        headerNotification: { enabled: form.headerEnabled, text: form.headerText },
        nidRequired: form.nidRequired,
        advanceRequired: form.advanceRequired
      });
      notify('সেটিংস সেভ হয়েছে!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-10 max-w-4xl mx-auto">
       <h2 className="text-xl font-black uppercase brand-font">গ্লোবাল <span className="text-primary">সেটিংস</span></h2>
       
       <div className="space-y-12 bg-white dark:bg-zinc-900 p-8 md:p-16 rounded-[48px] md:rounded-[64px] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="space-y-6">
             <label className="text-[10px] font-black uppercase text-slate-400 pl-4 tracking-[0.3em] opacity-50">হেডার নোটিফিকেশন বার</label>
             <div className="flex flex-col md:flex-row gap-4">
                <input 
                   placeholder="টেক্সট লিখুন..." 
                   className="flex-1 h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold text-xs border border-slate-100 dark:border-white/10 shadow-inner" 
                   value={form.headerText} 
                   onChange={e => setForm({...form, headerText: e.target.value})} 
                />
                <button 
                   onClick={() => setForm({...form, headerEnabled: !form.headerEnabled})} 
                   className={`h-16 px-10 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${form.headerEnabled ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-slate-200 dark:bg-white/5 text-slate-400 shadow-none'}`}
                >
                   {form.headerEnabled ? 'ON' : 'OFF'}
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-slate-50 dark:border-white/5">
             <ToggleSection label="NID ভেরিফিকেশন" active={form.nidRequired} onToggle={() => setForm({...form, nidRequired: !form.nidRequired})} />
             <ToggleSection label="অ্যাডভান্স পেমেন্ট (৳৩০০)" active={form.advanceRequired} onToggle={() => setForm({...form, advanceRequired: !form.advanceRequired})} />
          </div>

          <button onClick={saveSettings} className="w-full h-20 bg-primary text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl shadow-primary/30 mt-10 transition-all active:scale-95 hover:brightness-110">
             সেটিংস সেভ করুন
          </button>
       </div>
    </div>
  );
};

const StatCard = ({ label, val, icon, color }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[44px] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm hover:shadow-2xl transition-all group">
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3 opacity-50">{label}</p>
      <h3 className="text-4xl md:text-5xl font-black brand-font tracking-tighter leading-none group-hover:scale-110 transition-transform origin-left">{val}</h3>
    </div>
    <div className={`w-16 h-16 md:w-20 md:h-20 ${color} text-white rounded-[28px] flex items-center justify-center text-2xl md:text-3xl shadow-2xl shadow-black/5 group-hover:-translate-y-2 transition-transform`}>
       <i className={`fas ${icon}`}></i>
    </div>
  </div>
);

const ToggleSection = ({ label, active, onToggle }: any) => (
  <div className="flex flex-col gap-5">
    <label className="text-[10px] font-black uppercase text-slate-400 pl-3 tracking-[0.2em] opacity-50">{label}</label>
    <button 
      onClick={onToggle} 
      className={`h-18 rounded-[28px] font-black text-[11px] uppercase tracking-[0.2em] border-2 transition-all flex items-center justify-center gap-4 ${active ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' : 'border-slate-100 dark:border-white/5 text-slate-300'}`}
    >
       <i className={`fas ${active ? 'fa-toggle-on' : 'fa-toggle-off'} text-2xl`}></i>
       {active ? 'সক্রিয় (ON)' : 'নিষ্ক্রিয় (OFF)'}
    </button>
  </div>
);

export default Admin;
