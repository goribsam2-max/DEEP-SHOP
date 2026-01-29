import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import { PRODUCT_CATEGORIES } from '../constants';

const Explore: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('সবগুলো');
  const [searchQuery, setSearchQuery] = useState('');

  const filterCategories = ['সবগুলো', ...PRODUCT_CATEGORIES];

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allProds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(allProds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'সবগুলো' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black animate-fade-in pb-40">
      <section className="sticky top-20 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-4 md:px-12 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="lg:mb-2">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3">গ্যাজেট <span className="text-primary">খুঁজুন</span></h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{filteredProducts.length}টি প্রিমিয়াম পণ্য পাওয়া গেছে</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1 max-w-3xl">
            <div className="relative w-full">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
              <input 
                type="text" 
                placeholder="মডেল বা নাম লিখে খুঁজুন..." 
                className="w-full h-16 pl-16 pr-8 bg-slate-50 dark:bg-white/5 rounded-3xl outline-none font-bold text-base border border-transparent focus:border-primary transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category Horizontal Scroller */}
        <div className="max-w-7xl mx-auto mt-10 flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-8 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 border ${
                activeCategory === cat 
                  ? 'bg-primary text-white border-primary shadow-xl scale-105' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-12 lg:pt-20">
        {loading ? <Loader /> : (
          <>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 opacity-20">
                <i className="fas fa-search text-8xl mb-8"></i>
                <h3 className="text-2xl font-black uppercase tracking-widest text-center">কোন পণ্য পাওয়া যায়নি</h3>
                <p className="text-sm font-bold uppercase mt-4">অনুগ্রহ করে অন্য নামে চেষ্টা করুন</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const isOutOfStock = product.stock !== 'instock';
  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[44px] overflow-hidden transition-all duration-700 hover:shadow-2xl h-full relative hover:-translate-y-2">
      <div className={`aspect-square relative flex items-center justify-center p-10 bg-slate-50 dark:bg-black/20 overflow-hidden ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
        <img src={product.image.split(',')[0]} alt={product.name} className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-110 transition-transform duration-1000" />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[3px]">
            <span className="bg-white/95 dark:bg-black/80 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-2xl">স্টক নেই</span>
          </div>
        )}
      </div>
      <div className="p-8 flex flex-col h-full">
        <h3 className="font-bold text-[14px] mb-6 line-clamp-2 uppercase tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors leading-snug">
          {product.name}
        </h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex flex-col">
             <span className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Market Rate</span>
             <span className={`text-xl font-black brand-font italic leading-none ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
               ৳{product.price.toLocaleString()}
             </span>
          </div>
          {!isOutOfStock && (
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-90 transition-all">
              <i className="fas fa-plus text-xs"></i>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Explore;
