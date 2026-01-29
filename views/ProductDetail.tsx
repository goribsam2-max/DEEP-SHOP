import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, increment, updateDoc, deleteDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, User } from '../types';
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
  const [loading, setLoading] = useState(true);

  const canManage = user && product && (user.isAdmin || user.uid === product.sellerId);

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
          setImages(prodData.image.split(',').filter(img => img.trim() !== ''));
          
          updateDoc(productRef, { views: increment(1) }).catch(() => {});
          
          if (prodData.sellerId) {
            const uSnap = await getDoc(doc(db, 'users', prodData.sellerId));
            if (uSnap.exists()) {
              setSeller({ uid: uSnap.id, ...uSnap.data() } as User);
            }
          }

          const relatedQ = query(
            collection(db, 'products'), 
            where('category', '==', prodData.category), 
            limit(6)
          );
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));
        }
      } catch (err) {
        console.error("Product Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const addToCart = () => {
    if (!product || product.stock !== 'instock') return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, image: images[0] });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('ব্যাগ-এ যোগ করা হয়েছে!', 'success');
  };

  const handleBuyNow = () => {
    if (!user) {
      notify('অর্ডার করতে আগে লগইন করুন', 'info');
      return navigate('/auth');
    }
    addToCart();
    navigate('/checkout');
  };

  const startChat = async () => {
    if (!user) {
      notify('মেসেজ করতে আগে লগইন করুন', 'info');
      return navigate('/auth');
    }
    if (!product || !seller) return;
    if (user.uid === seller.uid) return notify('নিজে নিজেকে মেসেজ করা যাবে না!', 'info');

    const chatId = [user.uid, seller.uid].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    setLoading(true);
    try {
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, seller.uid],
          participantData: {
            [user.uid]: { name: user.name, pic: user.profilePic || '' },
            [seller.uid]: { name: seller.name, pic: seller.profilePic || '' }
          },
          lastMessage: `ইনকোয়ারি: ${product.name}`,
          lastMessageTime: serverTimestamp(),
          unreadCount: { [seller.uid]: 1, [user.uid]: 0 }
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: user.uid,
          senderName: user.name,
          text: `হ্যালো! আমি "${product.name}" সম্পর্কে জানতে চাচ্ছি।`,
          timestamp: serverTimestamp()
        });
      }
      navigate(`/chat/${chatId}`);
    } catch (e: any) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !window.confirm('আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
      notify('প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে', 'success');
      navigate('/');
    } catch (e: any) {
      notify(e.message, 'error');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">প্রোডাক্ট পাওয়া যায়নি</div>;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-40">
      <div className="max-w-7xl mx-auto w-full px-5 md:px-10 py-10">
        
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Gallery */}
          <div className="lg:w-1/2 space-y-8">
            <div className="relative aspect-square bg-slate-50 dark:bg-zinc-900 rounded-[48px] overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner group">
              <img 
                src={images[activeImage]} 
                className="w-full h-full object-contain p-10 md:p-16 transition-transform duration-700 group-hover:scale-110" 
                alt={product.name} 
              />
              
              {canManage && (
                <div className="absolute top-8 right-8 flex flex-col gap-4 z-20">
                   <button 
                    onClick={() => navigate(`/edit-product/${product.id}`)}
                    className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl flex items-center justify-center text-slate-600 dark:text-white border border-slate-100 dark:border-white/10 active:scale-90 transition-all"
                   >
                     <i className="fas fa-edit text-lg"></i>
                   </button>
                   <button 
                    onClick={handleDelete}
                    className="w-14 h-14 bg-rose-600 text-white rounded-3xl shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-rose-500"
                   >
                     <i className="fas fa-trash-alt text-lg"></i>
                   </button>
                </div>
              )}

              <div className="absolute bottom-8 left-8 px-6 py-2.5 bg-black/30 backdrop-blur-xl rounded-full border border-white/10">
                 <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                   <i className="fas fa-eye mr-2"></i> {product.views || 0} Views
                 </span>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
               {images.map((img, idx) => (
                 <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-zinc-900 border-2 transition-all p-3 shrink-0 ${activeImage === idx ? 'border-primary shadow-xl scale-105' : 'border-transparent opacity-40'}`}
                 >
                   <img src={img} className="w-full h-full object-contain" alt="" />
                 </button>
               ))}
            </div>
          </div>

          {/* Info */}
          <div className="lg:w-1/2 flex flex-col">
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-6">
                 <span className="px-5 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl border border-primary/20">
                   {product.category}
                 </span>
                 <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${product.stock === 'instock' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                   {product.stock === 'instock' ? 'In Stock' : 'Stock Out'}
                 </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black brand-font uppercase leading-[1.1] text-slate-900 dark:text-white mb-6">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-6">
                 <span className="text-5xl font-black text-primary brand-font italic">৳{product.price.toLocaleString()}</span>
                 <span className="text-slate-400 text-sm font-bold uppercase tracking-widest line-through decoration-primary">৳{(product.price + 500).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-8 mb-12">
               <div className="p-10 bg-slate-50 dark:bg-white/5 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-inner">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-[0.5em] text-center">Product Description</h4>
                  <p className="text-sm font-medium leading-loose text-slate-700 dark:text-slate-300 whitespace-pre-wrap italic">
                    {product.description || 'এই প্রোডাক্টটির কোন বিবরণ পাওয়া যায়নি।'}
                  </p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <button 
                    onClick={addToCart}
                    disabled={product.stock !== 'instock'}
                    className="btn-secondary h-20 !text-[11px] !tracking-[0.2em]"
                  >
                    <i className="fas fa-shopping-bag mr-3"></i> ব্যাগ-এ রাখুন
                  </button>
                  <button 
                    onClick={handleBuyNow}
                    disabled={product.stock !== 'instock'}
                    className="btn-primary h-20 !text-[12px] !tracking-[0.2em]"
                  >
                    এখনই কিনুন <i className="fas fa-bolt ml-3"></i>
                  </button>
               </div>
            </div>

            {seller && (
               <div className="bg-slate-900 dark:bg-zinc-900 p-10 rounded-[56px] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 blur-[80px] rounded-full"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-10">
                     <div className="flex items-center gap-6">
                        <div className="relative">
                           <img 
                            src={seller.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=00A86B&color=fff&bold=true&size=128`} 
                            className="w-24 h-24 rounded-[36px] object-cover border-4 border-white/10 shadow-2xl" 
                            alt="" 
                           />
                           <div className="absolute -bottom-2 -right-2">
                             <RankBadge rank={seller.rankOverride || 'bronze'} size="sm" showLabel={false} />
                           </div>
                        </div>
                        <div className="text-center sm:text-left">
                           <span className="text-[9px] font-black uppercase text-primary tracking-[0.3em] mb-2 block">VERIFIED MERCHANT</span>
                           <h4 className="text-2xl font-black uppercase brand-font tracking-tight">{seller.name}</h4>
                           <Link to={`/seller/${seller.uid}`} className="text-[10px] font-bold text-slate-500 hover:text-primary underline transition-colors uppercase mt-2 inline-block">
                             ভিউ ফুল প্রোফাইল
                           </Link>
                        </div>
                     </div>
                     <button 
                      onClick={startChat}
                      className="btn-secondary h-14 !px-8 !rounded-2xl !bg-white !text-black shadow-2xl"
                     >
                       <i className="fas fa-comment-dots mr-2 text-primary"></i> মেসেজ
                     </button>
                  </div>
               </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-32">
             <div className="flex items-center gap-8 mb-16">
                <h2 className="text-2xl md:text-3xl font-black uppercase brand-font tracking-tight">সদৃশ <span className="text-primary">পণ্যসমূহ</span></h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
                {related.map(p => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group bg-white dark:bg-zinc-900/60 border border-slate-100 dark:border-white/5 rounded-[40px] p-6 transition-all duration-500 hover:shadow-2xl flex flex-col h-full hover:-translate-y-2">
                     <div className="aspect-square bg-slate-50 dark:bg-black/40 rounded-[32px] mb-6 p-8 flex items-center justify-center overflow-hidden">
                        <img src={p.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-125 transition-transform duration-700" alt="" />
                     </div>
                     <h4 className="font-bold text-[12px] uppercase truncate mb-3 leading-tight text-slate-800 dark:text-slate-100">{p.name}</h4>
                     <p className="text-primary font-black brand-font text-sm mt-auto italic">৳{p.price.toLocaleString()}</p>
                  </Link>
                ))}
             </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
