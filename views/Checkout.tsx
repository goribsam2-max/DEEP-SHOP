
import React, { useState, useContext } from 'react';
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
  const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  
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

  const placeOrder = async () => {
    if (!user) return notify('Please login to place an order', 'error');
    if (!paymentMethod) return notify('Select payment for advance fee', 'error');
    if (transactionId.length < 8) return notify('Invalid Transaction ID', 'error');
    if (!addressData.district || !addressData.fullAddress) return notify('Complete address required', 'error');

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
      const msg = `🚀 <b>New Order Placed!</b>\nOrder ID: #${docRef.id.substring(0,8)}\nCustomer: ${user.name}\n\n<b>Items:</b>\n${productList}\n\nTotal: ৳${subtotal.toLocaleString()}\nAdvance: ৳300 (${paymentMethod.toUpperCase()})\nTXN ID: <code>${transactionId}</code>\n\n<b>Shipping:</b>\n📍 Address: ${addressData.fullAddress}, ${addressData.thana}, ${addressData.district}\n📞 Phone: ${addressData.phone}`;
      await sendTelegramNotification(msg);

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('Order successful!', 'success');
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) return navigate('/cart');

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 animate-fade-in pb-20">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-2">Checkout</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Secure Transaction Processing</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Clean Module */}
          <section className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-100 dark:border-white/10">
            <h2 className="font-bold text-[10px] uppercase tracking-[0.3em] mb-8 text-primary">Shipping Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Street Address</label>
                <input placeholder="E.g. House 5, Road 12" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl outline-none font-medium" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">District</label>
                <input placeholder="District" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl font-medium" value={addressData.district} onChange={e => setAddressData({...addressData, district: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Mobile No.</label>
                <input placeholder="01XXXXXXXXX" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-primary/20 rounded-2xl font-black text-primary" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
              </div>
            </div>
          </section>

          {/* Payment Section - Clear Instructions */}
          <section className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-100 dark:border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
               <div>
                 <h2 className="font-bold text-[10px] uppercase tracking-[0.3em] text-primary">Advance Confirmation (৳300)</h2>
                 <p className="text-[11px] font-black text-slate-500 mt-2 uppercase">Send Money to: <span className="text-slate-900 dark:text-white underline">01778953114</span></p>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setPaymentMethod('bkash')} className={`flex-1 md:w-28 h-14 rounded-2xl border-2 transition-all font-bold uppercase text-[10px] ${paymentMethod === 'bkash' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-white/5'}`}>bKash</button>
                  <button onClick={() => setPaymentMethod('nagad')} className={`flex-1 md:w-28 h-14 rounded-2xl border-2 transition-all font-bold uppercase text-[10px] ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'border-slate-100 dark:border-white/5'}`}>Nagad</button>
               </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Verification Steps:</h4>
               <p className="text-xs font-medium leading-relaxed opacity-90">
                 • Choose "Send Money" to <b>01778953114</b> (Personal).<br/>
                 • Amount: <b>300 TK</b>.<br/>
                 • Paste the Transaction ID from SMS below to confirm.
               </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Enter Transaction ID</label>
              <input 
                placeholder="Paste TXN ID here" 
                className="w-full h-16 px-8 bg-slate-50 dark:bg-black/20 rounded-2xl font-mono font-black text-xl text-center uppercase tracking-[0.2em] border-2 border-primary/20"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="h-max sticky top-28">
          <div className="bg-slate-950 text-white p-10 rounded-3xl shadow-sm border border-slate-800">
             <h2 className="font-bold text-[10px] uppercase tracking-[0.3em] mb-10 text-slate-500 text-center">Order Manifest</h2>
             <div className="space-y-4 mb-10 border-b border-slate-800 pb-8">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <span className="font-bold text-[11px] uppercase truncate opacity-80">{item.name} <span className="text-primary">x{item.quantity}</span></span>
                    <span className="font-black text-[11px] whitespace-nowrap">৳{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
             </div>
             <div className="text-center mb-10">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Total Amount Payable</span>
                <span className="text-4xl font-black text-white">৳{subtotal.toLocaleString()}</span>
             </div>
             <button 
               onClick={placeOrder} 
               disabled={loading}
               className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
             >
               {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Confirm Shipment'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
