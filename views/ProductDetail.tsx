
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, onSnapshot, orderBy, increment, updateDoc } from 'firebase/firestore';
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
  const [mentionedUser, setMentionedUser] = useState<User | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

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
          await updateDoc(productRef, { views: increment(1) });
          
          if (prodData.mentionedUserId) {
            const uSnap = await getDoc(doc(db, 'users', prodData.mentionedUserId));
            if (uSnap.exists()) setMentionedUser({ uid: uSnap.id, ...uSnap.data() } as User);
          }

          // Fetch related products from same category
          const relatedQ = query(
            collection(db, 'products'), 
            where('category', '==', prodData.category), 
            limit(5)
          );
          const relSnap = await getDocs(relatedQ);
          const relItems = relSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.id !== id);
          setRelated(relItems);
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

  const isOutOfStock = product?.stock !== 'instock';

  const addToCart = () => {
    if (!product || isOutOfStock) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('Product added to bag!', 'success');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return notify('Login required to submit a review.', 'error');
    if (!newReview.comment.trim()) return notify('Review cannot be empty.', 'error');
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id, userId: user.uid, userName: user.name,
        rating: newReview.rating, comment: newReview.comment,
        likes: [], dislikes: [], replies: [], timestamp: new Date()
      });
      setNewReview({ rating: 5, comment: '' });
      notify('Review submitted!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">Product Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-fade-in pb-40 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-32">
        <div className={`bg-slate-50 dark:bg-zinc-900 rounded-[40px] p-12 flex items-center justify-center border border-slate-100 dark:border-white/5 transition-all duration-1000 ${isOutOfStock ? 'grayscale opacity-70' : ''}`}>
           <img src={product.image} className="max-h-[420px] object-contain transition-transform hover:scale-105 duration-700" alt={product.name} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="mb-10">
            <span className="text-primary font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">Official Deep Shop Product</span>
            <h1 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tight leading-tight">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-6">
              <span className={`text-4xl md:text-5xl font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-950 dark:text-white'}`}>৳{product.price.toLocaleString()}</span>
              
              {mentionedUser && (
                <div className="relative">
                  <button 
                    onClick={() => setShowPopup(!showPopup)}
                    className="px-5 h-10 bg-white dark:bg-zinc-900 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 hover:border-primary transition-all flex items-center gap-2.5 shadow-sm group"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="group-hover:text-primary transition-colors">{mentionedUser.name}</span>
                  </button>

                  {showPopup && (
                    <div className="absolute top-14 left-0 z-50 w-72 glass p-6 rounded-3xl shadow-2xl animate-slide-up border border-white/20">
                      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-white/10">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mentionedUser.name)}&background=e11d48&color=fff&bold=true`} className="w-12 h-12 rounded-2xl" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate uppercase tracking-tight leading-none mb-1.5">{mentionedUser.name}</h4>
                          <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Verified Contributor</span>
                        </div>
                      </div>
                      <div className="mb-6">
                         <RankBadge rank={mentionedUser.rankOverride || 'bronze'} size="md" />
                      </div>
                      <button onClick={() => setShowPopup(false)} className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest">Close Profile</button>
                    </div>
                  )}
                </div>
              )}

              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isOutOfStock ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                {isOutOfStock ? 'Sold Out' : 'In Stock'}
              </span>
            </div>
          </div>
          
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/10 mb-10 shadow-inner">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Description</h5>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm whitespace-pre-wrap">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={addToCart} 
              disabled={isOutOfStock}
              className={`h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 active:scale-95'}`}
            >
              Add to Bag
            </button>
            <button 
              onClick={() => { if(!isOutOfStock) { addToCart(); navigate('/checkout'); } }} 
              disabled={isOutOfStock}
              className={`h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 hover:brightness-110'}`}
            >
              Order Now
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mb-32">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Related Gadgets</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Similar hardware in category</p>
            </div>
            <div className="h-px flex-1 bg-slate-100 dark:bg-white/5 ml-8"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl h-full">
                <div className={`aspect-square relative flex items-center justify-center p-6 bg-slate-50 dark:bg-black/20 overflow-hidden ${p.stock !== 'instock' ? 'grayscale opacity-50' : ''}`}>
                  <img src={p.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-[11px] uppercase truncate mb-2 group-hover:text-primary transition-colors">{p.name}</h4>
                  <p className="text-primary font-black text-xs">৳{p.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-slate-100 dark:border-white/5 pt-20">
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-16">Customer Reviews</h3>

        {user && (
          <form onSubmit={submitReview} className="mb-24 space-y-6 max-w-2xl">
            <div className="flex items-center gap-6">
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rating</span>
               <div className="flex gap-1.5">
                 {[1,2,3,4,5].map(s => (
                   <button key={s} type="button" onClick={() => setNewReview({...newReview, rating: s})} className={`text-xl transition-all ${newReview.rating >= s ? 'text-gold scale-110' : 'text-slate-200'}`}><i className="fas fa-star"></i></button>
                 ))}
               </div>
            </div>
            <textarea placeholder="Write your review here..." className="w-full h-32 p-6 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl outline-none font-medium text-sm focus:border-primary transition-all shadow-inner" value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} />
            <button className="h-12 px-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Submit Review</button>
          </form>
        )}

        <div className="space-y-10">
          {reviews.map(rev => (
            <div key={rev.id} className="pb-10 border-b border-slate-50 dark:border-white/5 flex gap-6 last:border-0 items-start">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(rev.userName)}&background=e11d48&color=fff&bold=true`} className="w-12 h-12 rounded-2xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <h4 className="font-bold text-[10px] uppercase tracking-tight">{rev.userName}</h4>
                  <div className="flex text-gold text-[8px] gap-0.5">
                    {[...Array(5)].map((_, i) => <i key={i} className={`${rev.rating > i ? 'fas' : 'far'} fa-star`}></i>)}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed border-l-2 border-primary/20 pl-4">{rev.comment}</p>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">No reviews yet.</p>}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
