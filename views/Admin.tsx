import React, { useState, useEffect, useContext, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, updateDoc, doc, onSnapshot, where, deleteDoc, setDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { Order, OrderStatus, User, Product, SiteConfig, SellerRank, Banner } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import RankBadge from '../components/RankBadge';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const Admin: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'products' | 'users' | 'sellers' | 'requests' | 'banners' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (err) => {
      console.error("Order snapshot error:", err);
    });

    const unsubProds = onSnapshot(query(collection(db, 'products'), orderBy('timestamp', 'desc')), (snap) => {
      setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
    });
    const unsubBanners = onSnapshot(query(collection(db, 'banners'), orderBy('timestamp', 'desc')), (snap) => {
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    });
    const unsubReqs = onSnapshot(query(collection(db, 'seller_requests'), where('status', '==', 'pending')), (snap) => {
      setSellerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as SiteConfig);
      setLoading(false);
    });

    return () => { unsubOrders(); unsubProds(); unsubUsers(); unsubReqs(); unsubConfig(); unsubBanners(); };
  }, []);

  const adminProducts = allProducts.filter(p => p.sellerId === auth.currentUser?.uid || !p.sellerId);
  const adminOrders = orders.filter(o => o.sellerId === auth.currentUser?.uid || !o.sellerId);
  const sellers = allUsers.filter(u => u.isSellerApproved);
  const pendingOrdersCount = adminOrders.filter(o => o.status === 'pending').length;

  const sidebarItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'orders', label: 'অর্ডার', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', badge: pendingOrdersCount },
    { id: 'products', label: 'প্রোডাক্টস', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'users', label: 'ইউজার্স', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'sellers', label: 'সেলার লিস্ট', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'requests', label: 'সেলার রিকোয়েস্ট', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'banners', label: 'ব্যানার ম্যানেজার', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'settings', label: 'সেটিংস', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  const handleNavClick = (id: any) => {
    setActiveView(id);
    setIsSidebarOpen(false);
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-black max-w-none">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed md:sticky top-0 left-0 w-72 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-white/5 flex flex-col h-screen z-[200] transition-transform duration-500 ease-ios ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-black brand-font tracking-tighter uppercase">DEEP <span className="text-primary">ADM</span></h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 p-2"><i className="fas fa-times"></i></button>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
            {sidebarItems.map(item => (
              <button 
                key={item.id}
                onClick={() => handleNavClick(item.id as any)}
                className={`w-full flex items-center justify-between h-13 px-5 rounded-2xl transition-all ${activeView === item.id ? 'bg-slate-50 dark:bg-white/5 text-primary border-l-4 border-primary scale-[1.02] font-black' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 font-bold border-l-4 border-transparent'}`}
              >
                <div className="flex items-center gap-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} />
                  </svg>
                  <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
                </div>
                {item.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeView === item.id ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <button onClick={() => navigate('/')} className="mt-8 admin-btn-secondary flex items-center justify-center gap-4 h-14 px-5">
             <i className="fas fa-home"></i>
             ওয়েবসাইটে ফিরুন
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-x-hidden max-w-full">
        <div className="flex items-center gap-5 mb-10">
           <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-white/5">
             <i className="fas fa-bars-staggered"></i>
           </button>
           <h1 className="text-xl font-black uppercase brand-font leading-none">{activeView} <span className="text-primary">CONTROL</span></h1>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {activeView === 'dashboard' && <Dashboard orders={adminOrders} products={adminProducts} users={allUsers} />}
          {activeView === 'orders' && <OrdersList orders={adminOrders} notify={notify} />}
          {activeView === 'products' && <ProductsList products={adminProducts} notify={notify} navigate={navigate} />}
          {activeView === 'users' && <UsersList users={allUsers} notify={notify} />}
          {activeView === 'sellers' && <SellersList users={allUsers} notify={notify} />}
          {activeView === 'requests' && <SellerRequests requests={sellerRequests} notify={notify} />}
          {activeView === 'banners' && <BannersManager banners={banners} notify={notify} />}
          {activeView === 'settings' && <GlobalSettings config={config} notify={notify} />}
        </div>
      </main>

      <style>{`
        .admin-btn-primary { background: #008F5B; color: white; border-radius: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; transition: all 0.3s; box-shadow: 0 10px 20px rgba(0, 143, 91, 0.2); display: flex; align-items: center; justify-content: center; height: 50px; width: 100%; }
        .admin-btn-secondary { background: #f8fafc; color: #94a3b8; border-radius: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; transition: all 0.3s; display: flex; align-items: center; justify-content: center; height: 50px; border: 1px solid #f1f5f9; }
        .dark .admin-btn-secondary { background: #18181b; border-color: #27272a; color: #71717a; }
        .admin-btn-dark { background: #0f172a; color: white; border-radius: 24px; font-weight: 900; text-transform: uppercase; font-size: 11px; height: 60px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: all 0.3s; width: 100%; }
        .dark .admin-btn-dark { background: #ffffff; color: #000000; }
      `}</style>
    </div>
  );
};

// ... FraudPill component ...
export const FraudPill = ({ phone, notify }: { phone: string, notify: any }) => {
  const [status, setStatus] = useState<'loading' | 'clean' | 'risky' | 'fraud'>('loading');
  const [report, setReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const API_KEY = 'eb8ee9070490331a8dea05b9739f816a';
  const BASE_URL = 'https://fraudchecker.link/api/v1/qc/';

  useEffect(() => {
    const check = async () => {
      if (!phone) { setStatus('clean'); return; }
      try {
        const response = await fetch(`${BASE_URL}${phone}`, {
          method: 'GET',
          headers: {
            'api-key': API_KEY,
            'Accept': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success || data.total_order !== undefined) {
          const total = Number(data.total_order) || 0;
          const success = Number(data.success_order) || 0;
          const cancel = Number(data.cancel_order) || 0;
          const ratio = data.success_ratio ? parseFloat(data.success_ratio) : (total > 0 ? (success / total) * 100 : 100);
          
          const stats = {
            phone: phone,
            total: total,
            success: success,
            cancel: cancel,
            ratio: ratio.toFixed(1) + '%',
            message: data.message || (ratio < 40 ? 'বিপজ্জনক গ্রাহক! অর্ডার কনফার্ম করার আগে সতর্ক থাকুন।' : 'গ্রাহক নির্ভরযোগ্য মনে হচ্ছে।'),
          };

          if (ratio < 40) setStatus('fraud');
          else if (ratio < 70) setStatus('risky');
          else setStatus('clean');

          setReport(stats);
        } else {
          throw new Error('API Request Failed');
        }
      } catch (e) { 
        setStatus('clean'); 
        setReport({ total: '?', success: '?', cancel: '?', ratio: 'N/A', message: 'API সংযোগ বিচ্ছিন্ন অথবা কোন তথ্য পাওয়া যায়নি।', phone });
      }
    };
    check();
  }, [phone]);

  if (status === 'loading') return <div className="w-16 h-6 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-full"></div>;
  const btnColors = { fraud: 'bg-primary text-white', risky: 'bg-amber-500 text-white', clean: 'bg-green-500 text-white' };

  return (
    <>
      <button onClick={(e) => { e.preventDefault(); setShowReport(true); }} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${btnColors[status]}`}>
        Fraud Check ({status.toUpperCase()})
      </button>

      {showReport && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-10 animate-fade-in" onClick={() => setShowReport(false)}>
           <div className="bg-white dark:bg-[#050505] w-full h-full md:h-auto md:max-w-xl md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col relative animate-scale-in" onClick={e => e.stopPropagation()}>
              
              <button onClick={() => setShowReport(false)} className="absolute top-8 right-8 w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center text-xl z-20"><i className="fas fa-times"></i></button>

              <div className={`p-12 text-center text-white ${status === 'fraud' ? 'bg-primary' : status === 'risky' ? 'bg-amber-500' : 'bg-green-500'}`}>
                 <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[32px] mx-auto mb-6 flex items-center justify-center text-3xl border border-white/20">
                    <i className={`fas ${status === 'fraud' ? 'fa-user-slash' : status === 'risky' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                 </div>
                 <h4 className="text-3xl font-black uppercase brand-font tracking-tight">Fraud Analysis</h4>
                 <p className="text-xs font-bold opacity-70 uppercase mt-2 tracking-widest">Target: {phone}</p>
              </div>
              
              <div className="p-10 space-y-10 flex-1 overflow-y-auto no-scrollbar">
                 <div className="grid grid-cols-3 gap-4">
                    <StatBox label="Total Orders" val={report.total} />
                    <StatBox label="Delivered" val={report.success} color="text-green-500" />
                    <StatBox label="Cancelled" val={report.cancel} color="text-rose-500" />
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-xs font-black uppercase text-slate-400 tracking-wider">
                       <span>Success Probability</span>
                       <span className={status === 'fraud' ? 'text-primary' : 'text-green-500'}>{report.ratio}</span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-1 shadow-inner">
                       <div className={`h-full rounded-full transition-all duration-1000 ${status === 'fraud' ? 'bg-primary' : status === 'risky' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: report.ratio }}></div>
                    </div>
                 </div>

                 <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 text-center">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Official Verdict</h5>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic uppercase">"{report.message}"</p>
                 </div>

                 <div className="pt-6">
                    <button onClick={() => setShowReport(false)} className="admin-btn-dark w-full h-16 !rounded-[24px]">Dismiss Report</button>
                    <p className="text-[8px] font-bold text-slate-400 text-center mt-6 uppercase tracking-widest opacity-50">Data powered by FraudChecker System</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

const StatBox = ({ label, val, color = "" }: any) => (
  <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl text-center border border-slate-100 dark:border-white/5 shadow-sm">
     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">{label}</span>
     <p className={`text-2xl font-black brand-font ${color}`}>{val}</p>
  </div>
);

const Dashboard = ({ orders, products, users }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
     <StatCard label="Total Orders" val={orders.length} icon="fa-shopping-cart" color="bg-blue-500" />
     <StatCard label="Active Stock" val={products.length} icon="fa-box" color="bg-rose-500" />
     <StatCard label="Total Users" val={users.length} icon="fa-users" color="bg-amber-500" />
  </div>
);

const OrdersList = ({ orders, notify }: any) => {
  const updateStatus = async (id: string, s: OrderStatus) => {
    try { await updateDoc(doc(db, 'orders', id), { status: s }); notify('Status Updated!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-black uppercase brand-font italic">Recent <span className="text-primary">Orders</span></h2>
      {orders.map((o: any) => (
        <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-sm">
           <div className="flex flex-col lg:flex-row justify-between gap-10">
              <div className="flex-1 space-y-6">
                 <div className="flex items-center flex-wrap gap-4">
                    <span className="px-5 py-2 bg-primary/5 text-primary text-[10px] font-black rounded-2xl border border-primary/10 tracking-[0.2em]">ORDER #{o.id.substring(0,8).toUpperCase()}</span>
                    <FraudPill phone={o.userInfo?.phone || o.address?.phone} notify={notify} />
                    <span className="px-4 py-2 bg-slate-50 dark:bg-white/5 text-slate-400 text-[9px] font-black uppercase rounded-xl border border-slate-100 dark:border-white/10 tracking-widest">{o.verificationType?.toUpperCase() || 'NONE'} VERIFIED</span>
                 </div>
                 <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{o.userInfo?.userName || 'Anonymous'}</h4>
                    <p className="text-[11px] font-bold text-slate-400 mt-2.5 uppercase tracking-widest">{o.userInfo?.phone} | {o.paymentMethod?.toUpperCase()}</p>
                 </div>
                 <div className="flex flex-wrap gap-3">
                    {o.products?.map((p: any, i: number) => <span key={i} className="text-[10px] font-black bg-slate-50 dark:bg-black/40 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5 uppercase tracking-tight">{p.name} <span className="text-primary ml-2">x{p.quantity}</span></span>)}
                 </div>
                 <div className="pt-4 border-t border-slate-50 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-50">Delivery Address:</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase italic leading-relaxed">{o.address?.fullAddress}</p>
                 </div>
              </div>
              <div className="lg:w-80 flex flex-col gap-4 justify-center">
                 <div className="text-left lg:text-right mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                    <h3 className="text-4xl font-black brand-font tracking-tighter text-slate-900 dark:text-white">৳{(o.totalAmount || 0).toLocaleString()}</h3>
                 </div>
                 <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)} className="w-full h-15 bg-slate-900 text-white rounded-[28px] px-8 text-[11px] font-black uppercase outline-none shadow-lg">
                    {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <button onClick={() => window.open(`https://wa.me/${o.userInfo?.phone}`, '_blank')} className="admin-btn-primary bg-green-600 h-15 shadow-[0_10px_20px_rgba(22,163,74,0.2)]"><i className="fab fa-whatsapp mr-3 text-lg"></i> Contact Buyer</button>
              </div>
           </div>
        </div>
      ))}
    </div>
  );
};

const UsersList = ({ users, notify }: any) => {
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter((u: User) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.phone.includes(search)
  );

  const toggleBan = async (u: User, type: 'isBanned' | 'ipBan' | 'deviceBan') => {
    try {
      if (type === 'isBanned') await updateDoc(doc(db, 'users', u.uid), { isBanned: !u.isBanned });
      else if (type === 'ipBan' && u.lastIp) await setDoc(doc(db, 'banned_devices', u.lastIp.replace(/\./g, '_')), { type: 'ip', timestamp: serverTimestamp() });
      else if (type === 'deviceBan' && u.deviceId) await setDoc(doc(db, 'banned_devices', u.deviceId), { type: 'device', timestamp: serverTimestamp() });
      notify('Security Status Updated', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleSellerStatus = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isSellerApproved: !current });
      notify(current ? 'Seller Access Removed' : 'Seller Access Approved', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const shadowLogin = (u: User) => {
    localStorage.setItem('shadow_user', JSON.stringify(u));
    window.location.href = '/';
  };

  const changeRank = async (uid: string, rank: SellerRank) => {
    try { await updateDoc(doc(db, 'users', uid), { rankOverride: rank }); notify('Rank Updated', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h2 className="text-xl font-black uppercase brand-font italic">User <span className="text-primary">Database</span></h2>
          <div className="relative w-full md:w-80">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              placeholder="Search users..." 
              className="w-full h-12 pl-12 pr-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 outline-none font-bold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
       </div>

       <div className="space-y-6">
          {filteredUsers.map((u: User) => (
            <div key={u.uid} className="bg-white dark:bg-zinc-900 p-8 rounded-[44px] border border-slate-100 dark:border-white/5 flex flex-col space-y-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 flex-1">
                      <img src={u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[24px] shadow-lg" alt="" />
                      <div>
                        <h4 className="font-black text-lg uppercase tracking-tight">{u.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{u.email} | {u.phone}</p>
                        <div className="flex gap-2 mt-3 items-center">
                          <RankBadge rank={u.rankOverride || 'bronze'} size="sm" />
                          <span className="text-[8px] font-black text-slate-500 uppercase bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md">IP: {u.lastIp || 'N/A'}</span>
                          {u.isSellerApproved && <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-1 rounded-md uppercase">Verified Seller</span>}
                        </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 lg:flex gap-3 w-full md:w-auto">
                      <button onClick={() => shadowLogin(u)} className="admin-btn-dark !h-12 !rounded-2xl !text-[8px] flex-1 !bg-indigo-600 !text-white border-0"><i className="fas fa-ghost mr-2"></i>Shadow Log</button>
                      <button onClick={() => toggleSellerStatus(u.uid, !!u.isSellerApproved)} className={`admin-btn-primary !h-12 !rounded-2xl !text-[8px] flex-1 ${u.isSellerApproved ? '!bg-amber-500' : '!bg-primary'}`}>
                        {u.isSellerApproved ? 'Unverify Seller' : 'Verify Seller'}
                      </button>
                      <button onClick={() => toggleBan(u, 'isBanned')} className={`admin-btn-primary !h-12 !rounded-2xl !text-[8px] flex-1 ${u.isBanned ? '!bg-green-600' : '!bg-rose-600'}`}>{u.isBanned ? 'Authorize' : 'Account Ban'}</button>
                      <button onClick={() => toggleBan(u, 'ipBan')} className="admin-btn-primary !bg-black !h-12 !rounded-2xl !text-[8px] flex-1">Ban IP</button>
                      <button onClick={() => toggleBan(u, 'deviceBan')} className="admin-btn-primary !bg-black !h-12 !rounded-2xl !text-[8px] flex-1">Ban Device</button>
                  </div>
                </div>
            </div>
          ))}
       </div>
    </div>
  );
};

const SellersList = ({ users, notify }: any) => {
  const [search, setSearch] = useState('');
  const sellers = users.filter((u: User) => u.isSellerApproved);
  
  const filteredSellers = sellers.filter((u: User) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.phone.includes(search)
  );

  const toggleBan = async (u: User) => {
    try {
      await updateDoc(doc(db, 'users', u.uid), { isBanned: !u.isBanned });
      notify('Seller Security Status Updated', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const unverify = async (uid: string) => {
    if(!window.confirm('Are you sure you want to remove seller verification?')) return;
    try {
      await updateDoc(doc(db, 'users', uid), { isSellerApproved: false });
      notify('Seller Unverified Successfully', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <h2 className="text-xl font-black uppercase brand-font italic">Seller <span className="text-primary">Management</span></h2>
          <div className="relative w-full md:w-80">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              placeholder="Search verified sellers..." 
              className="w-full h-12 pl-12 pr-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-white/5 outline-none font-bold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
       </div>

       <div className="grid grid-cols-1 gap-6">
          {filteredSellers.map((u: User) => (
            <div key={u.uid} className="bg-white dark:bg-zinc-900 p-10 rounded-[56px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-10 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-20 -translate-y-20"></div>
                
                <div className="relative z-10 w-32 h-32 shrink-0">
                  <img src={u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=008F5B&color=fff&bold=true&size=256`} className="w-full h-full rounded-[40px] object-cover shadow-2xl" alt="" />
                  <div className="absolute -bottom-2 -right-2">
                    <RankBadge rank={u.rankOverride || 'bronze'} size="md" showLabel={false} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 relative z-10 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                      <h4 className="text-2xl font-black uppercase tracking-tight truncate">{u.name}</h4>
                      <span className="w-max mx-auto md:mx-0 px-4 py-1 bg-green-500/10 text-green-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-500/20">VERIFIED MERCHANT</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12">
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Email Access</span>
                          <p className="text-xs font-bold truncate">{u.email}</p>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">WhatsApp / Phone</span>
                          <p className="text-xs font-bold">{u.phone}</p>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Account Balance</span>
                          <p className="text-sm font-black brand-font text-primary italic">৳{(u.walletBalance || 0).toLocaleString()}</p>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Registered Since</span>
                          <p className="text-[10px] font-bold text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                       </div>
                    </div>
                </div>

                <div className="w-full md:w-64 space-y-3 relative z-10">
                    <button onClick={() => window.open(`https://wa.me/${u.phone}`, '_blank')} className="admin-btn-primary !h-14 bg-green-600 shadow-green-500/20"><i className="fab fa-whatsapp mr-3 text-lg"></i>WhatsApp Chat</button>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => toggleBan(u)} className={`admin-btn-secondary !h-12 !rounded-2xl ${u.isBanned ? '!bg-green-100 !text-green-600' : '!bg-rose-100 !text-rose-600'}`}>
                         {u.isBanned ? 'Unlock' : 'Block'}
                       </button>
                       <button onClick={() => unverify(u.uid)} className="admin-btn-secondary !bg-slate-100 !text-slate-800 !h-12 !rounded-2xl">Unverify</button>
                    </div>
                </div>
            </div>
          ))}
          {filteredSellers.length === 0 && <div className="py-40 text-center opacity-20 uppercase font-black tracking-[0.5em] text-[10px]">No sellers matching your search</div>}
       </div>
    </div>
  );
};

const ProductsList = ({ products, notify, navigate }: any) => {
  const deleteProd = async (id: string) => {
    if (!window.confirm('Permanent removal?')) return;
    try { await deleteDoc(doc(db, 'products', id)); notify('Listing Removed', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
         <h2 className="text-xl font-black uppercase brand-font italic">Stock <span className="text-primary">Management</span></h2>
         <button onClick={() => navigate('/add-product')} className="admin-btn-primary !w-auto px-12 !h-15">Add New Product</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[44px] border border-slate-100 dark:border-white/5 flex flex-col group relative shadow-sm hover:shadow-2xl transition-all">
             <div className="aspect-square bg-slate-50 dark:bg-black/40 p-8 rounded-[36px] mb-6 overflow-hidden flex items-center justify-center relative shadow-inner">
                <img src={p.image?.split(',')[0]} className="max-w-[80%] max-h-[80%] object-contain group-hover:scale-110 transition-transform duration-700" alt="" />
                {p.stock !== 'instock' && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><span className="bg-primary text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest">Empty</span></div>}
             </div>
             <h4 className="font-black text-[11px] uppercase truncate mb-2 flex-1">{p.name}</h4>
             <p className="text-primary font-black brand-font text-xl mb-6">৳{p.price.toLocaleString()}</p>
             <div className="flex gap-2">
                <button onClick={() => navigate(`/edit-product/${p.id}`)} className="admin-btn-secondary flex-1 !h-12 !rounded-2xl">Edit</button>
                <button onClick={() => deleteProd(p.id)} className="admin-btn-primary flex-1 !h-12 !rounded-2xl !bg-rose-600 shadow-rose-500/20">Del</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BannersManager = ({ banners, notify }: any) => {
  const [form, setForm] = useState({ text: '', link: '', image: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append('image', file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) { setForm({ ...form, image: data.data.url }); notify('Visual Asset Uploaded', 'success'); }
    } catch (e) { notify('Upload Error', 'error'); }
  };

  const handleSave = async () => {
    if (!form.image || !form.text) return notify('Required!', 'error');
    try { await addDoc(collection(db, 'banners'), { ...form, timestamp: serverTimestamp() }); setForm({ text: '', link: '', image: '' }); notify('Promotion Active', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm('Remove from slider?')) return;
    try { await deleteDoc(doc(db, 'banners', id)); notify('Promotion Expired', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-12">
       <h2 className="text-xl font-black uppercase brand-font italic">Slider <span className="text-primary">Promotions</span></h2>
       <div className="bg-white dark:bg-zinc-900 p-10 rounded-[56px] space-y-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div className="space-y-6">
                <input placeholder="Marketing Copy" className="w-full h-15 px-8 bg-slate-50 dark:bg-black rounded-3xl outline-none font-bold" value={form.text} onChange={e => setForm({...form, text: e.target.value})} />
                <input placeholder="Direct Route (Optional)" className="w-full h-15 px-8 bg-slate-50 dark:bg-black rounded-3xl outline-none font-bold" value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
             </div>
             <div onClick={() => fileRef.current?.click()} className="h-44 bg-slate-50 dark:bg-black rounded-[40px] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner">
                {form.image ? <img src={form.image} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black uppercase text-slate-400">Select Slider Asset</span>}
                <input type="file" ref={fileRef} className="hidden" onChange={handleUpload} />
             </div>
          </div>
          <button onClick={handleSave} className="admin-btn-dark !w-full">Deploy Promotion</button>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {banners.map((b: any) => (
            <div key={b.id} className="relative group rounded-[44px] overflow-hidden shadow-sm">
               <img src={b.image} className="w-full aspect-video object-cover" />
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteBanner(b.id)} className="w-14 h-14 bg-rose-600 text-white rounded-full"><i className="fas fa-trash"></i></button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

const SellerRequests = ({ requests, notify }: any) => {
  const action = async (id: string, uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'seller_requests', id), { status });
      if (status === 'approved') await updateDoc(doc(db, 'users', uid), { isSellerApproved: true });
      notify('Verification Complete', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-6">
       {requests.map((r: any) => (
         <div key={r.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[48px] flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm">
            <div className="flex items-center gap-6"><img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[24px]" /><div><h4 className="font-black uppercase text-lg">{r.userName}</h4><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.userPhone}</p></div></div>
            <div className="flex gap-4 w-full md:w-auto">
               <button onClick={() => action(r.id, r.userId, 'rejected')} className="admin-btn-secondary !px-12 !h-14 !rounded-2xl">Deny</button>
               <button onClick={() => action(r.id, r.userId, 'approved')} className="admin-btn-primary !px-12 !h-14 !rounded-2xl">Verify Account</button>
            </div>
         </div>
       ))}
       {requests.length === 0 && <div className="py-20 text-center opacity-20 uppercase font-black tracking-widest text-xs">No pending requests</div>}
    </div>
  );
};

const GlobalSettings = ({ config, notify }: any) => {
  const [form, setForm] = useState({ 
    text: config?.headerNotification?.text || '', 
    enabled: config?.headerNotification?.enabled || false,
    nid: config?.nidRequired || false,
    advance: config?.advanceRequired || false,
    cod: config?.codEnabled || false
  });

  const save = async () => {
    try { 
      await updateDoc(doc(db, 'site_config', 'global'), { 
        headerNotification: { enabled: form.enabled, text: form.text },
        nidRequired: form.nid,
        advanceRequired: form.advance,
        codEnabled: form.cod,
        advanceAmount: 300
      }); 
      notify('System Updated', 'success'); 
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-12">
       <h2 className="text-xl font-black uppercase brand-font italic">Payment <span className="text-primary">Control</span></h2>
       
       <div className="bg-white dark:bg-zinc-900 p-10 rounded-[56px] space-y-10 shadow-sm border border-slate-100 dark:border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <ToggleBtn active={form.nid} label="NID Verification" icon="fa-id-card" onClick={() => setForm({...form, nid: !form.nid})} />
             <ToggleBtn active={form.advance} label="300tk Advance" icon="fa-wallet" onClick={() => setForm({...form, advance: !form.advance})} />
             <ToggleBtn active={form.cod} label="Full Cash on Del." icon="fa-truck" onClick={() => setForm({...form, cod: !form.cod})} />
          </div>

          <div className="space-y-6 pt-10 border-t border-slate-50 dark:border-white/5">
             <label className="text-[10px] font-black uppercase text-slate-400 pl-4 tracking-widest">Global Header Message</label>
             <div className="flex flex-col md:flex-row gap-4">
                <input placeholder="Header text..." className="flex-1 h-15 bg-slate-50 dark:bg-black px-8 rounded-3xl font-bold" value={form.text} onChange={e => setForm({...form, text: e.target.value})} />
                <button onClick={() => setForm({...form, enabled: !form.enabled})} className={`h-15 px-12 rounded-3xl font-black text-[11px] uppercase ${form.enabled ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-white/5 text-slate-500'}`}>{form.enabled ? 'ON' : 'OFF'}</button>
             </div>
          </div>

          <button onClick={save} className="admin-btn-dark !h-18">Save Global Configuration</button>
       </div>
    </div>
  );
};

const ToggleBtn = ({ active, label, icon, onClick }: any) => (
  <button onClick={onClick} className={`p-8 rounded-[40px] border-2 transition-all flex flex-col items-center justify-center gap-4 ${active ? 'bg-primary/5 border-primary text-primary shadow-inner shadow-primary/10' : 'bg-slate-50 dark:bg-black border-slate-100 dark:border-white/5 text-slate-400 grayscale opacity-40'}`}>
     <i className={`fas ${icon} text-2xl`}></i>
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
     <div className={`w-3 h-3 rounded-full ${active ? 'bg-primary animate-pulse' : 'bg-slate-200'}`}></div>
  </button>
);

const StatCard = ({ label, val, icon, color }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] flex items-center justify-between shadow-sm border border-slate-100 dark:border-white/5 group hover:shadow-xl transition-all">
    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.3em]">{label}</p><h3 className="text-5xl font-black brand-font tracking-tighter leading-none group-hover:scale-110 transition-transform origin-left">{val}</h3></div>
    <div className={`w-18 h-18 ${color} text-white rounded-[32px] flex items-center justify-center text-3xl shadow-2xl shadow-black/5 group-hover:-translate-y-2 transition-transform`}><i className={`fas ${icon}`}></i></div>
  </div>
);

export default Admin;
