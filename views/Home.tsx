
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, SiteConfig } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { PRODUCT_CATEGORIES } from '../constants';

const Home: React.FC<{ user: any }> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('সবগুলো');

  useEffect(() => {
    // Fetch Products
    const q = query(collection(db, 'products'), orderBy('timestamp', 'desc'));
    const unsubProds = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    // Fetch Site Config for Notification
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as SiteConfig);
    });

    return () => { unsubProds(); unsubConfig(); };
  }, []);

  // Filter and Sort Logic
  const inStockProducts = products.filter(p => p.stock === 'instock');
  
  // 1. Trending: Newest 6 products (In Stock Only)
  const trendingProducts = inStockProducts.slice(0, 6);

  // 2. Most Viewed: Top 6 by views (In Stock Only)
  const mostViewedProducts = [...inStockProducts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 6);

  // 3. All Products Sorting: In Stock first, then out of stock
  const allProductsSorted = [...products]
    .filter(p => activeCategory === 'সবগুলো' || p.category === activeCategory)
    .sort((a, b) => {
      if (a.stock === 'instock' && b.stock !== 'instock') return -1;
      if (a.stock !== 'instock' && b.stock === 'instock') return 1;
      return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
    });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-32">
      
      {/* 1. Conditional Header Notification */}
      {config?.headerNotification?.enabled && (
        <div className="bg-primary/10 border-b border-primary/5 py-3 px-6 overflow-hidden">
           <div className="flex items-center gap-3 animate-pulse">
              <i className="fas fa-bullhorn text-primary text-xs"></i>
              <p className="text-[10px] font-black uppercase tracking-wider text-primary truncate">
                {config.headerNotification.text}
              </p>
           </div>
        </div>
      )}

      {/* Hero Banner */}
      <section className="px-4 pt-6">
        <div className="relative h-48 w-full bg-gradient-to-br from-rose-600 to-rose-800 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute inset-y-0 left-0 p-8 flex flex-col justify-center max-w-lg z-10">
            <span className="text-white/60 text-[10px] font-black uppercase mb-3">প্রিমিয়াম গ্যাজেট স্টোর</span>
            <h1 className="text-2xl font-black text-white brand-font leading-tight mb-6 uppercase">BEST DEALS ON <br/><span className="text-rose-200">LATEST GADGETS</span></h1>
            <Link to="/explore" className="bg-white text-rose-600 w-max px-8 py-3 rounded-2xl font-black text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-xl">সবগুলো দেখুন</Link>
          </div>
        </div>
      </section>

      {/* Categories Tabs */}
      <section className="px-4 mt-10 overflow-x-auto no-scrollbar flex gap-3 pb-2">
        {['সবগুলো', ...PRODUCT_CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-8 h-11 rounded-2xl font-black text-[9px] uppercase transition-all ${
              activeCategory === cat ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* 2. Trending Section (Horizontal) */}
      {activeCategory === 'সবগুলো' && trendingProducts.length > 0 && (
        <section className="mt-12">
          <div className="px-6 flex items-center justify-between mb-6">
            <h2 className="text-lg font-black uppercase brand-font tracking-tight">TRENDING <span className="text-primary">NOW</span></h2>
            <div className="w-8 h-px bg-slate-200 dark:bg-white/5"></div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4">
            {trendingProducts.map(product => (
              <HorizontalProductCard key={product.id} product={product} badge="Trending" />
            ))}
          </div>
        </section>
      )}

      {/* 3. Most Viewed Section (Horizontal) */}
      {activeCategory === 'সবগুলো' && mostViewedProducts.length > 0 && (
        <section className="mt-12">
          <div className="px-6 flex items-center justify-between mb-6">
            <h2 className="text-lg font-black uppercase brand-font tracking-tight">MOST <span className="text-primary">VIEWED</span></h2>
            <div className="w-8 h-px bg-slate-200 dark:bg-white/5"></div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4">
            {mostViewedProducts.map(product => (
              <HorizontalProductCard key={product.id} product={product} badge={`${product.views || 0} Views`} />
            ))}
          </div>
        </section>
      )}

      {/* 4. All Products Grid (Smart Sorted) */}
      <section className="px-4 mt-12">
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-xl font-black uppercase brand-font">ALL <span className="text-primary">PRODUCTS</span></h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{allProductsSorted.length} items</span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-10">
          {allProductsSorted.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};

const HorizontalProductCard: React.FC<{ product: Product; badge?: string }> = ({ product, badge }) => (
  <Link to={`/product/${product.id}`} className="min-w-[200px] bg-slate-50 dark:bg-zinc-900/40 rounded-[32px] p-5 border border-slate-100 dark:border-white/5 flex flex-col items-center text-center shadow-sm">
    <div className="w-32 h-32 flex items-center justify-center p-4 bg-white dark:bg-black/20 rounded-2xl mb-4 relative overflow-hidden">
       <img src={product.image.split(',')[0]} className="w-full h-full object-contain" alt={product.name} />
       {badge && (
         <div className="absolute top-0 left-0 bg-primary/10 px-3 py-1 rounded-br-xl">
           <span className="text-[7px] font-black text-primary uppercase">{badge}</span>
         </div>
       )}
    </div>
    <h3 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate w-full mb-2">{product.name}</h3>
    <p className="text-sm font-black text-primary brand-font tracking-tighter">৳{product.price.toLocaleString()}</p>
  </Link>
);

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const isOutOfStock = product.stock !== 'instock';
  return (
    <Link to={`/product/${product.id}`} className={`group bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[40px] p-6 transition-all duration-500 hover:shadow-2xl flex flex-col h-full ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
      <div className="aspect-square bg-slate-50 dark:bg-black/20 rounded-[32px] p-8 mb-6 relative overflow-hidden flex items-center justify-center shadow-inner">
        <img src={product.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={product.name} />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-500 text-white px-5 py-2 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">Stock Out</span>
          </div>
        )}
      </div>
      <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 line-clamp-2 mb-4 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-lg font-black brand-font tracking-tighter">৳{product.price.toLocaleString()}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOutOfStock ? 'bg-slate-100 dark:bg-white/5 text-slate-300' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-primary group-hover:text-white'}`}>
          <i className="fas fa-plus text-[10px]"></i>
        </div>
      </div>
    </Link>
  );
};

export default Home;
