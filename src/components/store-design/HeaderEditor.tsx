import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FONT_OPTIONS } from '@/lib/themes';
import LogoUploader from './LogoUploader';

export interface HeaderConfig {
  logo_position: 'left' | 'center';
  show_store_name: boolean;
  nav_links: { label: string; href: string }[];
  nav_font?: string;
  nav_weight?: string;
  nav_gap?: number;
  logo_url?: string | null;
  logo_name?: string | null;
}

const DEFAULT_HEADER: HeaderConfig = {
  logo_position: 'left',
  show_store_name: true,
  nav_links: [
    { label: 'Home', href: '' },
    { label: 'Shop', href: '#products' },
    { label: 'Blog', href: '/blog' },
  ],
  nav_font: 'Inter',
  nav_weight: '500',
  nav_gap: 16,
};

const WEIGHT_OPTIONS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

interface Props {
  config: HeaderConfig;
  onChange: (c: HeaderConfig) => void;
}

import { useStore } from '@/hooks/useStore';

const HeaderEditor = ({ config, onChange }: Props) => {
  const { store } = useStore();
  // Auto-default logo to onboarding-uploaded store logo if header doesn't have one yet
  const c = {
    ...DEFAULT_HEADER,
    ...config,
    logo_url: config.logo_url ?? store?.logo_url ?? null,
  };

  const updateNavLink = (index: number, field: 'label' | 'href', value: string) => {
    const links = [...c.nav_links];
    links[index] = { ...links[index], [field]: value };
    onChange({ ...c, nav_links: links });
  };

  const addNavLink = () => {
    onChange({ ...c, nav_links: [...c.nav_links, { label: 'Link', href: '/' }] });
  };

  const removeNavLink = (index: number) => {
    onChange({ ...c, nav_links: c.nav_links.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Logo & Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <LogoUploader logoUrl={c.logo_url} logoName={c.logo_name} onSave={(url, name) => onChange({ ...c, logo_url: url, logo_name: name ?? null })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Logo Position</Label>
              <Select value={c.logo_position} onValueChange={(v: 'left' | 'center') => onChange({ ...c, logo_position: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={c.show_store_name} onCheckedChange={(v) => onChange({ ...c, show_store_name: v })} />
              <Label className="text-xs">Show store name beside logo</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Menu Style</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Font Family</Label>
              <Select value={c.nav_font || 'Inter'} onValueChange={(v) => onChange({ ...c, nav_font: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Font Weight</Label>
              <Select value={c.nav_weight || '500'} onValueChange={(v) => onChange({ ...c, nav_weight: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{WEIGHT_OPTIONS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Link Gap (px)</Label>
              <Input type="number" min={4} max={48} value={c.nav_gap ?? 16} onChange={(e) => onChange({ ...c, nav_gap: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Preview: <span style={{ fontFamily: c.nav_font, fontWeight: Number(c.nav_weight || 500) }}>Home &nbsp; Shop &nbsp; Blog</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Navigation Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {c.nav_links.map((link, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={link.label} onChange={(e) => updateNavLink(i, 'label', e.target.value)} className="h-8 text-sm" placeholder="Label" />
              <Input value={link.href} onChange={(e) => updateNavLink(i, 'href', e.target.value)} className="h-8 text-sm" placeholder="/path" />
              <button onClick={() => removeNavLink(i)} className="text-destructive text-xs shrink-0">✕</button>
            </div>
          ))}
          <button onClick={addNavLink} className="text-xs text-primary hover:underline">+ Add link</button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HeaderEditor;
export { DEFAULT_HEADER };
