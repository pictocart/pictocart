import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeRow {
  id: string;
  theme_id: string;
  name: string;
  category: string | null;
  preview_image: string | null;
  is_premium: boolean | null;
  price: number | null;
  created_at: string;
}

const LiveThemeShowcase = () => {
  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['landing-live-themes'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_master_projects')
        .select('id, theme_id, name, category, preview_image, is_premium, price, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []) as ThemeRow[];
    },
  });

  return (
    <div>
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide cursor-grab">
        <div className="flex gap-6 min-w-max">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-72 h-64 rounded-2xl bg-slate-100 animate-pulse" />
              ))
            : themes.map((theme) => (
                <Link
                  key={theme.id}
                  to={`/marketplace/${theme.theme_id}`}
                  className="w-72 shrink-0 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group bg-white"
                >
                  <div className="h-44 relative overflow-hidden bg-slate-100">
                    {theme.preview_image ? (
                      <img
                        src={theme.preview_image}
                        alt={`${theme.name} theme preview`}
                        loading="lazy"
                        className="w-full object-cover object-top transition-all duration-[3s] ease-in-out group-hover:object-bottom"
                        style={{ height: '200%', minHeight: '200%' }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-violet-100">
                        <Sparkles className="h-10 w-10 text-indigo-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    {theme.category && (
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium capitalize">
                          {theme.category.split('/')[0]}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 z-10">
                      {theme.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow">
                          <Crown className="h-3 w-3" /> ₹{theme.price}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/95 text-white text-[10px] font-bold">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 truncate">{theme.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">5 pages • Full customization</p>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      <div className="text-center mt-10">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
        >
          Browse all themes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default LiveThemeShowcase;
