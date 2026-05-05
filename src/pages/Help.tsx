import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, ArrowLeft } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

interface HelpArticle {
  id: string; slug: string; title: string; body_md: string; category: string; sort: number;
}

const Help = () => {
  const { slug } = useParams();
  const [q, setQ] = useState('');

  const { data: articles = [] } = useQuery({
    queryKey: ['help-articles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_md, category, sort')
        .eq('is_published', true)
        .order('category')
        .order('sort');
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  const article = slug ? articles.find((a) => a.slug === slug) : null;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(term) || a.body_md.toLowerCase().includes(term));
  }, [articles, q]);

  const grouped = filtered.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] ?? []).push(a);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  if (article) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Link to="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to help
        </Link>
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{article.category}</div>
          <h1 className="text-2xl font-bold mt-1 mb-4">{article.title}</h1>
          <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body_md) }} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Help Center
        </h1>
        <p className="text-sm text-muted-foreground">Quick answers to common questions.</p>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search help…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((a) => (
              <Link key={a.id} to={`/help/${a.slug}`}>
                <Card className="p-4 hover:border-primary/50 transition-colors h-full">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.body_md.slice(0, 120)}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No articles match your search.</p>}
    </div>
  );
};

export default Help;
