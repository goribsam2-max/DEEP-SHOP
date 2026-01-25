

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Admin from './views/Admin';
import AddProduct from './views/AddProduct';
import SellerProfile from './views/SellerProfile';
import OrderTracking from './views/OrderTracking';

// Components
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}>({ notify: () => {} });

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser({ uid: firebaseUser.uid, ...docSnap.data() } as User);
          }
          setLoading(false);
        }, (error) => {
          console.error("User sync error:", error);
          setLoading(false);
        });
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

  if (loading) return <Loader fullScreen />;

  return (
    <NotificationContext.Provider value={{ notify }}>
      <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white dark:bg-black shadow-[0_0_100px_rgba(0,0,0,0.1)] overflow-x-hidden relative select-none">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/auth-share" element={<AuthShare user={user} />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/product/:id" element={<ProductDetail user={user} />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout user={user} />} />
          <Route path="/track-order" element={<OrderTracking />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/edit-product/:productId" element={<AddProduct />} />
          <Route path="/seller/:id" element={<SellerProfile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

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
