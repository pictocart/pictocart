import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Sparkles } from 'lucide-react';
import type { PromoTickerConfig } from '@/components/storefront/PromoTicker';

export const DEFAULT_PROMO_TICKER: PromoTickerConfig = {
  enabled: false,
  messages: [
    '🔥 Limited time — Free shipping on all orders above ₹499',
    '🎁 Use code WELCOME10 for 10% off your first order',
    '⚡ Fast all-India delivery in 3-5 days',
  ],
  bg_color: '#111827',
  text_color: '#ffffff',
  link_url: '',
  link_label: 'Shop now',
  dismissible: false,
  speed: 30,
};

interface Props {
  config: PromoTickerConfig;
  onChange: (next: PromoTickerConfig) => void;
}

const PROMO_PRESETS = [
  '🔥 Limited time — Free shipping on all orders above ₹499',
  '🎁 Use code WELCOME10 for 10% off your first order',
  '⚡ Same-day dispatch on all orders placed before 4 PM',
  '✨ New collection just dropped — shop the latest arrivals',
  '🚚 Free returns within 7 days, no questions asked',
  '💸 Cash on Delivery available across India',
];

const PromoTickerEditor = ({ config, onChange }: Props) => {
  const cfg = { ...DEFAULT_PROMO_TICKER, ...config };
  const update = (patch: Partial<PromoTickerConfig>) => onChange({ ...cfg, ...patch });
  const messagesText = (cfg.messages || []).join('\n');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Promotional Ticker
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            A scrolling announcement bar at the top of your store. Great for offers, free shipping, or new arrivals — drives immediate conversions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Show ticker on storefront</Label>
              <p className="text-xs text-muted-foreground">Visible to all customers</p>
            </div>
            <Switch checked={cfg.enabled !== false} onCheckedChange={(v) => update({ enabled: v })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Messages (one per line)</Label>
            <Textarea
              rows={4}
              value={messagesText}
              onChange={(e) => update({ messages: e.target.value.split('\n') })}
              placeholder="Free shipping above ₹499"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PROMO_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ messages: [...(cfg.messages || []), p] })}
                  className="text-[11px] px-2 py-1 rounded-full border bg-muted/40 hover:bg-muted transition inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> {p.length > 40 ? p.slice(0, 38) + '…' : p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Background color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={cfg.bg_color} onChange={(e) => update({ bg_color: e.target.value })} className="h-9 w-9 rounded border cursor-pointer" />
                <Input value={cfg.bg_color} onChange={(e) => update({ bg_color: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={cfg.text_color} onChange={(e) => update({ text_color: e.target.value })} className="h-9 w-9 rounded border cursor-pointer" />
                <Input value={cfg.text_color} onChange={(e) => update({ text_color: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Call-to-action link (optional)</Label>
              <Input value={cfg.link_url || ''} onChange={(e) => update({ link_url: e.target.value })} placeholder="/products or https://…" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CTA label</Label>
              <Input value={cfg.link_label || ''} onChange={(e) => update({ link_label: e.target.value })} placeholder="Shop now" className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Scroll speed: {cfg.speed}s per loop</Label>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={cfg.speed}
                onChange={(e) => update({ speed: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center justify-between w-full">
                <Label className="text-xs">Allow dismiss</Label>
                <Switch checked={!!cfg.dismissible} onCheckedChange={(v) => update({ dismissible: v })} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="mt-2 rounded-md overflow-hidden border">
              <div
                className="text-xs font-medium overflow-hidden"
                style={{ backgroundColor: cfg.bg_color, color: cfg.text_color }}
              >
                <div className="flex items-center gap-3 px-4 py-1.5">
                  <Megaphone className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <div className="flex-1 overflow-hidden whitespace-nowrap">
                    <div className="inline-flex gap-8 animate-[ptpreview_20s_linear_infinite]">
                      {(cfg.messages || []).filter(Boolean).map((m, i) => (
                        <span key={i}>• {m}</span>
                      ))}
                    </div>
                  </div>
                  {cfg.link_label && <span className="underline text-[11px] font-semibold">{cfg.link_label}</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromoTickerEditor;
