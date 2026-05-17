import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Store { id: string; name: string; slug: string; custom_domain: string | null }

/**
 * Generates a one-shot prompt the admin pastes into a fresh Lovable project
 * to create a fully-synced merchant storefront shell.
 */
export default function CopyProvisioningPromptCard() {
  const [storeId, setStoreId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const stores = useQuery({
    queryKey: ['admin-stores-for-prompt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, custom_domain')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Store[];
    },
  });

  const generate = async () => {
    if (!storeId) { toast.error('Pick a store first'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('provisioning-prompt', {
        body: { store_id: storeId },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to generate prompt');
      setPrompt(data.prompt);
      toast.success('Prompt generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied — paste into a fresh Lovable project');
  };

  const selected = stores.data?.find(s => s.id === storeId);

  return (
    <Card className="p-5 space-y-3 border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4" /> One-shot provisioning prompt</h3>
          <p className="text-xs text-muted-foreground mt-1">Pick a store → copy prompt → paste into a brand-new Lovable project. The project becomes a dumb shell that auto-syncs with this Pictocart backend forever.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Pick a store…" /></SelectTrigger>
          <SelectContent>
            {(stores.data ?? []).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name} — /{s.slug}{s.custom_domain ? ` · ${s.custom_domain}` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={loading || !storeId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
        </Button>
      </div>
      {prompt && (
        <>
          <Textarea value={prompt} readOnly className="font-mono text-xs h-72" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{prompt.length.toLocaleString()} chars · for {selected?.name}</span>
            <Button size="sm" onClick={copy} variant="default"><Copy className="h-4 w-4 mr-1" /> Copy prompt</Button>
          </div>
        </>
      )}
    </Card>
  );
}
