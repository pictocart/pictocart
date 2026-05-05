import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, Search } from 'lucide-react';

interface HelpArticle { id: string; slug: string; title: string; body_md: string; category: string }

export const HelpLauncher = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const { data: articles = [] } = useQuery({
    queryKey: ['help-articles-mini'],
    enabled: open,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_md, category')
        .eq('is_published', true).order('sort').limit(20);
      return (data ?? []) as HelpArticle[];
    },
  });

  const filtered = q
    ? articles.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()))
    : articles;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Help"
          className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader><SheetTitle>How can we help?</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="space-y-1">
            {filtered.map((a) => (
              <Link key={a.id} to={`/help/${a.slug}`} onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-muted text-sm">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{a.category}</div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">No articles found.</p>}
          </div>
          <div className="pt-3 border-t">
            <a href="https://wa.me/919999999999?text=Hi%20Pictocart%20support" target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp support
              </Button>
            </a>
            <Link to="/help" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full mt-2">Browse full help center</Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
