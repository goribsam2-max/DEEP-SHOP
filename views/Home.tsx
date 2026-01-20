
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, SiteConfig } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'mobile', 'laptop', 'accessories'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchProducts();

    const unsubscribeConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
    });

    return () => unsubscribeConfig();
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="animate-fade-in pb-20 bg-white dark:bg-black">
      {siteConfig?.bannerVisible && (
        <div className="bg-primary text-white py-2 text-center text-[10px] font-bold uppercase tracking-widest px-4">
          {siteConfig.bannerText}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[40vh] md:h-[55vh] flex items-center px-6 md:px-24 bg-slate-50 dark:bg-zinc-900/30 border-b border-slate-100 dark:border-white/5">
        <div className="max-w-4xl relative z-10 animate-slide-up">
          <span className="text-primary font-bold text-[11px] uppercase tracking-widest mb-4 block">Trusted Premium Store</span>
          <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">
            Quality Tech. <br/><span className="text-slate-400">Better Lifestyle.</span>
          </h1>
          <div className="flex gap-4">
            <button className="h-14 px-10 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-primary/10">
              Browse All
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-16">
        {/* Category Pills */}
        <div className="flex gap-3 mb-12 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-8 h-11 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all border ${
                activeCategory === cat 
                  ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-black dark:border-white' 
                  : 'bg-white dark:bg-white/5 text-slate-400 border-slate-100 dark:border-white/5 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? <Loader /> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-10">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const isOutOfStock = product.stock !== 'instock';
  const firstName = product.mentionedUserName ? product.mentionedUserName.split(' ')[0] : null;

  return (
    <Link 
      to={`/product/${product.id}`}
      className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-ios-lg overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none h-full relative"
    >
      <div className={`aspect-square relative flex items-center justify-center p-8 bg-slate-50 dark:bg-black/20 overflow-hidden ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <span className="bg-white/90 dark:bg-black/80 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-slate-100 dark:border-white/10">Sold Out</span>
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col h-full">
        <h3 className="font-bold text-[13px] mb-3 line-clamp-2 uppercase tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        {firstName && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 dark:text-white">{firstName}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/10">PHONE</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <span className={`text-base font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
            ৳{product.price.toLocaleString()}
          </span>
          {!isOutOfStock && (
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <i className="fas fa-plus text-[10px]"></i>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Home;
