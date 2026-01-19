
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
          
          const relatedQ = query(
            collection(db, 'products'),
            where('category', '==', prodData.category),
            limit(5)
          );
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.id !== id)
          );

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
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('Added to bag!', 'success');
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center font-black uppercase tracking-widest opacity-30">Device Not Found</div>;

  const stockStr = (product.stock || '').toLowerCase().replace(/\s/g, '');
  const isOutOfStock = stockStr === 'outofstock';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-fade-in pb-40">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 flex items-center justify-center shadow-xl min-h-[400px]">
           <img src={product.image} className="max-h-[450px] object-contain transition-transform hover:scale-105 duration-700" alt={product.name} />
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl md:text-5xl font-black mb-4 uppercase tracking-tighter leading-tight">{product.name}</h1>
          <div className="flex items-center gap-6 mb-8">
            <span className="text-4xl font-black text-primary">৳{product.price.toLocaleString()}</span>
            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${isOutOfStock ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
              {product.stock || 'In Stock'}
            </span>
          </div>

          <p className="text-slate-500 font-medium leading-relaxed mb-10 text-sm md:text-base border-l-4 border-primary/20 pl-6">
            {product.description}
          </p>

          {/* Corrected: THICKER, more rectangular buttons (rounded-2xl) */}
          <div className="flex flex-col sm:flex-row gap-5 mt-auto">
            <button 
              onClick={addToCart}
              disabled={isOutOfStock}
              className="flex-1 h-20 md:h-16 glass rounded-2xl font-black text-lg md:text-sm uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl active:scale-95 border-b-4 border-slate-200 dark:border-white/20"
            >
              Add to Bag
            </button>
            <button 
              onClick={() => { addToCart(); navigate('/checkout'); }}
              disabled={isOutOfStock}
              className="flex-1 h-20 md:h-16 bg-primary text-white rounded-2xl font-black text-lg md:text-sm uppercase tracking-widest shadow-[0_15px_30px_rgba(46,139,87,0.3)] hover:brightness-110 active:scale-95 transition-all border-b-4 border-black/10"
            >
              Secure Order
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-10">
             <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
             <h2 className="text-lg font-black uppercase tracking-[0.3em] text-slate-400">Related Gear</h2>
             <div className="h-px flex-1 bg-slate-200 dark:bg-white/10"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="glass p-5 rounded-2xl border-white/20 transition-all hover:-translate-y-2 hover:shadow-xl group">
                <div className="h-40 flex items-center justify-center bg-white rounded-xl mb-4 p-2">
                  <img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="font-bold text-[13px] uppercase truncate mb-2 tracking-tight">{p.name}</h4>
                <p className="font-black text-primary text-sm">৳{p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-20 glass p-8 md:p-12 rounded-[32px] border-white/20 shadow-xl">
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Product Voices</h3>
        <div className="space-y-8">
          {reviews.length > 0 ? reviews.map(rev => (
            <div key={rev.id} className="border-b border-white/10 pb-8 last:border-0">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <i className="fas fa-user-circle text-2xl"></i>
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight">{rev.userName}</p>
                    <div className="flex text-gold text-[10px] gap-1">
                      {[...Array(5)].map((_, i) => <i key={i} className={`${rev.rating > i ? 'fas' : 'far'} fa-star`}></i>)}
                    </div>
                  </div>
               </div>
               <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">"{rev.comment}"</p>
            </div>
          )) : <p className="text-center py-10 opacity-20 text-xs font-black uppercase tracking-widest">No reviews yet. Be the first!</p>}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
