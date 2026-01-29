import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import Messages from './views/Messages';
import ChatRoom from './views/ChatRoom';
import StoryViewer from './views/StoryViewer';

// Components
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import BanScreen from './components/BanScreen';
import UserGuide from './components/UserGuide';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}>({ notify: () => {} });

const getDeviceId = () => {
  let id = localStorage.getItem('ds_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('ds_device_id', id);
  }
  return id;
};

const AppLayout: React.FC<{ user: User | null; exitShadowMode: () => void; isGlobalBanned: boolean; banDetails: any }> = ({ user, exitShadowMode, isGlobalBanned, banDetails }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasUnreadNotify, setHasUnreadNotify] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      const guideShown = localStorage.getItem(`guide_shown_${user.uid}`);
      if (!guideShown) {
        setShowGuide(true);
      }
    }
  }, [user?.uid]);

  const handleGuideComplete = () => {
    if (user?.uid) {
      localStorage.setItem(`guide_shown_${user.uid}`, 'true');
    }
    setShowGuide(false);
  };

  if (isGlobalBanned || (user && user.isBanned)) {
    return <BanScreen ip={banDetails?.ip} deviceId={banDetails?.deviceId} reason={user?.isBanned ? "Account Disabled" : "Device/IP Restricted"} />;
  }

  const isHome = location.pathname === '/';
  const hideNav = ['/auth', '/checkout', '/chat/', '/story/'].some(path => location.pathname.includes(path));

  useEffect(() => {
    if (user?.uid) {
      const unsub = onSnapshot(doc(db, 'users', user.uid, 'notifications', 'status'), (snap) => {
        if (snap.exists()) setHasUnreadNotify(snap.data().hasUnread);
      });
      return () => unsub();
    }
  }, [user?.uid]);

  return (
    <div className="min-h-screen flex flex-col w-full bg-white dark:bg-black relative select-none shadow-2xl overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} />
      {showGuide && user && <UserGuide onComplete={handleGuideComplete} />}

      {!hideNav && (
        <Navbar 
          user={user} 
          onOpenMenu={() => setIsSidebarOpen(true)} 
          hasUnreadNotify={hasUnreadNotify}
          showBack={!isHome}
        />
      )}

      {/* Main Container constrained for desktop but allowing full flow */}
      <main className="flex-1 flex flex-col overflow-y-auto no-scrollbar w-full">
        <div className="w-full h-full max-w-none mx-auto">
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
            <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/auth" />} />
            <Route path="/chat/:chatId" element={user ? <ChatRoom user={user} /> : <Navigate to="/auth" />} />
            <Route path="/story/:storyId" element={user ? <StoryViewer user={user} /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/edit-product/:productId" element={<AddProduct />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {/* Show bottom nav only on mobile AND if we are not on pages that hide navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isGlobalBanned, setIsGlobalBanned] = useState(false);
  const [banDetails, setBanDetails] = useState<any>(null);
  
  useEffect(() => {
    const checkBanStatus = async () => {
      const deviceId = getDeviceId();
      let ip = 'unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) {}

      setBanDetails({ ip, deviceId });

      const deviceBanRef = doc(db, 'banned_devices', deviceId);
      const ipBanRef = doc(db, 'banned_devices', ip.replace(/\./g, '_'));
      
      const [dSnap, iSnap] = await Promise.all([getDoc(deviceBanRef), getDoc(ipBanRef)]);
      
      if (dSnap.exists() || iSnap.exists()) {
        setIsGlobalBanned(true);
        setLoading(false);
        return;
      }

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
              const userData = { uid: firebaseUser.uid, ...docSnap.data() } as User;
              setUser(userData);
              updateDoc(doc(db, 'users', firebaseUser.uid), {
                deviceId: deviceId,
                lastIp: ip
              }).catch(() => {});
            }
            setLoading(false);
          }, () => setLoading(false));
          return () => unsubUser();
        } else {
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    };

    checkBanStatus();
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
        <AppLayout 
          user={user} 
          exitShadowMode={exitShadowMode} 
          isGlobalBanned={isGlobalBanned}
          banDetails={banDetails}
        />
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
