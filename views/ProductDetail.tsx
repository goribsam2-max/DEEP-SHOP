
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, onSnapshot, orderBy, increment, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, User, Review } from '../types';
import Loader from '../components/Loader';
import RankBadge from '../components/RankBadge';
import { NotificationContext } from '../App';

interface ProductDetailProps {
  user: User | null;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [seller, setSeller] = useState<User | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = user && product && (user.uid === product.sellerId || user.isAdmin);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productRef = doc(db, 'products', id);
        const docSnap = await getDoc(productRef);
        
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(prodData);
          setImages(prodData.image.split(','));
          await updateDoc(productRef, { views: increment(1) });
          
          if (prodData.sellerId) {
            const uSnap = await getDoc(doc(db, 'users', prodData.sellerId));
            if (uSnap.exists()) setSeller({ uid: uSnap.id, ...uSnap.data() } as User);
          }

          const relatedQ = query(collection(db, 'products'), where('category', '==', prodData.category), limit(5));
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchProduct();

    const revQ = query(collection(db, 'reviews'), where('productId', '==', id), orderBy('timestamp', 'desc'));
    const unsubRev = onSnapshot(revQ, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    return () => unsubRev();
  }, [id]);

  const addToCart = () => {
    if (!product || product.stock !== 'instock') return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1, image: images[0] });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('ব্যাগ-এ যোগ করা হয়েছে!', 'success');
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই প্রোডাক্টটি মুছে ফেলতে চান?')) return;
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      notify('প্রোডাক্ট মুছে ফেলা হয়েছে!', 'info');
      navigate('/');
    } catch (e: any) {
      notify(e.message, 'error');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">প্রোডাক্ট পাওয়া যায়নি</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-fade-in pb-40 relative">
      {/* Management Bar for Admins/Sellers */}
      {canManage && (
        <div className="mb-10 p-6 bg-slate-900 text-white rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10">
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-1">প্রোডাক্ট কন্ট্রোল প্যানেল</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">আপনি এই প্রোডাক্টটি এডিট বা ডিলিট করতে পারবেন</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={() => navigate(`/edit-product/${id}`)} className="flex-1 md:flex-none px-8 h-12 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              এডিট প্রোডাক্ট
            </button>
            <button onClick={handleDeleteProduct} className="flex-1 md:flex-none px-8 h-12 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              মুছে ফেলুন
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-32">
        <div className="space-y-6">
           <div className="bg-slate-50 dark:bg-zinc-900 rounded-[44px] p-12 flex items-center justify-center border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm relative">
              <img src={images[activeImage]} className="max-h-[400px] object-contain transition-transform hover:scale-110 duration-700" alt={product.name} />
              {product.stock !== 'instock' && (
                <div className="absolute inset-0 bg-black/5 backdrop-blur-[4px] flex items-center justify-center">
                   <span className="bg-red-500 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl">STOCK OUT</span>
                </div>
              )}
           </div>
           <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2">
             {images.map((img, idx) => (
               <div key={idx} onClick={() => setActiveImage(idx)} className={`w-24 h-24 rounded-2xl bg-white dark:bg-zinc-900 p-2.5 border-2 cursor-pointer transition-all shrink-0 ${activeImage === idx ? 'border-primary shadow-xl scale-105' : 'border-transparent opacity-50'}`}>
                 <img src={img} className="w-full h-full object-contain" alt="" />
               </div>
             ))}
           </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
               {product.sellerId ? (
                 <Link to={`/seller/${product.sellerId}`} className="text-primary font-black text-[11px] uppercase tracking-[0.3em] hover:opacity-70">সেলার: {product.sellerName}</Link>
               ) : (
                 <span className="text-primary font-bold text-[11px] uppercase tracking-[0.4em] brand-font">OFFICIAL DEEP SHOP HARDWARE</span>
               )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tight leading-tight text-slate-900 dark:text-white">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-8">
              <span className="text-4xl md:text-5xl font-black brand-font text-primary">৳{product.price.toLocaleString()}</span>
              {product.stock !== 'instock' && <span className="bg-red-50 text-red-500 px-5 py-2 rounded-full text-[10px] font-black uppercase border border-red-100">স্টক নেই</span>}
            </div>
          </div>
          
          <div className="p-10 rounded-[40px] bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 mb-12 shadow-sm">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 border-b border-slate-200 dark:border-white/10 pb-4">প্রোডাক্টের বিবরণ</h5>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm whitespace-pre-wrap">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={addToCart} 
              disabled={product.stock !== 'instock'}
              className={`h-16 rounded-[22px] font-black text-[11px] uppercase tracking-widest border border-slate-200 dark:border-white/10 transition-all ${product.stock === 'instock' ? 'bg-white dark:bg-white/5 active:scale-95 text-slate-500' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
            >
              ব্যাগ-এ যোগ করুন
            </button>
            <button 
              onClick={() => { addToCart(); navigate('/checkout'); }} 
              disabled={product.stock !== 'instock'}
              className={`h-16 rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all ${product.stock === 'instock' ? 'bg-primary text-white shadow-primary/20 hover:brightness-110 active:scale-95' : 'bg-slate-300 text-white cursor-not-allowed shadow-none'}`}
            >
              এখনই কিনুন
            </button>
          </div>

          {seller && (
            <div className="mt-16 p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[24px] shadow-lg border-2 border-white" alt="" />
                <div>
                   <h4 className="font-bold text-sm uppercase text-slate-800 dark:text-slate-200">{seller.name}</h4>
                   <Link to={`/seller/${seller.uid}`} className="text-[10px] font-black uppercase text-primary tracking-widest mt-1 inline-block">প্রোফাইল দেখুন</Link>
                </div>
              </div>
              <RankBadge rank={seller.rankOverride || 'bronze'} size="sm" showLabel={false} />
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mb-32 animate-slide-up">
          <div className="flex items-center gap-6 mb-16 px-2">
            <h3 className="text-2xl font-black uppercase tracking-tight brand-font">SIMILAR <span className="text-slate-400">GADGETS</span></h3>
            <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm group hover:shadow-2xl transition-all h-full">
                <div className="aspect-square mb-6 bg-slate-50 dark:bg-black/20 rounded-3xl p-6 overflow-hidden relative">
                   <img src={p.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-115 transition-transform duration-700" alt="" />
                   {p.stock !== 'instock' && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"><span className="text-[8px] font-black text-white uppercase bg-red-500 px-3 py-1 rounded-full">SOLD OUT</span></div>}
                </div>
                <h4 className="font-bold text-[12px] uppercase truncate mb-3 text-slate-700 dark:text-slate-300 group-hover:text-primary">{p.name}</h4>
                <p className="text-primary font-black text-sm brand-font">৳{p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
