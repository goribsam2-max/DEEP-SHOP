
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, User, Review } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

interface ProductDetailProps {
  user: User | null;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'products', id));
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(prodData);
          
          const relatedQ = query(collection(db, 'products'), where('category', '==', prodData.category), limit(5));
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));

          const revQ = query(collection(db, 'reviews'), where('productId', '==', id));
          const revSnap = await getDocs(revQ);
          setReviews(revSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
        }
      } catch (err) {
        console.error("Product fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('Added to Bag', 'success');
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center font-bold uppercase tracking-widest opacity-30">Not Found</div>;

  const stockStr = (product.stock || '').toLowerCase().replace(/\s/g, '');
  const isOutOfStock = stockStr === 'outofstock';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-fade-in pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-16">
        <div className="bg-white dark:bg-white/5 rounded-3xl p-10 border border-slate-100 dark:border-white/10 flex items-center justify-center shadow-sm">
           <img src={product.image} className="max-h-[450px] object-contain" alt={product.name} />
        </div>

        <div className="flex flex-col py-2">
          <div className="mb-8">
            <span className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mb-2 block">Premium Catalog</span>
            <h1 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter leading-tight">{product.name}</h1>
            <div className="flex items-center gap-5">
              <span className="text-3xl font-black text-slate-900 dark:text-white">৳{product.price.toLocaleString()}</span>
              <span className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${isOutOfStock ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                {product.stock || 'In Stock'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-2xl border border-slate-100 dark:border-white/10 mb-10 flex-1">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Product Details</h5>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-sm md:text-base whitespace-pre-wrap">
              {product.description}
            </p>
          </div>

          {/* Corrected: FLAT ROBUST BUTTONS (NO PILL) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={addToCart}
              disabled={isOutOfStock}
              className="h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:brightness-125 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Add to Bag
            </button>
            <button 
              onClick={() => { addToCart(); navigate('/checkout'); }}
              disabled={isOutOfStock}
              className="h-16 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <i className="fas fa-bolt-lightning"></i> Secure Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400 mb-8 px-2">Similar Devices</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 transition-all hover:border-primary/40 group">
                <div className="aspect-square flex items-center justify-center bg-white rounded-xl mb-4 p-4">
                  <img src={p.image} className="max-h-full object-contain group-hover:scale-105 transition-transform" />
                </div>
                <h4 className="font-bold text-[12px] uppercase truncate mb-1 text-slate-700 dark:text-slate-300">{p.name}</h4>
                <p className="font-black text-primary text-sm">৳{p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews Clean Section */}
      <section className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-slate-100 dark:border-white/10">
        <h3 className="text-lg font-black uppercase tracking-tight mb-8">Verified Customer Feedback</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reviews.length > 0 ? reviews.map(rev => (
            <div key={rev.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">{rev.userName[0]}</div>
                  <div>
                    <p className="font-bold text-xs uppercase tracking-tight">{rev.userName}</p>
                    <div className="flex text-gold text-[8px] gap-1">
                      {[...Array(5)].map((_, i) => <i key={i} className={`${rev.rating > i ? 'fas' : 'far'} fa-star`}></i>)}
                    </div>
                  </div>
               </div>
               <p className="text-sm font-medium text-slate-500 italic leading-relaxed">"{rev.comment}"</p>
            </div>
          )) : <div className="col-span-full py-12 text-center opacity-20 text-[10px] font-bold uppercase tracking-widest">No reviews for this flagship yet.</div>}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
