import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface FooterConfig {
  custom_text: string;
  show_powered_by: boolean;
  background_color: string;
  text_color: string;
  background_image: string;
  background_opacity: number;
  social_links: {
    instagram: string;
    facebook: string;
    twitter: string;
    youtube: string;
  };
  custom_links: { label: string; href: string }[];
}

const DEFAULT_FOOTER: FooterConfig = {
  custom_text: '',
  show_powered_by: true,
  background_color: '',
  text_color: '',
  background_image: '',
  background_opacity: 30,
  social_links: { instagram: '', facebook: '', twitter: '', youtube: '' },
  custom_links: [],
};

interface Props {
  config: FooterConfig;
  onChange: (c: FooterConfig) => void;
}

const FooterEditor = ({ config, onChange }: Props) => {
  const c = { ...DEFAULT_FOOTER, ...config };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Footer Text</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Custom Footer Text</Label>
            <Input value={c.custom_text} onChange={(e) => onChange({ ...c, custom_text: e.target.value })} className="h-9" placeholder="Your tagline or copyright text" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={c.show_powered_by} onCheckedChange={(v) => onChange({ ...c, show_powered_by: v })} />
            <Label className="text-xs">Show "Powered by Antariksh Commerce"</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Social Media Links</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {(['instagram', 'facebook', 'twitter', 'youtube'] as const).map((platform) => (
            <div key={platform}>
              <Label className="text-xs capitalize">{platform}</Label>
              <Input
                value={c.social_links[platform]}
                onChange={(e) => onChange({ ...c, social_links: { ...c.social_links, [platform]: e.target.value } })}
                className="h-8 text-sm"
                placeholder={`https://${platform}.com/...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Custom Links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {c.custom_links.map((link, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={link.label}
                onChange={(e) => {
                  const links = [...c.custom_links];
                  links[i] = { ...links[i], label: e.target.value };
                  onChange({ ...c, custom_links: links });
                }}
                className="h-8 text-sm"
                placeholder="Privacy Policy"
              />
              <Input
                value={link.href}
                onChange={(e) => {
                  const links = [...c.custom_links];
                  links[i] = { ...links[i], href: e.target.value };
                  onChange({ ...c, custom_links: links });
                }}
                className="h-8 text-sm"
                placeholder="/privacy"
              />
              <button
                onClick={() => onChange({ ...c, custom_links: c.custom_links.filter((_, idx) => idx !== i) })}
                className="text-destructive text-xs shrink-0"
              >✕</button>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...c, custom_links: [...c.custom_links, { label: '', href: '' }] })}
            className="text-xs text-primary hover:underline"
          >+ Add link</button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FooterEditor;
export { DEFAULT_FOOTER };
