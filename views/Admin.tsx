
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, where, deleteDoc, limit } from 'firebase/firestore';
import { Order, Product, OrderStatus, SellerRank, User } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'ranks' | 'notify'>('orders');
  const { notify } = useContext(NotificationContext);

  // Form states
  const [searchQuery, setSearchQuery] = useState('');
  const [notifTargetType, setNotifTargetType] = useState<'global' | 'targeted'>('targeted');
  const [notifTargetEmail, setNotifTargetEmail] = useState('');
  const [notifData, setNotifData] = useState({ title: '', message: '', imageUrl: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', price: 0, category: 'mobile' as any, image: '', description: '', stock: 'instock' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('timestamp', 'desc')));
        setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } else if (activeTab === 'products') {
        const productsSnap = await getDocs(collection(db, 'products'));
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } else if (activeTab === 'users' || activeTab === 'ranks') {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      }
    } catch (err: any) {
      console.error(err);
      notify('Access Denied or Connection Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productForm);
        notify('Product details updated', 'success');
      } else {
        await addDoc(collection(db, 'products'), { ...productForm, timestamp: serverTimestamp() });
        notify('New product launched successfully', 'success');
      }
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, category: 'mobile', image: '', description: '', stock: 'instock' });
      fetchData();
    } catch (err: any) { notify(err.message, 'error'); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Permanently remove this product from inventory?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      notify('Product successfully removed', 'success');
      fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (notifTargetType === 'global') {
        await addDoc(collection(db, 'global_notifications'), {
          ...notifData,
          timestamp: serverTimestamp()
        });
        notify('Global broadcast sent to all users', 'success');
      } else {
        const userQ = query(collection(db, 'users'), where('email', '==', notifTargetEmail));
        const userSnap = await getDocs(userQ);
        if (userSnap.empty) return notify('Target user not found', 'error');
        
        const targetUserId = userSnap.docs[0].id;
        await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
          ...notifData,
          isRead: false,
          timestamp: serverTimestamp()
        });
        notify(`Notification sent to ${notifTargetEmail}`, 'success');
      }
      setNotifData({ title: '', message: '', imageUrl: '' });
      setNotifTargetEmail('');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const updateRank = async (userId: string, rank: SellerRank) => {
    try {
      await updateDoc(doc(db, 'users', userId), { rankOverride: rank });
      notify('User rank updated', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleBan = async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBanned: !user.isBanned });
      notify(`User ${user.isBanned ? 'Restored' : 'Banned'} Successfully`, 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
        <h1 className="text-3xl font-black uppercase tracking-tighter">DEEP COMMAND CENTER</h1>
        <div className="flex flex-wrap p-1.5 glass rounded-2xl gap-1.5 shadow-inner border border-white/20">
          {['orders', 'products', 'users', 'ranks', 'notify'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 h-[45px] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in pb-40">
          {activeTab === 'orders' ? (
             <div className="glass rounded-[32px] overflow-hidden shadow-xl border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr><th className="p-6">Order ID</th><th className="p-6">Buyer</th><th className="p-6">Value</th><th className="p-6">State</th><th className="p-6 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-bold">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6 text-primary">#{order.id.substring(0,8)}</td>
                          <td className="p-6">{order.userInfo?.userName || 'Anonymous'}</td>
                          <td className="p-6">৳{(order.totalAmount || 0).toLocaleString()}</td>
                          <td className="p-6">
                            <span className="px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest bg-primary/10 text-primary border border-primary/20">{order.status}</span>
                          </td>
                          <td className="p-6 text-right">
                            <select 
                              value={order.status}
                              onChange={async (e) => { await updateDoc(doc(db, 'orders', order.id), { status: e.target.value }); fetchData(); }}
                              className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-2 text-[10px] font-black uppercase outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="packaging">Packaging</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="canceled">Canceled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          ) : activeTab === 'products' ? (
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <form onSubmit={saveProduct} className="glass p-8 rounded-[32px] space-y-5 shadow-xl sticky top-24 border-white/40">
                  <h3 className="text-xl font-black mb-4 uppercase">Stock Editor</h3>
                  <input placeholder="Product Name" className="w-full h-[55px] px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-white/10 font-bold" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Price (৳)" className="h-[55px] px-6 bg-slate-50 dark:bg-white/5 rounded-2xl font-black text-primary" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} required />
                    <select className="h-[55px] px-6 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold uppercase text-[10px]" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})}>
                      <option value="instock">In Stock</option>
                      <option value="outofstock">Out of Stock</option>
                      <option value="preorder">Pre-Order</option>
                    </select>
                  </div>
                  <input placeholder="Image URL" className="w-full h-[55px] px-6 bg-slate-50 dark:bg-white/5 rounded-2xl" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} required />
                  <textarea placeholder="Description (Press Enter for new lines)" className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-2xl h-40 text-sm font-medium whitespace-pre-wrap" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required />
                  <button className="w-full h-[60px] bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                    {editingProduct ? 'Update Stock' : 'Add to Inventory'}
                  </button>
                  {editingProduct && <button type="button" onClick={() => setEditingProduct(null)} className="w-full text-danger font-black text-[11px] uppercase tracking-widest">Cancel Editing</button>}
                </form>
              </div>
              <div className="lg:col-span-7 space-y-4">
                 {products.map(p => (
                   <div key={p.id} className="glass p-5 rounded-[28px] flex gap-5 items-center border-white/20 shadow-lg">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2 shadow-sm">
                        <img src={p.image} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-extrabold text-sm uppercase tracking-tight">{p.name}</h4>
                        <p className="text-primary font-black text-lg">৳{(p.price || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingProduct(p); setProductForm(p as any); }} className="w-12 h-12 glass rounded-2xl text-accent hover:bg-accent hover:text-white transition-all"><i className="fas fa-edit"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-12 h-12 glass rounded-2xl text-danger hover:bg-danger hover:text-white transition-all"><i className="fas fa-trash"></i></button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          ) : activeTab === 'ranks' ? (
            <div className="space-y-8">
               <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
                 <input 
                   placeholder="Search user by name or email..." 
                   className="w-full max-w-md h-[55px] px-6 glass rounded-2xl font-bold" 
                   value={searchQuery} 
                   onChange={e => setSearchQuery(e.target.value)} 
                 />
               </div>
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {users.filter(u => (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                   <div key={u.uid} className="glass p-8 rounded-[32px] border-white/20 shadow-xl flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2e8b57&color=fff`} className="w-14 h-14 rounded-2xl" />
                        <div>
                          <h4 className="font-black text-lg">{u.name}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase">{u.email}</p>
                        </div>
                      </div>
                      <div className="space-y-3 mt-auto">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Set Seller Rank</label>
                        <select 
                          className="w-full h-[45px] px-4 glass rounded-xl font-black text-[10px] uppercase outline-none"
                          value={u.rankOverride || 'bronze'}
                          onChange={(e) => updateRank(u.uid, e.target.value as SellerRank)}
                        >
                          <option value="bronze">Bronze Seller</option>
                          <option value="silver">Silver Seller</option>
                          <option value="gold">Gold Seller</option>
                          <option value="platinum">Platinum Seller</option>
                          <option value="diamond">Diamond Seller</option>
                          <option value="hero">Hero Seller</option>
                          <option value="grand">Grand Master</option>
                        </select>
                        <div className="pt-2">
                           <button onClick={() => toggleBan(u)} className={`w-full h-[45px] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${u.isBanned ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                             {u.isBanned ? 'Pardon User' : 'Ban User Account'}
                           </button>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          ) : activeTab === 'users' ? (
             <div className="space-y-8">
                <input placeholder="Quick search..." className="w-full max-w-md h-[55px] px-6 glass rounded-2xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                    <div key={u.uid} className="glass p-8 rounded-[32px] border-white/20 shadow-xl">
                       <h4 className="font-black text-xl mb-2">{u.name}</h4>
                       <p className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">{u.email}</p>
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-white/10 pt-4">
                         <span>Points: {u.rewardPoints || 0}</span>
                         <span className="text-primary">{u.rankOverride || 'Bronze'}</span>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          ) : (
             <form onSubmit={sendNotification} className="max-w-2xl mx-auto glass p-10 rounded-[32px] space-y-6 shadow-2xl border-white/20">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Broadcast Center</h3>
                  <div className="flex gap-2 p-1 glass rounded-xl border-white/10">
                    <button type="button" onClick={() => setNotifTargetType('targeted')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${notifTargetType === 'targeted' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Targeted</button>
                    <button type="button" onClick={() => setNotifTargetType('global')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${notifTargetType === 'global' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Global</button>
                  </div>
                </div>

                {notifTargetType === 'targeted' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient Email</label>
                    <input placeholder="user@example.com" className="w-full h-[55px] px-6 glass rounded-2xl font-bold" value={notifTargetEmail} onChange={e => setNotifTargetEmail(e.target.value)} required={notifTargetType === 'targeted'} />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alert Title</label>
                  <input placeholder="Flash Sale Alert!" className="w-full h-[55px] px-6 glass rounded-2xl uppercase font-black tracking-tight" value={notifData.title} onChange={e => setNotifData({...notifData, title: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visual Image Link (Optional)</label>
                  <input placeholder="https://image-link.com/promo.png" className="w-full h-[55px] px-6 glass rounded-2xl" value={notifData.imageUrl} onChange={e => setNotifData({...notifData, imageUrl: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message Content</label>
                  <textarea placeholder="Write something inspiring..." className="w-full p-6 glass rounded-2xl h-40 text-sm font-medium leading-relaxed" value={notifData.message} onChange={e => setNotifData({...notifData, message: e.target.value})} required />
                </div>

                <button disabled={loading} className="w-full h-[65px] bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3">
                  {loading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-paper-plane"></i> DISPATCH BROADCAST</>}
                </button>
             </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
