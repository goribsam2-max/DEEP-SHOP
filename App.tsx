
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { User, SiteConfig } from './types';

// Views
import Home from './views/Home';
import ProductDetail from './views/ProductDetail';
import Cart from './views/Cart';
import Auth from './views/Auth';
import Profile from './views/Profile';
import Admin from './views/Admin';
import Checkout from './views/Checkout';
import SellPhone from './views/SellPhone';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';
import Sidebar from './components/Sidebar';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}>({ notify: () => {} });

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Device ID Logic
    let deviceId = localStorage.getItem('ds_hw_id');
    if (!deviceId) {
      deviceId = 'hw_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ds_hw_id', deviceId);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = { uid: firebaseUser.uid, ...docSnap.data() } as User;
            
            // Check for Hardware Ban
            if (userData.isBanned || (userData.bannedDevices && userData.bannedDevices.includes(deviceId!))) {
              notify('ACCESSED DENIED: This account or device is permanently blacklisted.', 'error');
              signOut(auth);
              setUser(null);
            } else {
              setUser(userData);
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Dynamic SEO & Meta
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) {
        const config = snap.data() as SiteConfig;
        document.title = config.metaTitle || 'Deep Shop Bangladesh';
        
        const updateMeta = (name: string, content: string, property = false) => {
          let el = document.querySelector(`meta[${property ? 'property' : 'name'}="${name}"]`);
          if (!el) {
            el = document.createElement('meta');
            el.setAttribute(property ? 'property' : 'name', name);
            document.head.appendChild(el);
          }
          el.setAttribute('content', content);
        };

        updateMeta('description', config.metaDescription || '');
        updateMeta('keywords', config.keywords || '');
        updateMeta('og:title', config.metaTitle || '', true);
        updateMeta('og:description', config.metaDescription || '', true);
        updateMeta('og:image', config.ogImage || '', true);
      }
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('isRead', '==', false), limit(1));
    return onSnapshot(q, (snap) => setHasUnread(!snap.empty));
  }, [user?.uid]);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setGlobalNotify({ msg, type });
  };

  if (loading) return <Loader fullScreen />;

  const isAuthPage = location.pathname === '/auth';

  return (
    <NotificationContext.Provider value={{ notify }}>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
        {!isAuthPage && <Navbar user={user} onOpenMenu={() => setMenuOpen(true)} hasUnreadNotify={hasUnread} />}
        {!isAuthPage && <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} />}
        
        <main className="min-h-[80vh]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail user={user} />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout user={user} />} />
            <Route path="/sell-phone" element={<SellPhone user={user} />} />
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
