
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { Order, Product, User, SiteConfig, SellerRequest, HomeBanner, CustomAd, SellerRank } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';
import RankBadge from '../components/RankBadge';
import { useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [ads, setAds] = useState<CustomAd[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ 
    bannerVisible: false, bannerText: '', bannerType: 'info',
    metaTitle: '', metaDescription: '', ogImage: '', keywords: '',
    contactPhone: '', telegramLink: '', whatsappLink: '',
    oneSignalAppId: '', oneSignalApiKey: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'requests' | 'settings' | 'banners' | 'ads'>('orders');
  const [userSearch, setUserSearch] = useState('');
  const { notify, enterShadowMode } = useContext(NotificationContext);

  // Modals
  const [showAdModal, setShowAdModal] = useState<CustomAd | null>(null);
  const [adForm, setAdForm] = useState<Partial<CustomAd>>({ imageUrl: '', link: '', text: '', placement: 'home_middle', order: 0 });
  const [showBannerModal, setShowBannerModal] = useState<HomeBanner | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<HomeBanner>>({ imageUrl: '', link: '', order: 0 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const snap = await getDocs(query(collection(db, 'orders'), orderBy('timestamp', 'desc')));
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      } else if (activeTab === 'products') {
        const snap = await getDocs(query(collection(db, 'products'), orderBy('timestamp', 'desc')));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } else if (activeTab === 'users') {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      } else if (activeTab === 'banners') {
        const snap = await getDocs(query(collection(db, 'banners'), orderBy('order', 'asc')));
        setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeBanner)));
      } else if (activeTab === 'ads') {
        const snap = await getDocs(query(collection(db, 'ads'), orderBy('order', 'asc')));
        setAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomAd)));
      } else if (activeTab === 'requests') {
        // সেলার অনুরোধ ডাটা লোড করা
        const snap = await getDocs(query(collection(db, 'seller_requests'), orderBy('timestamp', 'desc')));
        setSellerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SellerRequest)));
      } else if (activeTab === 'settings') {
        const snap = await getDoc(doc(db, 'site_config', 'global'));
        if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
      }
    } catch (err: any) {
      console.error(err);
      notify('ডাটা লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await updateDoc(doc(db, 'site_config', 'global'), siteConfig as any);
      notify('সেটিংস আপডেট হয়েছে!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const updateUserField = async (userId: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'users', userId), { [field]: value });
      notify('ইউজার আপডেট হয়েছে', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const deleteItem = async (id: string, coll: string) => {
    if (!confirm('আপনি কি নিশ্চিত?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      notify('মুছে ফেলা হয়েছে', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const approveSeller = async (req: SellerRequest) => {
    try {
      await updateDoc(doc(db, 'users', req.userId), { isSellerApproved: true });
      await updateDoc(doc(db, 'seller_requests', req.id), { status: 'approved' });
      notify('সেলার অনুমতি দেওয়া হয়েছে!', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showBannerModal?.id) await updateDoc(doc(db, 'banners', showBannerModal.id), bannerForm);
      else await addDoc(collection(db, 'banners'), bannerForm);
      setShowBannerModal(null);
      fetchData();
      notify('স্লাইডার সেভ হয়েছে', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showAdModal?.id) await updateDoc(doc(db, 'ads', showAdModal.id), adForm);
      else await addDoc(collection(db, 'ads'), adForm);
      setShowAdModal(null);
      fetchData();
      notify('বিজ্ঞাপন সেভ হয়েছে', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen pb-40 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight brand-font">DEEP <span className="text-primary">ADMIN</span></h1>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">সুপার কন্ট্রোল প্যানেল</p>
        </div>
        <div className="flex flex-wrap p-1.5 bg-slate-100 dark:bg-white/5 rounded-3xl gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'orders', label: 'অর্ডার' },
            { id: 'products', label: 'পণ্য' },
            { id: 'users', label: 'ইউজার' },
            { id: 'banners', label: 'স্লাইডার' },
            { id: 'ads', label: 'বিজ্ঞাপন' },
            { id: 'requests', label: 'অনুরোধ' },
            { id: 'settings', label: 'সেটিংস' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-5 h-11 rounded-2xl font-bold text-[11px] transition-all shrink-0 ${activeTab === tab.id ? 'bg-primary text-white shadow-xl' : 'text-slate-500 hover:bg-white dark:hover:bg-white/10'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {orders.map(o => (
                 <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col gap-5 shadow-sm">
                    <div className="flex justify-between items-start">
                       <div>
                          <span className="text-[10px] font-bold text-primary uppercase">ID: #{o.id?.substring(0,8).toUpperCase()}</span>
                          <h4 className="font-bold text-sm mt-1">{o.userInfo?.userName}</h4>
                          <p className="text-[10px] font-bold text-slate-400">{o.userInfo?.phone}</p>
                       </div>
                       <p className="text-lg font-black">৳{o.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-black/30 rounded-2xl">
                       {o.products?.map((p, i) => <p key={i} className="text-[10px] font-bold text-slate-500 uppercase">{p.name} x{p.quantity}</p>)}
                    </div>
                    <select 
                      value={o.status || 'pending'} 
                      onChange={async (e) => { await updateDoc(doc(db, 'orders', o.id), { status: e.target.value }); fetchData(); }} 
                      className="w-full h-11 bg-slate-100 dark:bg-black rounded-xl px-4 text-[11px] font-bold outline-none border border-transparent"
                    >
                      {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
               ))}
            </div>
          )}

          {/* Products Tab (Add/Edit/Remove Buttons clearly added) */}
          {activeTab === 'products' && (
            <div className="space-y-8">
               <button onClick={() => navigate('/add-product')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                  <i className="fas fa-plus"></i> নতুন পণ্য যোগ করুন
               </button>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm flex flex-col group">
                    <div className="aspect-square bg-slate-50 dark:bg-black/20 p-6 relative">
                      <img src={p.image.split(',')[0]} className="w-full h-full object-contain" alt="" />
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <h4 className="text-[11px] font-black line-clamp-1 uppercase mb-3 text-slate-800 dark:text-slate-200">{p.name}</h4>
                      <p className="font-black text-primary text-sm mb-4">৳{p.price.toLocaleString()}</p>
                      
                      {/* Edit/Delete Buttons */}
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button onClick={() => navigate(`/edit-product/${p.id}`)} className="h-10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all">
                          <i className="fas fa-edit mr-1"></i> Edit
                        </button>
                        <button onClick={() => deleteItem(p.id, 'products')} className="h-10 bg-slate-100 dark:bg-white/5 text-red-500 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                          <i className="fas fa-trash mr-1"></i> Del
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
               </div>
            </div>
          )}

          {/* Requests Tab (Fixed Data Loading) */}
          {activeTab === 'requests' && (
            <div className="space-y-8">
               <div className="flex items-center gap-4 mb-2">
                 <h2 className="text-xl font-black uppercase tracking-tight brand-font italic">SELLER <span className="text-primary">REQUESTS</span></h2>
                 <div className="h-[2px] flex-1 bg-slate-100 dark:bg-white/5"></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sellerRequests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col gap-6">
                       <div className="flex items-center gap-6">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[24px]" alt="" />
                          <div className="flex-1 min-w-0">
                             <h4 className="font-black text-sm uppercase truncate">{req.userName}</h4>
                             <p className="text-[10px] font-bold text-slate-400 mt-1">{req.userPhone}</p>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${req.status === 'pending' ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                             {req.status}
                          </span>
                       </div>
                       {req.status === 'pending' && (
                         <div className="grid grid-cols-2 gap-3 mt-2">
                            <button onClick={() => approveSeller(req)} className="h-12 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">অ্যাপ্রুভ করুন</button>
                            <button onClick={() => deleteItem(req.id, 'seller_requests')} className="h-12 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">বাতিল করুন</button>
                         </div>
                       )}
                    </div>
                  ))}
                  {sellerRequests.length === 0 && (
                    <div className="col-span-full py-40 text-center opacity-20 uppercase font-black tracking-widest text-sm">
                      কোন নতুন সেলার অনুরোধ নেই
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="relative max-w-md mx-auto mb-12">
                <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  placeholder="নাম বা মোবাইল লিখে খুঁজুন..." 
                  className="w-full h-16 pl-16 pr-6 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-3xl outline-none font-black text-sm shadow-xl"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={`bg-white dark:bg-zinc-900 p-10 rounded-[44px] border flex flex-col gap-8 shadow-sm transition-all duration-500 ${u.isBanned ? 'border-red-500/50 bg-red-50/5 grayscale' : 'border-slate-100 dark:border-white/5'}`}>
                    <div className="flex items-center gap-6">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[24px] shadow-lg" alt="" />
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-black text-sm truncate uppercase tracking-tight">{u.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{u.phone}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                           {u.isAdmin && <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">Admin</span>}
                           {u.isSellerApproved && <span className="bg-green-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm">Seller</span>}
                        </div>
                      </div>
                      <RankBadge rank={u.rankOverride || 'bronze'} size="sm" showLabel={false} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       <button onClick={() => enterShadowMode(u.uid)} className="h-11 bg-slate-900 text-white dark:bg-white dark:text-black rounded-xl text-[9px] font-black uppercase hover:scale-105 active:scale-95 transition-all">Login</button>
                       <button onClick={() => updateUserField(u.uid, 'isSellerApproved', !u.isSellerApproved)} className={`h-11 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${u.isSellerApproved ? 'border-green-500 text-green-500 bg-green-50' : 'border-slate-100 dark:border-white/5 text-slate-400'}`}>
                         {u.isSellerApproved ? 'Verified' : 'Verify'}
                       </button>
                       <button onClick={() => updateUserField(u.uid, 'isBanned', !u.isBanned)} className={`h-11 rounded-xl text-[9px] font-black uppercase transition-all shadow-lg ${u.isBanned ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                         {u.isBanned ? 'Unban' : 'Ban'}
                       </button>
                       <select 
                        value={u.rankOverride || 'bronze'} 
                        onChange={(e) => updateUserField(u.uid, 'rankOverride', e.target.value)}
                        className="h-11 bg-slate-100 dark:bg-white/5 rounded-xl text-[9px] font-black uppercase outline-none px-2 cursor-pointer border border-transparent focus:border-primary/30"
                       >
                         {['bronze', 'silver', 'gold', 'platinum', 'diamond', 'hero', 'grand'].map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 p-12 rounded-[56px] border border-slate-100 dark:border-white/5 shadow-2xl animate-slide-up">
               <h2 className="text-xl font-black mb-12 text-center uppercase tracking-[0.3em] brand-font italic">GLOBAL <span className="text-primary">CONFIG</span></h2>
               <div className="space-y-10">
                  <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-black/40 rounded-[32px] border border-slate-100 dark:border-white/5">
                     <div>
                        <p className="font-black text-xs uppercase tracking-widest">নোটিফিকেশন ব্যানার</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">হেডারের নিচে লাল ব্যানার</p>
                     </div>
                     <button 
                      onClick={() => setSiteConfig({...siteConfig, bannerVisible: !siteConfig.bannerVisible})}
                      className={`w-16 h-9 rounded-full transition-all relative shadow-inner ${siteConfig.bannerVisible ? 'bg-primary' : 'bg-slate-300'}`}
                     >
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${siteConfig.bannerVisible ? 'left-8.5' : 'left-1.5'}`}></div>
                     </button>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-3">ব্যানার টেক্সট</label>
                        <input className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-3xl outline-none font-bold" value={siteConfig.bannerText} onChange={e => setSiteConfig({...siteConfig, bannerText: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 pl-3">হোয়াটসঅ্যাপ লিংক</label>
                           <input className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-3xl outline-none font-bold" value={siteConfig.whatsappLink} onChange={e => setSiteConfig({...siteConfig, whatsappLink: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 pl-3">টেলিগ্রাম লিংক</label>
                           <input className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-white/10 rounded-3xl outline-none font-bold" value={siteConfig.telegramLink} onChange={e => setSiteConfig({...siteConfig, telegramLink: e.target.value})} />
                        </div>
                     </div>
                  </div>

                  <button onClick={handleUpdateConfig} className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.4em] shadow-xl shadow-primary/30 active:scale-95 transition-all text-xs">সেভ সেটিংস</button>
               </div>
            </div>
          )}

          {/* Banners (Slider) Tab */}
          {activeTab === 'banners' && (
            <div className="space-y-10">
               <button onClick={() => { setBannerForm({ imageUrl: '', link: '', order: 0 }); setShowBannerModal({} as any); }} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">নতুন স্লাইডার যোগ করুন</button>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {banners.map(b => (
                    <div key={b.id} className="bg-white dark:bg-zinc-900 rounded-[40px] overflow-hidden border border-slate-100 dark:border-white/5 group relative shadow-xl">
                       <img src={b.imageUrl} className="w-full h-auto object-contain bg-slate-50 dark:bg-black/20" />
                       <div className="p-6 flex justify-between items-center bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিরিয়াল: {b.order}</span>
                          <div className="flex gap-6">
                             <button onClick={() => { setBannerForm(b); setShowBannerModal(b); }} className="text-slate-400 hover:text-primary transition-colors"><i className="fas fa-edit"></i></button>
                             <button onClick={() => deleteItem(b.id, 'banners')} className="text-red-500 hover:scale-110 transition-transform"><i className="fas fa-trash"></i></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === 'ads' && (
            <div className="space-y-10">
               <button onClick={() => { setAdForm({ imageUrl: '', link: '', text: '', placement: 'home_middle', order: 0 }); setShowAdModal({} as any); }} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">নতুন বিজ্ঞাপন যোগ করুন</button>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {ads.map(ad => (
                    <div key={ad.id} className="bg-white dark:bg-zinc-900 rounded-[40px] overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl">
                      <img src={ad.imageUrl} className="w-full h-auto object-contain bg-slate-50 dark:bg-black/20" alt="" />
                      <div className="p-6 flex justify-between items-center bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{ad.placement}</span>
                        <div className="flex gap-5">
                          <button onClick={() => { setAdForm(ad); setShowAdModal(ad); }} className="text-slate-400 hover:text-primary"><i className="fas fa-edit text-xs"></i></button>
                          <button onClick={() => deleteItem(ad.id, 'ads')} className="text-red-500"><i className="fas fa-trash text-xs"></i></button>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Slider Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={saveBanner} className="w-full max-w-md bg-white dark:bg-zinc-900 p-12 rounded-[56px] space-y-8 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-center uppercase tracking-widest">স্লাইডার সেটিংস</h2>
            <div className="space-y-6">
              <input required placeholder="HD ইমেজের লিংক" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} />
              <input placeholder="লিংক (ঐচ্ছিক)" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={bannerForm.link} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} />
              <input type="number" placeholder="সিরিয়াল" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={bannerForm.order} onChange={e => setBannerForm({...bannerForm, order: Number(e.target.value)})} />
            </div>
            <div className="flex gap-4">
               <button type="button" onClick={() => setShowBannerModal(null)} className="flex-1 h-14 border-2 rounded-2xl text-[10px] font-black uppercase">বাতিল</button>
               <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">সেভ করুন</button>
            </div>
          </form>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={saveAd} className="w-full max-w-md bg-white dark:bg-zinc-900 p-12 rounded-[56px] space-y-8 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-center uppercase tracking-widest">বিজ্ঞাপন সেটিংস</h2>
            <div className="space-y-6">
              <input required placeholder="HD ইমেজের লিংক" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={adForm.imageUrl} onChange={e => setAdForm({...adForm, imageUrl: e.target.value})} />
              <select className="w-full h-16 px-6 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-black uppercase text-[10px]" value={adForm.placement} onChange={e => setAdForm({...adForm, placement: e.target.value as any})}>
                <option value="home_top">Home Top</option>
                <option value="home_middle">Home Middle</option>
                <option value="home_bottom">Home Bottom</option>
              </select>
              <input placeholder="বিজ্ঞাপন টেক্সট" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={adForm.text} onChange={e => setAdForm({...adForm, text: e.target.value})} />
              <input type="number" placeholder="সিরিয়াল" className="w-full h-16 px-8 bg-slate-50 dark:bg-black/40 rounded-3xl outline-none font-bold" value={adForm.order} onChange={e => setAdForm({...adForm, order: Number(e.target.value)})} />
            </div>
            <div className="flex gap-4">
               <button type="button" onClick={() => setShowAdModal(null)} className="flex-1 h-14 border-2 rounded-2xl text-[10px] font-black uppercase">বাতিল</button>
               <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">সেভ করুন</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;
