
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, doc, getDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../App';
import { User, Category } from '../types';
import Loader from '../components/Loader';
import { sendTelegramNotification } from '../services/telegram';

const AddProduct: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  const [form, setForm] = useState({
    name: '',
    image: '',
    price: '',
    description: '',
    category: '',
    paymentMethod: 'bkash',
    paymentNumber: '',
    whatsapp: ''
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!auth.currentUser) { navigate('/auth'); return; }
      const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (uSnap.exists()) setUser({ uid: uSnap.id, ...uSnap.data() } as User);
      const cSnap = await getDocs(collection(db, 'categories'));
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      setLoading(false);
    };
    fetchInitialData();
  }, [navigate]);

  const handleVerificationRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'seller_requests'), {
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      
      const tgMsg = `🔔 <b>নতুন সেলার অনুরোধ!</b>\n\n👤 <b>নাম:</b> ${user.name}\n📞 <b>ফোন:</b> ${user.phone}\n📧 <b>ইমেইল:</b> ${user.email}\n\nদয়া করে অ্যাডমিন প্যানেল চেক করুন।`;
      await sendTelegramNotification(tgMsg);

      notify('অনুরোধ পাঠানো হয়েছে!', 'success');
      const waMsg = `DEEP SHOP ভেরিফিকেশন অনুরোধ:\nনাম: ${user.name}\nফোন: ${user.phone}\nআমি সেলার হিসেবে ভেরিফাই হতে চাই। আমার এনআইডি পাঠাচ্ছি।`;
      window.open(`https://wa.me/8801778953114?text=${encodeURIComponent(waMsg)}`, '_blank');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isSellerApproved) return notify('আপনি অনুমোদিত সেলার নন।', 'error');
    if (!form.name || !form.image || !form.price || !form.category || !form.whatsapp) return notify('সব তথ্য সঠিকভাবে দিন।', 'error');
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...form,
        price: Number(form.price),
        sellerId: user.uid,
        sellerName: user.name,
        sellerPhone: user.phone,
        sellerWhatsapp: form.whatsapp,
        sellerPaymentMethod: form.paymentMethod,
        sellerPaymentNumber: form.paymentNumber || user.phone,
        stock: 'instock',
        timestamp: serverTimestamp(),
        views: 0
      });
      notify('প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Loader fullScreen />;

  if (!user?.isSellerApproved) {
    return (
      <div className="max-w-2xl mx-auto p-12 py-40 text-center animate-fade-in">
        <div className="w-24 h-24 bg-primary text-white rounded-[40px] flex items-center justify-center text-4xl mx-auto mb-10 shadow-2xl shadow-primary/20 animate-bounce">
          <i className="fas fa-id-card"></i>
        </div>
        <h2 className="text-3xl font-black uppercase mb-6 tracking-tighter brand-font">SELLER <span className="text-primary">VERIFICATION</span></h2>
        <p className="text-slate-500 mb-12 font-bold text-sm leading-relaxed px-10">
          প্রোডাক্ট বিক্রি করতে হলে আপনাকে আপনার এনআইডি কার্ড দিয়ে ভেরিফাই হতে হবে। নিচের বাটনে ক্লিক করে অ্যাডমিনকে আপনার তথ্য পাঠান।
        </p>
        <button onClick={handleVerificationRequest} disabled={submitting} className="w-full h-16 bg-green-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all">
          <i className="fab fa-whatsapp text-lg"></i> অ্যাডমিনকে মেসেজ দিন
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 pb-40 animate-fade-in">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-3xl font-black uppercase mb-2 brand-font italic">DEEP <span className="text-primary">PUBLISH</span></h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">আপনার প্রোডাক্টের সব তথ্য দিন</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] border border-slate-100 dark:border-white/5 space-y-10 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">প্রোডাক্টের নাম</label>
              <input required placeholder="মডেল ও নাম দিন" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ছবির লিংক</label>
              <input required placeholder="https://..." className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={form.image} onChange={e => setForm({...form, image: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">মূল্য (৳)</label>
                 <input required type="number" placeholder="৳" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-primary outline-none" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ক্যাটাগরি</label>
                 <select required className="w-full h-14 px-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-black uppercase text-[10px] outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">সিলেক্ট</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                 </select>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-2">মেথড</label>
                <select className="w-full h-14 px-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-black text-[10px] outline-none" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as any})}>
                  <option value="bkash">বিকাশ</option>
                  <option value="nagad">নগদ</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-2">পেমেন্ট নম্বর</label>
                <input required placeholder="নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={form.paymentNumber} onChange={e => setForm({...form, paymentNumber: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">হোয়াটসঅ্যাপ নম্বর</label>
              <input required placeholder="যোগাযোগের নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">বিস্তারিত</label>
              <textarea required placeholder="প্রোডাক্ট সম্পর্কে লিখুন..." className="w-full p-6 bg-slate-50 dark:bg-black/20 rounded-2xl h-32 outline-none font-medium text-sm leading-relaxed" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Centered Stylish Publish Button */}
        <div className="flex justify-center pt-8">
           <button 
             disabled={submitting} 
             className="w-full md:w-80 h-16 bg-gradient-to-r from-primary via-rose-500 to-primary bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white rounded-full font-black uppercase text-[12px] tracking-[0.3em] shadow-[0_15px_30px_-5px_rgba(225,29,72,0.4)] active:scale-95"
           >
            {submitting ? 'প্রসেসিং হচ্ছে...' : 'প্রোডাক্ট পাবলিশ করুন'}
           </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
