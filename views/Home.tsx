import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, SiteConfig, Banner } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { PRODUCT_CATEGORIES } from '../constants';

const Home: React.FC<{ user: any }> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('সবগুলো');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Products Listener
    const q = query(collection(db, 'products'), orderBy('timestamp', 'desc'));
    const unsubProds = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => {
      console.error("Prods error:", err);
    });

    // Banners Listener
    const bQ = query(collection(db, 'banners'), orderBy('timestamp', 'desc'));
    const unsubBanners = onSnapshot(bQ, (snap) => {
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
      setLoading(false);
    }, (err) => {
      console.error("Banners error:", err);
      setLoading(false);
    });

    // Config Listener
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as SiteConfig);
    });

    return () => { unsubProds(); unsubBanners(); unsubConfig(); };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const everyonePicks = products.slice(0, 6);
  const mostViewed = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  
  const filteredProducts = products
    .filter(p => activeCategory === 'সবগুলো' || p.category === activeCategory)
    .sort((a, b) => {
      if (a.stock === 'instock' && b.stock !== 'instock') return -1;
      if (a.stock !== 'instock' && b.stock === 'instock') return 1;
      return 0;
    });

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-40 overflow-x-hidden">
      
      {config?.headerNotification?.enabled && (
        <div className="bg-primary py-2 px-6 overflow-hidden">
           <div className="flex items-center justify-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white animate-pulse whitespace-nowrap">
                {config.headerNotification.text}
              </span>
           </div>
        </div>
      )}

      {/* Full Width Dynamic Slider */}
      {banners.length > 0 && (
        <section className="w-full relative aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-zinc-900 shadow-2xl">
          <div className="flex h-full transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {banners.map((b) => (
              <div key={b.id} className="min-w-full h-full relative">
                <img src={b.image} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-24">
                  <h2 className="text-xl md:text-6xl font-black text-white brand-font uppercase mb-6 leading-tight animate-slide-up drop-shadow-2xl">{b.text}</h2>
                  {b.link && (
                    <Link to={b.link} className="w-max btn-primary h-10 md:h-14 px-8 !rounded-full !text-[9px] md:!text-xs">Explore Now <i className="fas fa-arrow-right ml-2"></i></Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-6 flex gap-2 z-20">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-8 bg-primary' : 'w-2 bg-white/30'}`} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Content Sections */}
      <div className="space-y-16 mt-12">
        
        {/* Section 1: Everyone Picks */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-lg md:text-2xl font-black uppercase brand-font tracking-tighter">EVERYONE <span className="text-primary">PICKS</span></h2>
                <div className="w-10 h-1 bg-primary mt-1.5 rounded-full"></div>
             </div>
             <Link to="/explore" className="text-[9px] font-black uppercase tracking-widest text-slate-400">See All <i className="fas fa-chevron-right ml-1"></i></Link>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
             {everyonePicks.map(p => <HorizontalCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Section 2: Most Viewed */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-lg md:text-2xl font-black uppercase brand-font tracking-tighter">MOST <span className="text-primary">VIEWED</span></h2>
                <div className="w-10 h-1 bg-slate-900 dark:bg-white mt-1.5 rounded-full"></div>
             </div>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global Demand</span>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
             {mostViewed.map(p => <HorizontalCard key={p.id} product={p} badge={`${p.views || 0} Views`} />)}
          </div>
        </section>

        {/* Section 3: All Products with Filter */}
        <section className="px-5">
          <div className="flex flex-col gap-8 mb-10">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-lg md:text-2xl font-black uppercase brand-font tracking-tighter">ALL <span className="text-primary">PRODUCTS</span></h2>
                   <div className="w-10 h-1 bg-primary mt-1.5 rounded-full"></div>
                </div>
                <span className="px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black text-slate-500 uppercase">{filteredProducts.length} Items</span>
             </div>
             <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {['সবগুলো', ...PRODUCT_CATEGORIES].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`whitespace-nowrap px-6 h-10 rounded-2xl font-black text-[9px] uppercase border transition-all ${activeCategory === cat ? 'bg-primary text-white border-primary shadow-xl scale-105' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-white/5 text-slate-400'}`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10">
             {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-32 flex flex-col items-center justify-center opacity-30 text-center">
               <i className="fas fa-box-open text-6xl mb-6"></i>
               <p className="font-black uppercase tracking-[0.5em] text-[11px]">No Products Found</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

const HorizontalCard: React.FC<{ product: Product; badge?: string }> = ({ product, badge }) => (
  <Link to={`/product/${product.id}`} className="min-w-[190px] bg-white dark:bg-zinc-900/60 rounded-[36px] p-5 border border-slate-100 dark:border-white/5 flex flex-col group hover:shadow-2xl transition-all duration-500">
    <div className="aspect-square bg-slate-50 dark:bg-black/30 rounded-[28px] flex items-center justify-center p-5 mb-5 relative overflow-hidden shadow-inner">
       <img src={product.image.split(',')[0]} className="max-w-[75%] max-h-[75%] object-contain group-hover:scale-110 transition-transform duration-700" alt="" />
       {badge && (
         <div className="absolute top-0 left-0 bg-primary/20 backdrop-blur-md px-4 py-1.5 rounded-br-2xl border-r border-b border-white/10">
           <span className="text-[8px] font-black text-primary uppercase tracking-widest">{badge}</span>
         </div>
       )}
    </div>
    <h3 className="text-[11px] font-black uppercase truncate mb-2 text-slate-800 dark:text-slate-100">{product.name}</h3>
    <div className="flex items-center justify-between mt-auto">
       <p className="text-sm font-black brand-font text-primary italic">৳{product.price.toLocaleString()}</p>
       <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all"><i className="fas fa-plus text-[10px]"></i></div>
    </div>
  </Link>
);

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const isOutOfStock = product.stock !== 'instock';
  return (
    <Link to={`/product/${product.id}`} className={`flex flex-col bg-white dark:bg-zinc-900/60 rounded-[40px] border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 ${isOutOfStock ? 'opacity-60' : ''}`}>
      <div className="aspect-square relative flex items-center justify-center p-8 bg-slate-50 dark:bg-black/30 group overflow-hidden">
        <img src={product.image.split(',')[0]} className="max-w-[75%] max-h-[75%] object-contain group-hover:scale-110 transition-transform duration-1000" alt="" />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2.5px]">
             <span className="bg-white/90 text-slate-900 px-5 py-2 rounded-full font-black uppercase text-[8px] tracking-[0.2em] shadow-2xl">Stock Out</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bold text-[12px] mb-4 line-clamp-2 uppercase text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Standard Price</span>
              <span className="text-base font-black brand-font text-slate-900 dark:text-white italic">৳{product.price.toLocaleString()}</span>
           </div>
           <div className="w-10 h-10 btn-primary !rounded-2xl !p-0 shadow-lg active:scale-90 transition-all">
              <i className="fas fa-plus text-[10px]"></i>
           </div>
        </div>
      </div>
    </Link>
  );
};

export default Home;
