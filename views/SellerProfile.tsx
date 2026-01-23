
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { User, Product } from '../types';
import Loader from '../components/Loader';
import RankBadge from '../components/RankBadge';

const SellerProfile: React.FC = () => {
  const { id } = useParams();
  const [seller, setSeller] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchSellerData = async () => {
      const uSnap = await getDoc(doc(db, 'users', id));
      if (uSnap.exists()) setSeller({ uid: uSnap.id, ...uSnap.data() } as User);
      
      const pSnap = await getDocs(query(collection(db, 'products'), where('sellerId', '==', id)));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    };
    fetchSellerData();
  }, [id]);

  if (loading) return <Loader fullScreen />;
  if (!seller) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">Seller Node Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
       <div className="bg-white dark:bg-zinc-900 p-10 rounded-[48px] mb-12 flex flex-col items-center text-center border border-slate-100 dark:border-white/5 shadow-sm">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=e11d48&color=fff&bold=true`} className="w-24 h-24 rounded-[32px] mb-6 shadow-xl" />
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{seller.name}</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">{seller.email}</p>
          <div className="flex gap-4">
            <RankBadge rank={seller.rankOverride || 'bronze'} />
            <div className="px-6 py-2 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/10 text-[10px] font-black uppercase tracking-widest">
               {products.length} Items for sale
            </div>
          </div>
       </div>

       <div className="flex items-center gap-4 mb-10">
          <h2 className="text-xl font-black uppercase tracking-tight">Active Listings</h2>
          <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map(p => (
            <Link key={p.id} to={`/product/${p.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
               <div className="aspect-square bg-slate-50 dark:bg-black/20 p-6">
                 <img src={p.image.split(',')[0]} className="w-full h-full object-contain" alt="" />
               </div>
               <div className="p-6">
                  <h4 className="font-bold text-[11px] uppercase truncate mb-2">{p.name}</h4>
                  <p className="text-primary font-black text-xs">৳{p.price.toLocaleString()}</p>
               </div>
            </Link>
          ))}
          {products.length === 0 && <p className="col-span-full text-center py-24 opacity-20 uppercase font-black tracking-widest">No active listings</p>}
       </div>
    </div>
  );
};

export default SellerProfile;
