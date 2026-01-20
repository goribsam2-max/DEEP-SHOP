
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { sendTelegramNotification } from '../services/telegram';
import { NotificationContext } from '../App';

interface CheckoutProps {
  user: User | null;
}

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  
  const [addressData, setAddressData] = useState({
    fullAddress: user?.address || '',
    district: user?.district || '',
    thana: user?.thana || '',
    postalCode: user?.postalCode || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    const loadItems = () => {
      const items = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(items);
      if (items.length === 0) {
        notify('Your cart is empty', 'info');
        navigate('/cart');
      }
    };
    loadItems();
  }, [navigate, notify]);

  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  const placeOrder = async () => {
    if (!user) return notify('Please login to continue', 'error');
    if (!paymentMethod) return notify('Please select a payment method', 'error');
    if (transactionId.length < 8) return notify('Invalid Transaction ID', 'error');
    if (!addressData.phone || !addressData.fullAddress) return notify('Contact info and address are required', 'error');

    setLoading(true);
    try {
      const orderData = {
        userInfo: { userId: user.uid, userName: user.name, phone: addressData.phone },
        products: cartItems.map((i: any) => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        totalAmount: subtotal,
        advancePaid: 300,
        transactionId,
        paymentMethod,
        status: 'pending',
        address: addressData,
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      const productList = cartItems.map((p: any) => `• ${p.quantity}x ${p.name}`).join('\n');
      const msg = `📦 <b>New Order Received!</b>\nOrder ID: #${docRef.id.substring(0,8)}\nCustomer: ${user.name}\n\n<b>Items:</b>\n${productList}\n\nTotal: ৳${subtotal.toLocaleString()}\nAdvance: ৳300 (${paymentMethod.toUpperCase()})\nTransaction ID: ${transactionId}\n\n<b>Shipping To:</b>\n${addressData.fullAddress}\nPhone: ${addressData.phone}`;
      await sendTelegramNotification(msg);

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('Order placed successfully!', 'success');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      <h1 className="text-3xl font-black mb-12 uppercase tracking-tight">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-8 rounded-2xl">
            <h2 className="font-bold text-xs uppercase tracking-widest mb-8 text-slate-400">01. Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Street Address</label>
                <input placeholder="House, Road, Area" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">District</label>
                <input placeholder="City/District" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.district} onChange={e => setAddressData({...addressData, district: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Phone Number</label>
                <input placeholder="01XXXXXXXXX" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-8 rounded-2xl">
            <h2 className="font-bold text-xs uppercase tracking-widest mb-8 text-slate-400">02. Booking Advance (৳300)</h2>
            <p className="text-sm text-slate-500 mb-6">To confirm your order, please send a booking advance of ৳300 to our personal number: <b>01778953114</b></p>
            
            <div className="flex gap-4 mb-8">
              <button onClick={() => setPaymentMethod('bkash')} className={`flex-1 h-12 rounded-xl font-bold uppercase text-[10px] border-2 transition-all ${paymentMethod === 'bkash' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-white/5'}`}>bKash</button>
              <button onClick={() => setPaymentMethod('nagad')} className={`flex-1 h-12 rounded-xl font-bold uppercase text-[10px] border-2 transition-all ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-500/5 text-orange-500' : 'border-slate-100 dark:border-white/5'}`}>Nagad</button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Transaction ID</label>
              <input 
                placeholder="ENTER TXN ID HERE" 
                className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-xl font-mono text-center font-black text-xl tracking-widest border border-primary/20"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[32px] h-max lg:sticky lg:top-24">
           <h3 className="font-bold text-xs uppercase tracking-widest mb-8 text-center text-slate-400">Order Summary</h3>
           <div className="space-y-4 mb-8">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex justify-between text-[11px] font-medium opacity-80">
                  <span className="truncate flex-1 pr-4">{item.name} x{item.quantity}</span>
                  <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
           </div>
           <div className="pt-6 border-t border-white/10 mb-8 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-400">Total</span>
              <span className="text-2xl font-black">৳{subtotal.toLocaleString()}</span>
           </div>
           <button 
             onClick={placeOrder} 
             disabled={loading}
             className="w-full h-14 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Confirm Order'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
