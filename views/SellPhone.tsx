
import React, { useState, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';

const SellPhone: React.FC<{ user: User | null }> = ({ user }) => {
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ deviceName: '', details: '', expectedPrice: '', condition: 'excellent' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return notify('Please login to submit your request', 'error');
    if (!formData.deviceName || !formData.expectedPrice) return notify('Please fill in required fields', 'error');
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'sell_requests'), {
        userId: user.uid,
        userName: user.name,
        deviceName: formData.deviceName,
        details: `${formData.details} | Condition: ${formData.condition}`,
        expectedPrice: Number(formData.expectedPrice),
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      notify('Submission Received! We will contact you soon.', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-12 animate-fade-in pb-24">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 uppercase">Sell Your Device</h1>
        <p className="text-slate-500 text-sm font-medium">Get the best price for your old gadgets instantly.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-2xl border border-slate-100 dark:border-white/5 space-y-8">
         <div className="space-y-6">
            <div>
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Device Name & Model</label>
               <input placeholder="e.g. iPhone 15 Pro Max 256GB" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold" value={formData.deviceName} onChange={e => setFormData({...formData, deviceName: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Expected Price (৳)</label>
                  <input type="number" placeholder="Enter amount" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl font-black text-primary" value={formData.expectedPrice} onChange={e => setFormData({...formData, expectedPrice: e.target.value})} />
               </div>
               <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Device Condition</label>
                  <select className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl font-bold uppercase text-[10px] outline-none" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
                     <option value="excellent">Like New (10/10)</option>
                     <option value="good">Good (8-9/10)</option>
                     <option value="fair">Average (6-7/10)</option>
                     <option value="broken">Broken / Repair Needed</option>
                  </select>
               </div>
            </div>

            <div>
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Additional Details</label>
               <textarea placeholder="Tell us about warranty, accessories, or any flaws..." className="w-full p-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none h-32 font-medium text-sm leading-relaxed" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
            </div>
         </div>

         <button 
           disabled={loading}
           className="w-full h-14 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:brightness-125 transition-all active:scale-95"
         >
           {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Submit For Review'}
         </button>
      </form>
    </div>
  );
};

export default SellPhone;
