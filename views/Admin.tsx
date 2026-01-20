
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { Order, Product, SellerRank, User, SiteConfig, SellRequest } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ 
    bannerVisible: false, bannerText: '', bannerType: 'info',
    metaTitle: '', metaDescription: '', ogImage: '', keywords: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'requests' | 'settings'>('orders');
  const { notify } = useContext(NotificationContext);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ 
    name: '', price: 0, category: 'mobile' as any, 
    image: '', description: '', stock: 'instock',
    mentionedUserId: '', mentionedUserName: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const snap = await getDocs(collection(db, 'orders'));
        const ords = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        ords.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setOrders(ords);
      } else if (activeTab === 'products') {
        const snap = await getDocs(collection(db, 'products'));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      } else if (activeTab === 'users') {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      } else if (activeTab === 'requests') {
        const snap = await getDocs(collection(db, 'sell_requests'));
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SellRequest));
        reqs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setSellRequests(reqs);
      } else if (activeTab === 'settings') {
        const snap = await getDocs(collection(db, 'site_config'));
        const config = snap.docs.find(d => d.id === 'global');
        if (config) setSiteConfig(config.data() as SiteConfig);
      }
    } catch (err: any) { 
      console.error(err);
      notify('Data sync failed', 'error'); 
    } finally { setLoading(false); }
  };

  const updateRank = async (uid: string, rank: SellerRank) => {
    await updateDoc(doc(db, 'users', uid), { rankOverride: rank });
    notify('User Rank Updated', 'success');
    fetchData();
  };

  const toggleBan = async (u: User) => {
    const hwId = localStorage.getItem('ds_hw_id');
    const updates: any = { isBanned: !u.isBanned };
    if (!u.isBanned && hwId) updates.bannedDevices = arrayUnion(hwId);
    await updateDoc(doc(db, 'users', u.uid), updates);
    notify(u.isBanned ? 'User Unbanned' : 'User Banned', 'info');
    fetchData();
  };

  const approveSellRequest = async (req: SellRequest) => {
    try {
      await updateDoc(doc(db, 'sell_requests', req.id), { status: 'approved' });
      await addDoc(collection(db, 'users', req.userId, 'notifications'), {
        title: 'Sell Request Approved!',
        message: `Your request for ${req.deviceName} has been approved. Please contact us via WhatsApp to proceed.`,
        isRead: false,
        timestamp: serverTimestamp()
      });
      notify('Request Approved & User Notified', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const sendMessage = async (uid: string) => {
    const msg = prompt("Enter message for user:");
    if (!msg) return;
    try {
      await addDoc(collection(db, 'users', uid, 'notifications'), {
        title: 'Admin Message',
        message: msg,
        isRead: false,
        timestamp: serverTimestamp()
      });
      notify('Message Sent', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveConfig = async () => {
    await setDoc(doc(db, 'site_config', 'global'), siteConfig);
    notify('Settings Saved', 'success');
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) await updateDoc(doc(db, 'products', editingProduct.id), productForm);
      else await addDoc(collection(db, 'products'), { ...productForm, timestamp: serverTimestamp() });
      setEditingProduct(null);
      setProductForm({ 
        name: '', price: 0, category: 'mobile', 
        image: '', description: '', stock: 'instock',
        mentionedUserId: '', mentionedUserName: ''
      });
      setMentionQuery('');
      fetchData();
      notify('Product Saved', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.phone && u.phone.includes(userSearch))
  );

  const mentionMatches = mentionQuery.startsWith('@') 
    ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.substring(1).toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen pb-40">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
        <h1 className="text-2xl font-black uppercase tracking-tight">Admin Dashboard</h1>
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-white/5 rounded-2xl gap-1">
          {['orders', 'products', 'users', 'requests', 'settings'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white' : 'text-slate-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in">
          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                <input 
                  placeholder="Search by name, email, or phone..." 
                  className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl outline-none text-sm font-bold"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 transition-all ${u.isBanned ? 'opacity-50 grayscale' : 'hover:border-primary/20'}`}>
                    <div className="flex items-center gap-4 mb-6">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2e8b57&color=fff&bold=true`} className="w-12 h-12 rounded-xl" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm truncate">{u.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <select 
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-black/20 rounded-lg text-[10px] font-bold uppercase outline-none"
                        value={u.rankOverride || 'bronze'}
                        onChange={(e) => updateRank(u.uid, e.target.value as SellerRank)}
                      >
                        {['bronze', 'silver', 'gold', 'platinum', 'diamond', 'hero', 'grand'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => sendMessage(u.uid)} className="flex-1 h-10 bg-slate-100 dark:bg-white/5 rounded-lg text-[9px] font-bold uppercase hover:bg-primary/5 transition-colors">Message</button>
                        <button onClick={() => toggleBan(u)} className={`flex-1 h-10 rounded-lg text-[9px] font-bold uppercase transition-colors ${u.isBanned ? 'bg-success text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}>
                          {u.isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {sellRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all">
                  <div>
                    <h4 className="font-bold text-sm uppercase">{req.deviceName}</h4>
                    <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Customer: {req.userName} | Expecting: ৳{req.expectedPrice.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{req.details}</p>
                  </div>
                  <div className="flex gap-2">
                    {req.status === 'pending' ? (
                      <>
                        <button onClick={() => approveSellRequest(req)} className="px-6 h-10 bg-primary text-white rounded-xl text-[10px] font-bold uppercase">Approve</button>
                        <button onClick={async () => { if(confirm('Reject this request?')){ await updateDoc(doc(db, 'sell_requests', req.id), { status: 'rejected' }); fetchData(); } }} className="px-6 h-10 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase">Reject</button>
                      </>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-white/5 text-[9px] font-bold uppercase text-slate-400">
                  <tr><th className="p-6">Order ID</th><th className="p-6">Customer</th><th className="p-6">Amount</th><th className="p-6">Status</th><th className="p-6">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5 text-[11px] font-bold">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-6">#{o.id.substring(0,8).toUpperCase()}</td>
                      <td className="p-6">{o.userInfo?.userName}</td>
                      <td className="p-6">৳{o.totalAmount?.toLocaleString()}</td>
                      <td className="p-6"><span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[8px] uppercase font-black">{o.status}</span></td>
                      <td className="p-6">
                        <select 
                          value={o.status} 
                          onChange={async (e) => { await updateDoc(doc(db, 'orders', o.id), { status: e.target.value }); fetchData(); }}
                          className="bg-slate-50 dark:bg-black/20 rounded-lg px-3 h-9 text-[9px] uppercase font-bold outline-none border border-transparent focus:border-primary/20"
                        >
                          <option value="pending">Pending</option><option value="packaging">Packaging</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <form onSubmit={saveProduct} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-100 dark:border-white/5 h-max space-y-4 shadow-sm">
                <h3 className="font-bold text-sm uppercase mb-4 tracking-widest text-primary">Manage Inventory</h3>
                <input placeholder="Product Name" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl outline-none" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                
                <div className="relative">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1.5 block">Mention User (Type @)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      placeholder="Type @name..." 
                      className="flex-1 h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-primary/20"
                      value={mentionQuery || (productForm.mentionedUserName ? `@${productForm.mentionedUserName}` : '')}
                      onChange={(e) => {
                        setMentionQuery(e.target.value);
                        setShowMentionList(true);
                        if (!e.target.value) setProductForm({...productForm, mentionedUserId: '', mentionedUserName: ''});
                      }}
                    />
                  </div>
                  
                  {showMentionList && mentionMatches.length > 0 && (
                    <div className="absolute top-20 left-0 right-0 z-50 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 p-2 animate-slide-up">
                      {mentionMatches.map(u => (
                        <button 
                          key={u.uid} 
                          type="button"
                          onClick={() => {
                            setProductForm({...productForm, mentionedUserId: u.uid, mentionedUserName: u.name});
                            setMentionQuery(`@${u.name}`);
                            setShowMentionList(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2e8b57&color=fff&bold=true`} className="w-8 h-8 rounded-lg" />
                          <div className="text-left">
                            <p className="font-bold text-[11px] uppercase tracking-tight">{u.name}</p>
                            <p className="text-[9px] text-slate-400">{u.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Price (৳)" className="h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl outline-none font-black text-primary" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} required />
                  <select className="h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl uppercase text-[9px] font-bold outline-none" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})}>
                    <option value="instock">In Stock</option><option value="outofstock">Out of Stock</option>
                  </select>
                </div>
                <input placeholder="Image URL" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl outline-none" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} required />
                <textarea placeholder="Description..." className="w-full p-5 bg-slate-50 dark:bg-black/20 rounded-xl h-32 outline-none text-sm font-medium" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required />
                <button className="w-full h-14 bg-primary text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">Publish Product</button>
              </form>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4 ml-2">Active Inventory</h3>
                {products.map(p => (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-4 hover:border-primary/20 transition-all shadow-sm">
                    <img src={p.image} className="w-14 h-14 object-contain rounded-lg bg-slate-50" />
                    <div className="flex-1 truncate">
                      <h4 className="font-bold text-[13px] uppercase truncate">{p.name}</h4>
                      {p.mentionedUserName && <p className="text-[8px] font-black uppercase text-primary tracking-widest mt-1">@ {p.mentionedUserName}</p>}
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => { setEditingProduct(p); setProductForm(p as any); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-slate-400 hover:text-primary"><i className="fas fa-edit"></i></button>
                      <button onClick={async () => { if(confirm('Delete permanently?')) { await deleteDoc(doc(db, 'products', p.id)); fetchData(); } }} className="text-slate-400 hover:text-red-500"><i className="fas fa-trash"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm uppercase tracking-widest">Store Ticker</h3>
                <div className="flex items-center justify-between py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Visibility</span>
                  <button onClick={() => setSiteConfig({...siteConfig, bannerVisible: !siteConfig.bannerVisible})} className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${siteConfig.bannerVisible ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-5 h-5 bg-white rounded-full shadow-sm"></div></button>
                </div>
                <input className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 rounded-xl outline-none font-bold" value={siteConfig.bannerText} onChange={e => setSiteConfig({...siteConfig, bannerText: e.target.value})} />
                <button onClick={saveConfig} className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase text-[10px]">Save Config</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
