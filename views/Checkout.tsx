
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { User, SiteConfig } from '../types';
import { sendTelegramNotification } from '../services/telegram';
import { NotificationContext } from '../App';

interface CheckoutProps {
  user: User | null;
}

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'advance' | 'nid'>('advance');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  
  const [parentType, setParentType] = useState<'Mother' | 'Father'>('Father');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [addressData, setAddressData] = useState({
    fullName: user?.name || '',
    fullAddress: user?.address || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);
    if (items.length === 0) navigate('/cart');

    const fetchConfig = async () => {
      const snap = await getDoc(doc(db, 'site_config', 'global'));
      if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
    };
    fetchConfig();
  }, [navigate]);

  const subtotal = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const primaryItem = cartItems.length > 0 ? cartItems[0] : null;
  const sellerId = primaryItem?.sellerId || null;
  const sellerWhatsapp = primaryItem?.sellerWhatsapp || siteConfig?.whatsappLink || '8801778953114';
  const paymentNumber = sellerId ? (primaryItem?.sellerPaymentNumber || 'নম্বর নেই') : '01778953114';

  const placeOrder = async () => {
    if (!user) return notify('দয়া করে লগইন করুন', 'error');
    if (!addressData.phone || !addressData.fullAddress || !addressData.fullName) return notify('আপনার নাম, ফোন ও ঠিকানা দিন', 'error');
    
    if (checkoutMode === 'advance') {
      if (!paymentMethod || transactionId.length < 8) return notify('সঠিক ট্রানজেকশন আইডি দিন', 'error');
    } else {
      if (!parentName || !parentPhone) return notify('অভিভাবকের নাম ও নম্বর দিন', 'error');
    }

    setLoading(true);
    try {
      const orderData: any = {
        userInfo: { userId: user.uid, userName: addressData.fullName, phone: addressData.phone },
        sellerId: sellerId,
        products: cartItems.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        totalAmount: subtotal,
        status: 'pending',
        address: addressData,
        timestamp: serverTimestamp(),
        verificationType: checkoutMode,
      };

      // Construct Telegram Notification in Bangla
      let tgMsg = `📦 <b>নতুন অর্ডার এসেছে!</b>\n\n`;
      tgMsg += `👤 <b>ক্রেতার নাম:</b> ${addressData.fullName}\n`;
      tgMsg += `📞 <b>ফোন নম্বর:</b> ${addressData.phone}\n`;
      tgMsg += `🏠 <b>ঠিকানা:</b> ${addressData.fullAddress}\n\n`;
      tgMsg += `🛍️ <b>পণ্য:</b> ${primaryItem?.name}\n`;
      tgMsg += `💰 <b>মোট দাম:</b> ৳${subtotal.toLocaleString()}\n`;

      if (checkoutMode === 'advance') {
        orderData.advancePaid = 300;
        orderData.paymentMethod = paymentMethod;
        orderData.transactionId = transactionId;
        tgMsg += `💳 <b>পেমেন্ট টাইপ:</b> অগ্রিম (৩০০ টাকা)\n`;
        tgMsg += `🏦 <b>মেথড:</b> ${paymentMethod === 'bkash' ? 'বিকাশ' : 'নগদ'}\n`;
        tgMsg += `🆔 <b>ট্রানজেকশন আইডি:</b> ${transactionId}\n`;
      } else {
        orderData.advancePaid = 0;
        orderData.parentInfo = { parentType, parentName, parentPhone };
        tgMsg += `🛡️ <b>ভেরিফিকেশন টাইপ:</b> এনআইডি (টাকা ছাড়া)\n`;
        tgMsg += `👨‍👩‍👧 <b>এনআইডি কার:</b> ${parentType === 'Mother' ? 'মায়ের' : 'বাবার'}\n`;
        tgMsg += `📝 <b>এনআইডি অনুযায়ী নাম:</b> ${parentName}\n`;
        tgMsg += `📱 <b>অভিভাবকের নম্বর:</b> ${parentPhone}\n`;
      }

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      tgMsg += `\n🔢 <b>অর্ডার আইডি:</b> #${orderRef.id.substring(0,8).toUpperCase()}`;

      // Notify via Telegram (Admin)
      await sendTelegramNotification(tgMsg);

      // Construct WhatsApp Message (Seller/Admin)
      let waMsg = `📦 নতুন অর্ডার!\n\nনাম: ${addressData.fullName}\nফোন: ${addressData.phone}\nঠিকানা: ${addressData.fullAddress}\n\nপণ্য: ${primaryItem?.name}\nদাম: ৳${subtotal}\n\n`;
      if (checkoutMode === 'advance') {
        waMsg += `পেমেন্ট: ৩০০ টাকা অগ্রিম (${paymentMethod})\nট্রানজেকশন আইডি: ${transactionId}`;
      } else {
        waMsg += `ভেরিফিকেশন: ${parentType === 'Mother' ? 'মায়ের' : 'বাবার'} এনআইডি\nনাম: ${parentName}\nনম্বর: ${parentPhone}\n\n(আমি এনআইডি কার্ডের ছবি পাঠাচ্ছি)`;
      }

      window.open(`https://wa.me/${sellerWhatsapp.replace(/\+/g, '')}?text=${encodeURIComponent(waMsg)}`, '_blank');

      if (sellerId) {
        await addDoc(collection(db, 'users', sellerId, 'notifications'), {
          title: '📦 নতুন অর্ডার!',
          message: `${addressData.fullName} একটি নতুন অর্ডার করেছেন। বিস্তারিত জানতে আপনার হোয়াটসঅ্যাপ দেখুন।`,
          isRead: false,
          timestamp: serverTimestamp()
        });
      }

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('অর্ডার সফলভাবে সম্পন্ন হয়েছে!', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      <h1 className="text-3xl font-black mb-12 uppercase brand-font">CHECKOUT <span className="text-primary">প্রক্রিয়া</span></h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-6 tracking-widest">০১. আপনার ডেলিভারি তথ্য</h2>
            <div className="space-y-4">
               <input placeholder="পুরো নাম" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={addressData.fullName} onChange={e => setAddressData({...addressData, fullName: e.target.value})} />
               <input placeholder="মোবাইল নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
               <textarea placeholder="বিস্তারিত ঠিকানা (গ্রাম, পাড়া, রাস্তা নম্বর, থানা ও জেলা)" className="w-full h-24 p-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-medium text-sm leading-relaxed" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
            <h2 className="text-[11px] font-black uppercase text-slate-400 mb-6 tracking-widest">০২. ভেরিফিকেশন পদ্ধতি</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
               <button onClick={() => setCheckoutMode('advance')} className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left ${checkoutMode === 'advance' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-50'}`}>
                  <p className="font-black text-sm uppercase">৳৩০০ অগ্রিম দিন</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">ডেলিভারি চার্জ নিশ্চিত করতে</p>
               </button>
               <button onClick={() => setCheckoutMode('nid')} className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left ${checkoutMode === 'nid' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-50'}`}>
                  <p className="font-black text-sm uppercase">টাকা ছাড়া (এনআইডি)</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">মা/বাবার পরিচয়পত্র দিয়ে</p>
               </button>
            </div>

            <div className="animate-fade-in">
               {checkoutMode === 'advance' ? (
                 <div className="space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-black rounded-2xl border border-slate-100 dark:border-white/5">
                       <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">নিচের নম্বরে ৩০০ টাকা সেন্ডমানি করুন:</p>
                       <b className="text-primary text-xl tracking-wider select-all">{paymentNumber}</b>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setPaymentMethod('bkash')} className={`flex-1 h-14 rounded-2xl font-black text-[11px] uppercase border-2 transition-all ${paymentMethod === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-500' : 'border-slate-100 dark:border-white/5'}`}>বিকাশ</button>
                      <button onClick={() => setPaymentMethod('nagad')} className={`flex-1 h-14 rounded-2xl font-black text-[11px] uppercase border-2 transition-all ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-slate-100 dark:border-white/5'}`}>নগদ</button>
                    </div>
                    <input placeholder="ট্রানজেকশন আইডি (Trx ID)" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-center text-xl uppercase tracking-widest outline-none border border-primary/20" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                 </div>
               ) : (
                 <div className="space-y-6">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">অর্ডার নিশ্চিত করতে আপনার বাবা অথবা মায়ের নাম ও নম্বর দিন। কনফার্ম করার পর উনার এনআইডি কার্ডের ছবি সেলারকে হোয়াটসঅ্যাপে পাঠাতে হবে।</p>
                    <div className="flex gap-4">
                      <button onClick={() => setParentType('Father')} className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Father' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5'}`}>বাবার এনআইডি</button>
                      <button onClick={() => setParentType('Mother')} className={`flex-1 h-12 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Mother' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5'}`}>মায়ের এনআইডি</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input placeholder="এনআইডি কার্ডের নাম" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm" value={parentName} onChange={e => setParentName(e.target.value)} />
                      <input placeholder="অভিভাবকের মোবাইল নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
                    </div>
                 </div>
               )}
            </div>
          </section>
        </div>

        <div className="bg-slate-900 text-white p-10 rounded-[48px] h-max lg:sticky lg:top-24 shadow-2xl">
           <div className="mb-10 text-center">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">সর্বমোট মূল্য</span>
             <h3 className="text-4xl font-black text-white mt-2 brand-font">৳{subtotal.toLocaleString()}</h3>
           </div>
           <button onClick={placeOrder} disabled={loading} className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
             {loading ? <i className="fas fa-spinner animate-spin"></i> : 'অর্ডার কনফার্ম করুন'}
           </button>
           <p className="text-[9px] text-center mt-6 text-slate-500 uppercase font-bold leading-relaxed">
             অর্ডার করার সাথে সাথে সব তথ্য আমাদের কন্ট্রোল সেন্টারে জমা হবে।
           </p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
