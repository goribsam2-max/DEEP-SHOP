
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { User, SiteConfig } from '../types';
import { sendTelegramNotification } from '../services/telegram';
import { NotificationContext } from '../App';
import Loader from '../components/Loader';

interface CheckoutProps {
  user: User | null;
}

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useContext(NotificationContext);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'advance' | 'nid' | 'none'>('advance');
  
  const [parentType, setParentType] = useState<'Mother' | 'Father'>('Father');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [addressData, setAddressData] = useState({
    fullName: user?.name || '',
    fullAddress: user?.address || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) {
        const c = snap.data() as SiteConfig;
        setConfig(c);
        if (!c.advanceRequired && !c.nidRequired) setCheckoutMode('none');
        else if (c.advanceRequired) setCheckoutMode('advance');
        else if (c.nidRequired) setCheckoutMode('nid');
      }
      setLoading(false);
    });

    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);
    if (items.length === 0 && !searchParams.get('status')) navigate('/cart');

    const status = searchParams.get('status');
    const trxId = searchParams.get('trxid');
    const savedOrderDetails = localStorage.getItem('pendingOrderDetails');

    if (status === 'success' && trxId && savedOrderDetails) {
      const parsedDetails = JSON.parse(savedOrderDetails);
      finalizeOrder(trxId, 'Deep Pay Advance', parsedDetails.address);
      localStorage.removeItem('pendingOrderDetails');
    }

    return () => unsubConfig();
  }, [searchParams]);

  const subtotal = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const primaryItem = cartItems[0];
  const sellerEmail = primaryItem?.sellerPaymentEmail || 'admin@deepshop.com';

  const handleDeepPayRedirect = () => {
    if (!addressData.fullName || !addressData.phone || !addressData.fullAddress) {
      return notify('ডেলিভারি তথ্য আগে পূর্ণ করুন।', 'error');
    }
    localStorage.setItem('pendingOrderDetails', JSON.stringify({ address: addressData }));
    const callbackUrl = encodeURIComponent(`${window.location.origin}/#/checkout`);
    const deepPayUrl = `https://payment.deepshop.top/#/gateway-pay?amount=300&to=${sellerEmail}&callback=${callbackUrl}`;
    setLoading(true);
    notify('পেমেন্ট গেটওয়েতে পাঠানো হচ্ছে...', 'info');
    setTimeout(() => { window.location.href = deepPayUrl; }, 1200);
  };

  const finalizeOrder = async (txId: string | null, method: string, address: any) => {
    setLoading(true);
    try {
      const items = JSON.parse(localStorage.getItem('cart') || '[]');
      const orderSubtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      const orderData = {
        userInfo: { userId: user?.uid || 'guest', userName: address.fullName, phone: address.phone },
        sellerId: items[0]?.sellerId || null,
        products: items.map((i: any) => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        totalAmount: orderSubtotal,
        status: 'pending',
        address: address,
        timestamp: serverTimestamp(),
        verificationType: checkoutMode,
        advancePaid: checkoutMode === 'advance' ? 300 : 0,
        paymentMethod: method,
        transactionId: txId || '',
        parentInfo: checkoutMode === 'nid' ? { parentType, parentName, parentPhone } : null
      };
      await addDoc(collection(db, 'orders'), orderData);
      const tgMsg = `📦 <b>নতুন অর্ডার (${checkoutMode.toUpperCase()})</b>\n\n👤 <b>নাম:</b> ${address.fullName}\n📞 <b>ফোন:</b> ${address.phone}\n🛍️ <b>পণ্য:</b> ${items[0]?.name}`;
      await sendTelegramNotification(tgMsg);
      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('অর্ডার সফল হয়েছে!', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => navigate(-1)} className="w-11 h-11 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center"><i className="fas fa-chevron-left"></i></button>
        <h1 className="text-3xl font-black uppercase brand-font leading-none">DEEP <span className="text-primary">CHECKOUT</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-6 tracking-widest pl-2">০১. ডেলিভারি তথ্য</h2>
            <div className="space-y-4">
               <input placeholder="পুরো নাম" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={addressData.fullName} onChange={e => setAddressData({...addressData, fullName: e.target.value})} />
               <input placeholder="মোবাইল নম্বর" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
               <textarea placeholder="বিস্তারিত ঠিকানা" className="w-full h-32 p-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-medium text-sm leading-relaxed" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-6 tracking-widest pl-2">০২. ভেরিফিকেশন পদ্ধতি</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
               {config?.advanceRequired && (
                 <button onClick={() => setCheckoutMode('advance')} className={`flex-1 p-8 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'advance' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-50'}`}>
                    <p className="font-black text-xs uppercase tracking-widest">৳৩০০ অগ্রিম দিন</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Deep Pay দিয়ে</p>
                 </button>
               )}
               {config?.nidRequired && (
                 <button onClick={() => setCheckoutMode('nid')} className={`flex-1 p-8 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'nid' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-50'}`}>
                    <p className="font-black text-xs uppercase tracking-widest">টাকা ছাড়া (NID)</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">এনআইডি ভেরিফিকেশন</p>
                 </button>
               )}
               {!config?.advanceRequired && !config?.nidRequired && (
                 <button onClick={() => setCheckoutMode('none')} className={`flex-1 p-8 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'none' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-50'}`}>
                    <p className="font-black text-xs uppercase tracking-widest">Cash on Delivery</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">সরাসরি অর্ডার</p>
                 </button>
               )}
            </div>

            {checkoutMode === 'advance' && (
              <div className="space-y-6 animate-slide-up">
                 <button onClick={handleDeepPayRedirect} className="w-full h-20 rounded-3xl font-black uppercase tracking-[0.2em] bg-rose-600 text-white shadow-2xl shadow-rose-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xs">
                   <i className="fas fa-wallet text-xl"></i> Pay with Deep Pay
                 </button>
              </div>
            )}
            {checkoutMode === 'nid' && (
              <div className="space-y-6 animate-slide-up">
                 <div className="flex gap-4">
                   <button onClick={() => setParentType('Father')} className={`flex-1 h-14 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Father' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-white/5 opacity-50'}`}>বাবার এনআইডি</button>
                   <button onClick={() => setParentType('Mother')} className={`flex-1 h-14 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Mother' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-white/5 opacity-50'}`}>মায়ের এনআইডি</button>
                 </div>
                 <input placeholder="এনআইডি অনুযায়ী নাম" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm" value={parentName} onChange={e => setParentName(e.target.value)} />
                 <input placeholder="অভিভাবকের মোবাইল নম্বর" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
                 <button onClick={() => finalizeOrder(null, 'COD NID Verified', addressData)} className="w-full h-18 bg-slate-900 dark:bg-white dark:text-black text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all">NID দিয়ে অর্ডার করুন</button>
              </div>
            )}
            {checkoutMode === 'none' && (
              <button onClick={() => finalizeOrder(null, 'Cash on Delivery', addressData)} className="w-full h-18 bg-primary text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all">কনফার্ম অর্ডার</button>
            )}
          </section>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] h-max lg:sticky lg:top-24 shadow-2xl border border-slate-100 dark:border-white/5">
           <div className="mb-8 text-center border-b border-slate-100 dark:border-white/5 pb-8">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">অর্ডার সামারি</span>
             <h3 className="text-4xl font-black text-slate-900 dark:text-white mt-3 brand-font">৳{subtotal.toLocaleString()}</h3>
           </div>
           <div className="space-y-6">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center p-2"><img src={item.image} className="w-full h-full object-contain" alt="" /></div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">৳{item.price.toLocaleString()} x {item.quantity}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
