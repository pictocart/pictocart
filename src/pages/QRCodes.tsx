import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useStore } from '@/hooks/useStore';
import { useFulfillment } from '@/hooks/useFulfillment';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Download, Trash2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeRow {
  id: string;
  kind: 'menu' | 'table' | 'takeaway';
  slug: string;
  table_label: string | null;
  target_path: string;
  scans_count: number;
  is_active: boolean;
  created_at: string;
}

const randSlug = (len = 10) =>
  Array.from({ length: len }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');

const QRCodes = () => {
  const { store } = useStore();
  const { enabledModes } = useFulfillment(store?.id);
  const [rows, setRows] = useState<QRCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'menu' | 'table' | 'takeaway'>('table');
  const [tableLabel, setTableLabel] = useState('');
  const [bulkCount, setBulkCount] = useState(1);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const load = async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('store_qr_codes' as any)
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [store?.id]); // eslint-disable-line

  const targetFor = (k: 'menu' | 'table' | 'takeaway', tlabel?: string) => {
    if (!store) return '/';
    if (k === 'menu') return `/store/${store.slug}/menu`;
    if (k === 'takeaway') return `/store/${store.slug}/menu/takeaway`;
    return `/store/${store.slug}/menu/t/${encodeURIComponent(tlabel || '')}`;
  };

  const createOne = async (k: 'menu' | 'table' | 'takeaway', tlabel?: string) => {
    if (!store?.id) return;
    const slug = randSlug();
    const target_path = targetFor(k, tlabel);
    const { error } = await supabase.from('store_qr_codes' as any).insert({
      store_id: store.id, kind: k, slug, table_label: tlabel || null, target_path,
    });
    if (error) throw error;
  };

  const handleCreate = async () => {
    try {
      if (kind === 'table') {
        const labels = tableLabel
          ? [tableLabel]
          : Array.from({ length: Math.max(1, Math.min(50, bulkCount)) }, (_, i) => `T${i + 1}`);
        for (const l of labels) await createOne('table', l);
        toast.success(`${labels.length} table QR${labels.length > 1 ? 's' : ''} created`);
      } else {
        await createOne(kind);
        toast.success('QR created');
      }
      setTableLabel('');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    await supabase.from('store_qr_codes' as any).delete().eq('id', id);
    load();
  };

  if (!store) return null;

  return (
    <div className="space-y-6 max-w-5xl pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
        <p className="text-sm text-muted-foreground">Printable QR codes for tables, menu, and takeaway counter.</p>
      </div>

      {enabledModes.length === 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="py-4 text-sm">
            Turn on at least one fulfillment mode in <a href="/settings/fulfillment" className="underline">Fulfillment settings</a> first.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create new QR</CardTitle>
          <CardDescription>Tables can be bulk-created (T1, T2, …) or named individually.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-1">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v: any) => setKind(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="menu">Menu (general)</SelectItem>
                <SelectItem value="takeaway">Takeaway counter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kind === 'table' && (
            <>
              <div>
                <Label>Table label (single)</Label>
                <Input value={tableLabel} onChange={(e) => setTableLabel(e.target.value)} placeholder="e.g. T-12" />
              </div>
              <div>
                <Label>Or bulk count</Label>
                <Input type="number" min={1} max={50} value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value) || 1)} disabled={!!tableLabel} />
              </div>
            </>
          )}
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1.5" /> Create</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <QrCode className="h-10 w-10 mx-auto mb-2 opacity-50" />
          No QR codes yet
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <QRCard key={r.id} row={r} baseUrl={baseUrl} storeName={store.name} onDelete={() => remove(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const QRCard = ({ row, baseUrl, storeName, onDelete }: { row: QRCodeRow; baseUrl: string; storeName: string; onDelete: () => void; }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullUrl = `${baseUrl}/q/${row.slug}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, fullUrl, { width: 320, margin: 2, errorCorrectionLevel: 'H' });
  }, [fullUrl]);

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${storeName}-${row.kind}-${row.table_label || row.slug}.png`;
    a.click();
  };

  const print = () => {
    const c = canvasRef.current;
    if (!c) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR — ${storeName} ${row.table_label || row.kind}</title>
      <style>body{font-family:system-ui;text-align:center;padding:40px}h1{font-size:28px;margin:0 0 8px}h2{font-size:42px;margin:0 0 24px;color:#f97316}img{width:360px;height:360px}p{color:#666;margin-top:16px}</style>
      </head><body>
      <h1>${storeName}</h1>
      <h2>${row.table_label || (row.kind === 'menu' ? 'Scan to order' : 'Takeaway')}</h2>
      <img src="${c.toDataURL('image/png')}" />
      <p>Scan with your phone camera</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold capitalize">{row.kind} {row.table_label ? `· ${row.table_label}` : ''}</p>
            <p className="text-xs text-muted-foreground">{row.scans_count} scans</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
        <div className="bg-white rounded-md p-3 flex justify-center">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-[10px] text-muted-foreground break-all">{fullUrl}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={download}><Download className="h-4 w-4 mr-1.5" />PNG</Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={print}>Print</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodes;
