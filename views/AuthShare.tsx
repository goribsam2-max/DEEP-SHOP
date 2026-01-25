
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../types';
import Loader from '../components/Loader';

const AuthShare: React.FC<{ user: User | null }> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri') || 'https://payment.deepshop.top';

  const handleContinue = () => {
    if (!user) return;
    
    // Construct the callback data
    const callbackData = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.walletBalance || 0
    };

    const base64Data = btoa(JSON.stringify(callbackData));
    const finalUrl = `${redirectUri}/#/auth-callback?data=${base64Data}`;
    
    window.location.href = finalUrl;
  };

  const handleCancel = () => {
    window.location.href = redirectUri;
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
           <i className="fas fa-user-lock text-2xl"></i>
        </div>
        <h2 className="text-xl font-black brand-font uppercase mb-4">লগইন প্রয়োজন</h2>
        <p className="text-slate-500 text-sm mb-8">পেমেন্ট ওয়ালেট ব্যবহার করতে হলে আগে শপিং সাইটে লগইন করুন।</p>
        <button onClick={() => navigate('/auth')} className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">লগইন পেজে যান</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black p-8 animate-fade-in relative overflow-hidden">
       {/* Ambient Background */}
       <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
       
       <div className="relative z-10 flex flex-col items-center pt-10">
          <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl p-0.5 border border-slate-100 dark:border-white/10 mb-8 flex items-center justify-center">
             <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-full h-full object-cover rounded-[28px]" alt="Deep Shop" />
          </div>
          
          <h1 className="text-xl font-black uppercase brand-font mb-2">DEEP <span className="text-primary">SHOP</span> ACCOUNT</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-12">Authorization Request</p>

          <div className="w-full bg-white dark:bg-zinc-900/50 backdrop-blur-3xl p-8 rounded-[44px] shadow-2xl border border-white dark:border-white/5 space-y-8">
             <div className="text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 leading-relaxed">
                   আপনার শপিং সাইটের তথ্য Deep Pay এর সাথে শেয়ার করতে চান?
                </p>
                <div className="flex flex-col items-center bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                   <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-14 h-14 rounded-2xl mb-4 border-2 border-white shadow-lg" alt="" />
                   <h3 className="font-black text-sm uppercase">{user.name}</h3>
                   <p className="text-[10px] font-bold text-slate-400 mt-1">{user.email}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">অনুমতি প্রাপ্ত ডাটা:</h4>
                <div className="space-y-3">
                   <PermissionItem icon="fa-user" label="আপনার নাম ও প্রোফাইল" />
                   <PermissionItem icon="fa-envelope" label="আপনার ইমেইল অ্যাড্রেস" />
                   <PermissionItem icon="fa-phone" label="আপনার মোবাইল নম্বর" />
                   <PermissionItem icon="fa-wallet" label="ওয়ালেট ব্যালেন্স ট্র্যাকিং" />
                </div>
             </div>

             <div className="pt-4 space-y-4">
                <button onClick={handleContinue} className="w-full h-16 bg-primary text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">অনুমতি দিন এবং এগিয়ে যান</button>
                <button onClick={handleCancel} className="w-full h-14 bg-slate-100 dark:bg-white/5 rounded-[22px] font-black text-[10px] uppercase text-slate-400 tracking-widest active:scale-95 transition-all">না, বাতিল করুন</button>
             </div>
          </div>
          
          <div className="mt-12 text-center px-10">
             <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                "Continue" এ ক্লিক করলে আপনি Deep Shop এর <span className="text-primary underline">শর্তাবলী</span> এবং <span className="text-primary underline">প্রাইভেসি পলিসি</span> মেনে নিচ্ছেন।
             </p>
          </div>
       </div>
    </div>
  );
};

const PermissionItem = ({ icon, label }: { icon: string, label: string }) => (
  <div className="flex items-center gap-4">
     <div className="w-8 h-8 bg-slate-50 dark:bg-black rounded-lg flex items-center justify-center text-slate-400">
        <i className={`fas ${icon} text-xs`}></i>
     </div>
     <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</span>
  </div>
);

export default AuthShare;
