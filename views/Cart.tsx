import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setItems(cart);
    };
    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-10 flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-3xl text-slate-400 mb-6">
          <i className="fas fa-shopping-basket"></i>
        </div>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 text-center">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/" className="px-8 py-3 bg-primary text-white rounded-ios-lg font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <h1 className="text-3xl font-black mb-8">Shopping Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <div key={item.id} className="glass p-4 rounded-ios-lg flex gap-4 items-center">
              <div className="w-20 h-20 rounded-ios overflow-hidden bg-slate-100 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                <span className="text-primary font-black">à§³{item.price.toLocaleString()}</span>
                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-xs"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-xs"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-danger p-2">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-80 h-max glass p-6 rounded-ios-lg sticky top-24">
          <h2 className="font-bold text-lg mb-6">Order Summary</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold">à§³{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Delivery Fee</span>
              <span className="text-success font-bold uppercase text-xs">Calculated at Next Step</span>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/10 my-4"></div>
            <div className="flex justify-between text-xl font-black">
              <span>Total</span>
              <span className="text-primary">à§³{subtotal.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="w-full h-14 bg-primary text-white rounded-ios-lg font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            Go to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
