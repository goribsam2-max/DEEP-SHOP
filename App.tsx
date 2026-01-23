
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { User } from './types';

// Views
import Home from './views/Home';
import ProductDetail from './views/ProductDetail';
import Cart from './views/Cart';
import Auth from './views/Auth';
import Profile from './views/Profile';
import Admin from './views/Admin';
import Checkout from './views/Checkout';
import SellPhone from './views/SellPhone';
import Explore from './views/Explore';
import AddProduct from './views/AddProduct';
import SellerProfile from './views/SellerProfile';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';
import Sidebar from './components/Sidebar';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  enterShadowMode: (targetUid: string) => void;
  exitShadowMode: () => void;
}>({ notify: () => {}, enterShadowMode: () => {}, exitShadowMode: () => {} });

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [adminRef, setAdminRef] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = { uid: firebaseUser.uid, ...docSnap.data() } as User;
            setUser(userData);
            if (userData.isAdmin) setAdminRef(userData);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("User Profile Snapshot Error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setGlobalNotify({ msg, type });
  };

  const enterShadowMode = async (targetUid: string) => {
    if (!adminRef) return;
    setLoading(true);
    try {
      const targetDoc = await getDoc(doc(db, 'users', targetUid));
      if (targetDoc.exists()) {
        const shadowUser = { uid: targetUid, ...targetDoc.data(), isShadowMode: true } as User;
        setUser(shadowUser);
        notify(`Access Node Synchronized: ${shadowUser.name}`, 'info');
      }
    } catch (e) { notify('Shadow Mode Link Failed', 'error'); }
    finally { setLoading(false); }
  };

  const exitShadowMode = () => {
    if (adminRef) {
      setUser(adminRef);
      notify('Exited Shadow Mode', 'info');
    }
  };

  if (loading) return <Loader fullScreen />;

  const isAuthPage = location.pathname === '/auth';

  return (
    <NotificationContext.Provider value={{ notify, enterShadowMode, exitShadowMode }}>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
        {user?.isShadowMode && (
          <div className="bg-primary text-white text-[9px] font-black uppercase text-center py-2 sticky top-0 z-[100] tracking-widest flex items-center justify-center gap-4">
            Shadow Mode Active: Viewing as {user.name}
            <button onClick={exitShadowMode} className="bg-white text-primary px-3 py-1 rounded-full text-[8px]">Exit Link</button>
          </div>
        )}
        {!isAuthPage && <Navbar user={user} onOpenMenu={() => setMenuOpen(true)} hasUnreadNotify={hasUnread} />}
        {!isAuthPage && <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} />}
        
        <main className="min-h-[80vh]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/product/:id" element={<ProductDetail user={user} />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout user={user} />} />
            <Route path="/sell-phone" element={<SellPhone user={user} />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
            <Route path="/auth" element={user ? <Navigate to="/profile" /> : <Auth />} />
            <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
          </Routes>
        </main>

        {!isAuthPage && <BottomNav />}
        
        {globalNotify && (
          <GlobalNotification 
            message={globalNotify.msg} 
            type={globalNotify.type} 
            onClose={() => setGlobalNotify(null)} 
          />
        )}
      </div>
    </NotificationContext.Provider>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
