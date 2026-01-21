
import React, { useRef } from 'react';
import { Order } from '../types';
import html2canvas from 'html2canvas';

interface ReceiptProps {
  order: Order;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ order, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#f8f9fa',
      scale: 3
    });
    const link = document.createElement('a');
    link.download = `DeepShop_Official_Invoice_${order.id.substring(0,8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 border-green-200 bg-green-50';
      case 'shipped': return 'text-blue-600 border-blue-200 bg-blue-50';
      case 'canceled': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-orange-600 border-orange-200 bg-orange-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg flex flex-col gap-6 my-auto py-10">
        {/* Receipt Container with Paper Vibe */}
        <div 
          ref={receiptRef} 
          className="bg-[#fcfcfc] text-slate-900 p-8 md:p-12 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden font-serif border-t-[12px] border-primary"
          style={{ backgroundImage: 'radial-gradient(#e5e7eb 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
        >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }}></div>
          
          {/* Status Stamp */}
          <div className="absolute top-10 right-10 rotate-12 opacity-80 pointer-events-none">
            <div className={`border-4 px-4 py-2 rounded-xl font-black text-xl uppercase tracking-tighter ${getStatusColor(order.status)}`}>
              {order.status}
            </div>
          </div>

          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-3 mb-4">
              <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-12 h-12 rounded-xl grayscale contrast-125" alt="Logo" />
              <div>
                <h1 className="text-3xl font-black tracking-tighter leading-none">DEEP SHOP</h1>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500 mt-1">Official Electronics Flagship</p>
              </div>
            </div>
            <div className="flex justify-between items-end mt-8">
              <div className="text-[10px] font-bold leading-relaxed">
                <p>DHAKA NORTH, BANGLADESH</p>
                <p>SUPPORT@DEEPSHOP.COM.BD</p>
                <p>+880 17789 53114</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400">Invoice No</p>
                <p className="text-lg font-black tracking-tighter">DS-INV-{order.id.substring(0,8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Customer Info</h3>
              <p className="font-black text-sm uppercase">{order.userInfo?.userName}</p>
              <p className="text-[11px] font-bold mt-1">{order.userInfo?.phone}</p>
              <p className="text-[11px] font-medium text-slate-600 leading-tight mt-1">{order.address?.fullAddress}</p>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Order Details</h3>
              <p className="text-[11px] font-bold">DATE: {order.timestamp?.seconds ? new Date(order.timestamp.seconds * 1000).toLocaleDateString('en-GB') : 'PENDING'}</p>
              <p className="text-[11px] font-bold mt-1 uppercase">METHOD: {order.paymentMethod}</p>
              <p className="text-[11px] font-bold mt-1 uppercase text-primary">ADVANCE: ৳{order.advancePaid?.toLocaleString()}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 text-[10px] font-black uppercase tracking-widest">Description</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.products?.map((p, i) => (
                  <tr key={i}>
                    <td className="py-4">
                      <p className="text-[11px] font-black uppercase leading-tight">{p.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1">S/N: {p.productId.substring(0,10).toUpperCase()}</p>
                    </td>
                    <td className="py-4 text-center text-[11px] font-black">0{p.quantity}</td>
                    <td className="py-4 text-right text-[11px] font-black">৳{p.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation */}
          <div className="border-t-2 border-slate-900 pt-6 space-y-2 mb-10">
            <div className="flex justify-between text-[11px] font-bold">
              <span>SUBTOTAL</span>
              <span>৳{order.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>ADVANCE DEDUCTION</span>
              <span>- ৳{order.advancePaid?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="text-xs font-black uppercase tracking-widest">Balance Payable</span>
              <span className="text-2xl font-black">৳{(order.totalAmount - (order.advancePaid || 0)).toLocaleString()}</span>
            </div>
          </div>

          {/* Footer Barcode */}
          <div className="flex flex-col items-center pt-6 border-t border-dashed border-slate-200">
             <div className="flex gap-1 mb-3">
               {[...Array(40)].map((_, i) => (
                 <div key={i} className="bg-black" style={{ width: `${Math.floor(Math.random() * 3) + 1}px`, height: '35px' }}></div>
               ))}
             </div>
             <p className="text-[8px] font-black tracking-[0.6em] text-slate-400 mb-6">{order.id.toUpperCase()}</p>
             <p className="text-[9px] font-black uppercase text-center text-slate-500 max-w-[280px] leading-relaxed">
               Certified original hardware. This invoice is digitally signed and serves as official proof of purchase.
             </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 h-14 glass text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all">Dismiss</button>
          <button onClick={downloadReceipt} className="flex-[2] h-14 bg-white text-slate-900 rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase text-[10px] tracking-widest">
            <i className="fas fa-print"></i> Save Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
