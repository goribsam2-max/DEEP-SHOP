
import React, { useState, useContext, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../App';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      notify('Welcome back to Deep Shop!', 'success');
      navigate('/');
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return notify("Passwords do not match.", 'error');
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const fullName = `${formData.firstName} ${formData.lastName}`;
      await updateProfile(user, { displayName: fullName });
      
      await setDoc(doc(db, 'users', user.uid), {
        name: fullName,
        email: formData.email,
        phone: formData.phone,
        isAdmin: false,
        rewardPoints: 0,
        createdAt: new Date().toISOString()
      });
      
      notify('Account created successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const progress = isLogin ? 100 : (step / 4) * 100;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-[60] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background elements for style */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100 dark:bg-primary/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className={`max-w-md w-full relative z-10 transition-all duration-1000 ease-out transform ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Branding header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-primary/30 animate-bounce">
            <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-10 h-10 rounded-lg invert brightness-200" alt="Logo" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Join Deep Shop'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Official Gadget Store</p>
        </div>

        {/* Progress bar */}
        {!isLogin && (
          <div className="mb-10 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[8px] font-black uppercase text-primary tracking-widest">Registration Progress</span>
              <span className="text-[8px] font-black uppercase text-slate-400">Step {step} of 4</span>
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-ios" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-100 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">EMAIL:</div>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full h-14 pl-6 group-focus-within:pl-16 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-sm"
                    placeholder="Deep Shop - Your Email"
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity">PASS:</div>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full h-14 pl-6 group-focus-within:pl-14 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-sm"
                    placeholder="Deep Shop - Your Password"
                    onChange={handleChange}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-[0.3em]"
              >
                {loading ? <i className="fas fa-spinner animate-spin"></i> : (
                  <>
                    <span>Login</span>
                    <i className="fas fa-chevron-right text-[10px]"></i>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {step === 1 && (
                <div className="space-y-6 animate-slide-up">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                      placeholder="Deep Shop - First Name"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                      placeholder="Deep Shop - Last Name"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2 animate-slide-up">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                    placeholder="Deep Shop - 01XXXXXXXXX"
                    onChange={handleChange}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2 animate-slide-up">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                    placeholder="Deep Shop - Email"
                    onChange={handleChange}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-slide-up">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Create Password</label>
                    <input
                      type="password"
                      name="password"
                      className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                      placeholder="Deep Shop - Password"
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm"
                      placeholder="Deep Shop - Repeat Password"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="w-14 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-slate-200 dark:border-white/5"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={step < 4 ? () => setStep(s => s + 1) : handleSignup}
                  className="flex-1 h-14 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                >
                  {loading ? <i className="fas fa-spinner animate-spin"></i> : (
                    <>
                      <span>{step < 4 ? 'Continue' : 'Register Now'}</span>
                      <i className="fas fa-chevron-right text-[8px]"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center space-y-6">
          <button 
            onClick={() => { setIsLogin(!isLogin); setStep(1); }}
            className="text-[10px] font-black text-slate-400 hover:text-primary transition-all uppercase tracking-[0.3em] inline-flex items-center gap-3 group"
          >
            <span className="h-px w-6 bg-slate-200 dark:bg-white/10 group-hover:bg-primary transition-all"></span>
            {isLogin ? "New here? Create Account" : "Already have an account? Login"}
            <span className="h-px w-6 bg-slate-200 dark:bg-white/10 group-hover:bg-primary transition-all"></span>
          </button>

          <button 
            onClick={() => navigate('/')}
            className="mx-auto flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all transform hover:-translate-x-1"
          >
            <i className="fas fa-long-arrow-left"></i>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
