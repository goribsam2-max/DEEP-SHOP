

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from './types';

// Views
import Home from './views/Home';
import Auth from './views/Auth';
import Explore from './views/Explore';
import ProductDetail from './views/ProductDetail';
import Cart from './views/Cart';
import Checkout from './views/Checkout';
import Profile from './views/Profile';
import MyOrders from './views/MyOrders';
import Sales from './views/Sales';
import Notifications from './views/Notifications';
import Admin from './views/Admin';
import AddProduct from './views/AddProduct';
import SellerProfile from './views/SellerProfile';
import OrderTracking from './views/OrderTracking';

// Components
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}>({ notify: () => {} });

const AppLayout: React.FC<{ user: User | null; exitShadowMode: () => void }> = ({ user, exitShadowMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasUnreadNotify, setHasUnreadNotify] = useState(false);

  // Hide BottomNav and Navbar on specific routes if needed
  const hideGlobalUI = ['/auth', '/checkout'].includes(location.pathname);
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (user?.uid) {
      const unsub = onSnapshot(doc(db, 'users', user.uid, 'notifications', 'status'), (snap) => {
        if (snap.exists()) setHasUnreadNotify(snap.data().hasUnread);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white dark:bg-black relative select-none shadow-2xl overflow-x-hidden">
      
      {/* Global Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
      />

      {/* Global Navbar - Dynamic Back/Menu Button */}
      {!hideGlobalUI && (
        <Navbar 
          user={user} 
          onOpenMenu={() => setIsSidebarOpen(true)} 
          hasUnreadNotify={hasUnreadNotify}
          showBack={!isHome}
        />
      )}

      {user?.isShadowMode && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[2000] bg-primary text-white p-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest shadow-2xl border-b border-white/20">
           <span>Viewing as: {user.name} (Shadow Mode)</span>
           <button onClick={exitShadowMode} className="bg-white text-primary px-4 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all">Exit Mode</button>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/product/:id" element={<ProductDetail user={user} />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout user={user} />} />
          <Route path="/track-order" element={<OrderTracking />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
          <Route path="/my-orders" element={user ? <MyOrders user={user} /> : <Navigate to="/auth" />} />
          <Route path="/sales" element={user ? <Sales user={user} /> : <Navigate to="/auth" />} />
          <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/edit-product/:productId" element={<AddProduct />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Global Bottom Navigation */}
      {!hideGlobalUI && <BottomNav />}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  useEffect(() => {
    const shadowUserStr = localStorage.getItem('shadow_user');
    if (shadowUserStr) {
      const shadowUser = JSON.parse(shadowUserStr) as User;
      setUser({ ...shadowUser, isShadowMode: true });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser({ uid: firebaseUser.uid, ...docSnap.data() } as User);
          }
          setLoading(false);
        }, (error) => {
          console.warn("User data listener error:", error.message);
          setLoading(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setGlobalNotify({ msg, type });
  };

  const exitShadowMode = () => {
    localStorage.removeItem('shadow_user');
    window.location.reload();
  };

  if (loading) return <Loader fullScreen />;

  return (
    <NotificationContext.Provider value={{ notify }}>
      <HashRouter>
        <AppLayout user={user} exitShadowMode={exitShadowMode} />
        {globalNotify && (
          <GlobalNotification 
            message={globalNotify.msg} 
            type={globalNotify.type} 
            onClose={() => setGlobalNotify(null)} 
          />
        )}
      </HashRouter>
    </NotificationContext.Provider>
  );
};

export default App;
