
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
      <section className="sticky top-20 z-40 glass border-b border-slate-100 dark:border-white/5 px-4 md:px-12 py-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2">গ্যাজেট <span className="text-primary">খুঁজুন</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredProducts.length}টি পণ্য পাওয়া গেছে</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-2xl">
            <div className="relative w-full">
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input 
                type="text" 
                placeholder="মডেল বা নাম লিখে খুঁজুন..." 
                className="w-full h-14 pl-14 pr-6 bg-slate-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category Horizontal Scroller */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-6 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shrink-0 ${
                activeCategory === cat 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-12">
        {loading ? <Loader /> : (
          <>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 opacity-20">
                <i className="fas fa-search text-6xl mb-6"></i>
                <h3 className="text-xl font-black uppercase tracking-widest text-center">কোন পণ্য পাওয়া যায়নি</h3>
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
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl h-full relative">
      <div className={`aspect-square relative flex items-center justify-center p-8 bg-slate-50 dark:bg-black/20 overflow-hidden ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
        <img src={product.image.split(',')[0]} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <span className="bg-white/90 dark:bg-black/80 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm">স্টক নেই</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col h-full">
        <h3 className="font-bold text-[13px] mb-4 line-clamp-2 uppercase tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors leading-snug">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={`text-base font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
            ৳{product.price.toLocaleString()}
          </span>
          {!isOutOfStock && (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <i className="fas fa-plus text-[10px]"></i>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Explore;
