import React, { useState, useContext, useRef } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../App';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(0); // 0: Name, 1: Phone, 2: Email, 3: Password, 4: Image
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', profilePic: '' });
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    if (step === 0 && !form.name) return notify('আপনার নাম লিখুন', 'error');
    if (step === 1 && !form.phone) return notify('মোবাইল নম্বর লিখুন', 'error');
    if (step === 2 && !form.email) return notify('ইমেইল লিখুন', 'error');
    if (step === 3) {
      if (!form.password || form.password.length < 6) return notify('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
      if (form.password !== form.confirmPassword) return notify('পাসওয়ার্ড দুটি মেলেনি', 'error');
    }
    setStep(prev => prev + 1);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setForm({ ...form, profilePic: data.data.url });
        notify('প্রোফাইল পিকচার আপলোড হয়েছে', 'success');
      }
    } catch (error) {
      notify('আপলোড ব্যর্থ হয়েছে', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        notify('লগইন সফল হয়েছে!', 'success');
        navigate('/');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { 
          displayName: form.name,
          photoURL: form.profilePic 
        });
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: form.name,
          email: form.email,
          phone: form.phone,
          profilePic: form.profilePic,
          walletBalance: 0,
          rewardPoints: 0,
          isAdmin: false,
          createdAt: new Date().toISOString()
        });
        notify('অ্যাকাউন্ট তৈরি হয়েছে!', 'success');
        navigate('/');
      }
    } catch (e: any) { 
      notify(isLogin ? 'ভুল ইমেইল বা পাসওয়ার্ড' : 'রেজিস্ট্রেশন ব্যর্থ হয়েছে', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const renderRegistrationSteps = () => {
    switch(step) {
      case 0:
        return (
          <div className="space-y-6 animate-slide-up w-full">
            <h2 className="text-xl font-black text-white uppercase tracking-tight text-center">আপনার নাম দিন</h2>
            <input 
              required 
              placeholder="পুরো নাম" 
              className="w-full h-16 px-8 bg-zinc-800/50 rounded-[24px] outline-none font-bold text-lg border border-white/5 focus:border-primary/50 transition-all text-white" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
            />
            <button onClick={handleNext} className="w-full h-20 btn-primary">পরবর্তী ধাপ <i className="fas fa-chevron-right ml-2"></i></button>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6 animate-slide-up w-full">
            <h2 className="text-xl font-black text-white uppercase tracking-tight text-center">মোবাইল নম্বর দিন</h2>
            <input 
              required 
              type="tel"
              placeholder="০১৭XXXXXXXX" 
              className="w-full h-16 px-8 bg-zinc-800/50 rounded-[24px] outline-none font-bold text-lg border border-white/5 focus:border-primary/50 transition-all text-white" 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})} 
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(0)} className="flex-1 h-20 bg-zinc-800/50 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest border border-white/5">পিছনে</button>
              <button onClick={handleNext} className="flex-[2] h-20 btn-primary">পরবর্তী <i className="fas fa-chevron-right ml-2"></i></button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-slide-up w-full">
            <h2 className="text-xl font-black text-white uppercase tracking-tight text-center">ইমেইল এড্রেস দিন</h2>
            <input 
              required 
              type="email"
              placeholder="example@gmail.com" 
              className="w-full h-16 px-8 bg-zinc-800/50 rounded-[24px] outline-none font-bold text-lg border border-white/5 focus:border-primary/50 transition-all text-white" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 h-20 bg-zinc-800/50 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest border border-white/5">পিছনে</button>
              <button onClick={handleNext} className="flex-[2] h-20 btn-primary">পরবর্তী <i className="fas fa-chevron-right ml-2"></i></button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-slide-up w-full">
            <h2 className="text-xl font-black text-white uppercase tracking-tight text-center">পাসওয়ার্ড সেট করুন</h2>
            <input 
              required 
              type="password"
              placeholder="পাসওয়ার্ড (৬+ অক্ষর)" 
              className="w-full h-16 px-8 bg-zinc-800/50 rounded-[24px] outline-none font-bold text-lg border border-white/5 focus:border-primary/50 transition-all text-white" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
            />
            <input 
              required 
              type="password"
              placeholder="পাসওয়ার্ড নিশ্চিত করুন" 
              className="w-full h-16 px-8 bg-zinc-800/50 rounded-[24px] outline-none font-bold text-lg border border-white/5 focus:border-primary/50 transition-all text-white" 
              value={form.confirmPassword} 
              onChange={e => setForm({...form, confirmPassword: e.target.value})} 
            />
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 h-20 bg-zinc-800/50 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest border border-white/5">পিছনে</button>
              <button onClick={handleNext} className="flex-[2] h-20 btn-primary">পরবর্তী <i className="fas fa-chevron-right ml-2"></i></button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 animate-slide-up flex flex-col items-center w-full">
            <h2 className="text-xl font-black text-white uppercase tracking-tight text-center">প্রোফাইল পিকচার দিন</h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-40 h-40 rounded-[48px] bg-zinc-800/50 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group shadow-2xl"
            >
              {form.profilePic ? (
                <img src={form.profilePic} className="w-full h-full object-cover" />
              ) : (
                <>
                  <i className="fas fa-camera text-primary text-3xl mb-2"></i>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Image</span>
                </>
              )}
              {loading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><i className="fas fa-spinner animate-spin text-white"></i></div>}
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*" />

            <div className="w-full space-y-4">
              <button onClick={handleSubmit} disabled={loading} className="w-full h-20 btn-primary">
                 {loading ? <i className="fas fa-spinner animate-spin"></i> : 'রেজিস্ট্রেশন সম্পন্ন করুন'} <i className="fas fa-check-circle ml-2"></i>
              </button>
              <button onClick={() => setStep(3)} className="w-full h-12 text-slate-500 font-black uppercase text-[9px] tracking-widest">পিছনে যান</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 justify-center animate-fade-in relative overflow-hidden bg-black min-h-screen">
      {/* Background Lights */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[130px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[130px] rounded-full"></div>
      </div>
      
      <div className="text-center mb-12 relative z-10 animate-slide-up max-w-lg mx-auto w-full">
         <div className="w-28 h-28 bg-primary/5 p-1 rounded-[40px] mx-auto mb-10 shadow-[0_0_80px_rgba(0,143,91,0.25)] border border-white/5 overflow-hidden">
            <img src="https://i.ibb.co.com/mrgXJBvG/IMG-2747.jpg" className="w-full h-full object-cover rounded-[38px]" alt="Logo" />
         </div>
         <h1 className="text-4xl font-black uppercase tracking-tighter brand-font leading-none text-white">DEEP <span className="text-primary">SHOP</span></h1>
         <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 mt-4 text-center">Exclusive Gadget Universe</p>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
         {isLogin ? (
           <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up w-full">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">EMAIL ADDRESS</label>
                <input required type="email" placeholder="ইমেইল এড্রেস" className="w-full h-16 px-8 bg-zinc-800/40 rounded-[24px] outline-none font-bold text-sm border border-white/5 focus:border-primary/50 transition-all text-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">PASSWORD</label>
                <input required type="password" placeholder="পাসওয়ার্ড" className="w-full h-16 px-8 bg-zinc-800/40 rounded-[24px] outline-none font-bold text-sm border border-white/5 focus:border-primary/50 transition-all text-white" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              
              <button disabled={loading} className="w-full h-20 btn-primary mt-6">
                 {loading ? <i className="fas fa-spinner animate-spin"></i> : 'লগইন করুন'}
              </button>
           </form>
         ) : renderRegistrationSteps()}

         <div className="mt-10 flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-white/5"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">অথবা</span>
            <div className="h-px flex-1 bg-white/5"></div>
         </div>

         <div className="w-full mt-8">
            <button onClick={() => navigate('/')} className="w-full h-16 btn-secondary !bg-white/5 !text-slate-400 !border-white/5 hover:!bg-white/10 !rounded-3xl">
            CONTINUE AS GUEST
         </button>
      </div>
      </div>

      <p className="mt-12 text-center animate-slide-up relative z-10 max-w-lg mx-auto w-full">
         <button onClick={() => { setIsLogin(!isLogin); setStep(0); }} className="text-[10px] font-black text-slate-500 hover:text-primary uppercase tracking-[0.2em] transition-colors border-b border-slate-800 pb-1">
            {isLogin ? 'নতুন অ্যাকাউন্ট? রেজিস্ট্রেশন করুন' : 'আগের অ্যাকাউন্ট আছে? লগইন করুন'}
         </button>
      </p>
    </div>
  );
};

export default Auth;
