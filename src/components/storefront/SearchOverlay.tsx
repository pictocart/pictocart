import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  category: string | null;
}

interface Props {
  products: Product[];
  storeSlug: string;
  colors: any;
  fonts: any;
  borderRadius: number;
  onClose: () => void;
}

const SearchOverlay = ({ products, storeSlug, colors, fonts, borderRadius, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const filtered = query.trim()
    ? products.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: colors.background }}>
      {/* Search bar */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: colors.secondary }}>
        <Search className="h-5 w-5 opacity-40 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="flex-1 bg-transparent text-base outline-none"
          style={{ color: colors.text, fontFamily: fonts.body }}
        />
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {query && filtered.length === 0 && (
          <p className="text-center text-sm opacity-40 py-12">No products found for "{query}"</p>
        )}
        <div className="space-y-2">
          {filtered.map((product) => (
            <Link
              key={product.id}
              to={`/store/${storeSlug}/product/${product.id}`}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.card }}
            >
              <div
                className="h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                style={{ backgroundColor: colors.secondary }}
              >
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] opacity-30">No img</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate" style={{ fontFamily: fonts.heading }}>
                  {product.title}
                </h4>
                {product.category && <p className="text-xs opacity-50">{product.category}</p>}
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: colors.primary }}>
                ₹{Number(product.price).toLocaleString('en-IN')}
              </span>
            </Link>
          ))}
        </div>

        {!query && (
          <p className="text-center text-sm opacity-30 py-12">Start typing to search...</p>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
