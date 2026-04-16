import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2, Image, Type, ShoppingBag, Mail, Rows3, Upload, Loader2, X, Sparkles, Clock, MessageSquare, Award } from 'lucide-react';
import { toast } from 'sonner';
import { ICON_OPTIONS } from '@/components/storefront/TrustBadgeIcon';

const AIGenerateButton = ({ onGenerate, label = 'AI', loading }: { onGenerate: () => void; label?: string; loading?: boolean }) => (
  <button
    type="button"
    onClick={onGenerate}
    disabled={loading}
    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 disabled:opacity-50 transition-all shrink-0"
    title="Generate with AI"
  >
    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
    {label}
  </button>
);

const useAIGen = () => {
  const { store } = useStore();
  const generate = useCallback(async (mode: 'image' | 'text', sectionType: string, current: { title?: string; subtitle?: string } = {}) => {
    const { data, error } = await supabase.functions.invoke('generate-section-content', {
      body: {
        mode,
        sectionType,
        storeName: store?.name,
        category: store?.category,
        currentTitle: current.title,
        currentSubtitle: current.subtitle,
      },
    });
    if (error) throw new Error(error.message);
    if ((data as any).error) throw new Error((data as any).error);
    return data as any;
  }, [store]);
  return generate;
};

const HeroImageUpload = ({ currentImage, onUploaded, sectionType, currentTitle, currentSubtitle }: { currentImage: string; onUploaded: (url: string) => void; sectionType: string; currentTitle?: string; currentSubtitle?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const generate = useAIGen();

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `hero/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      onUploaded(publicUrl);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const { imageUrl } = await generate('image', sectionType, { title: currentTitle, subtitle: currentSubtitle });
      if (!imageUrl) throw new Error('No image returned');
      // If imageUrl is base64, convert to blob and upload
      if (imageUrl.startsWith('data:')) {
        const blob = await (await fetch(imageUrl)).blob();
        const path = `hero/ai-${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/png' });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
        onUploaded(publicUrl);
      } else {
        onUploaded(imageUrl);
      }
      toast.success('AI image generated!');
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md cursor-pointer hover:bg-accent transition-colors">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : 'Upload Image'}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
      </label>
      <AIGenerateButton onGenerate={handleAI} loading={aiLoading} label="Generate Image" />
      {currentImage && (
        <img src={currentImage} alt="Preview" className="h-10 rounded border object-cover" style={{ maxWidth: 80 }} />
      )}
    </div>
  );
};

export interface Testimonial {
  name: string;
  rating: number;
  quote: string;
  avatar?: string;
}

export interface TrustBadge {
  icon: string;
  label: string;
  sub?: string;
}

export interface HomepageSection {
  id: string;
  type: 'hero' | 'featured_products' | 'category_grid' | 'text_block' | 'newsletter' | 'banner_carousel' | 'testimonials' | 'trust_badges' | 'countdown_timer' | 'image_with_text' | 'collection_showcase' | 'announcement_bar' | 'instagram_feed' | 'brand_marquee';
  title: string;
  subtitle: string;
  image: string;
  images?: string[];
  isSlider?: boolean;
  layout: string;
  height?: 'small' | 'medium' | 'large' | 'xl' | 'cover' | 'full' | 'custom';
  customHeightPx?: number;
  topMargin?: number;
  animation?: 'none' | 'fade-in' | 'slide-up' | 'slide-in-left' | 'slide-in-right' | 'scale-in' | 'parallax' | 'blur-in' | 'flip-up' | 'bounce-in';
  animationSpeed?: 'slow' | 'normal' | 'fast' | number;
  marginTop?: number;
  marginBottom?: number;
  paddingX?: number;
  paddingY?: number;
  // Section-specific
  testimonials?: Testimonial[];
  trustBadges?: TrustBadge[];
  trustBadgeStyle?: 'circle' | 'square' | 'rounded' | 'minimal';
  countdownDate?: string; // ISO
  brands?: string[];
  announcementText?: string;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Banner', icon: Image },
  { value: 'featured_products', label: 'Featured Products', icon: ShoppingBag },
  { value: 'category_grid', label: 'Category Grid', icon: Rows3 },
  { value: 'text_block', label: 'Text / Image Block', icon: Type },
  { value: 'newsletter', label: 'Newsletter Signup', icon: Mail },
  { value: 'banner_carousel', label: 'Banner Carousel', icon: Image },
  { value: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { value: 'trust_badges', label: 'Trust Badges', icon: Award },
  { value: 'countdown_timer', label: 'Countdown / Sale Timer', icon: Clock },
  { value: 'image_with_text', label: 'Image with Text', icon: Image },
  { value: 'collection_showcase', label: 'Collection Showcase', icon: Rows3 },
  { value: 'announcement_bar', label: 'Announcement Bar', icon: Type },
  { value: 'brand_marquee', label: 'Brand Marquee', icon: Type },
] as const;

const SortableSection = ({
  section,
  onUpdate,
  onRemove,
}: {
  section: HomepageSection;
  onUpdate: (s: HomepageSection) => void;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const sectionMeta = SECTION_TYPES.find((t) => t.value === section.type);
  const Icon = sectionMeta?.icon || Type;
  const [titleAILoading, setTitleAILoading] = useState(false);
  const generate = useAIGen();

  const handleAIText = async () => {
    setTitleAILoading(true);
    try {
      const { title, subtitle } = await generate('text', section.type, { title: section.title, subtitle: section.subtitle });
      onUpdate({ ...section, title: title || section.title, subtitle: subtitle || section.subtitle });
      toast.success('AI copy generated!');
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed');
    } finally {
      setTitleAILoading(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </button>
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold capitalize">{sectionMeta?.label || section.type}</span>
                </div>
                <AIGenerateButton onGenerate={handleAIText} loading={titleAILoading} label="AI Copy" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={section.title}
                    onChange={(e) => onUpdate({ ...section, title: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="Section title"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subtitle</Label>
                  <Input
                    value={section.subtitle}
                    onChange={(e) => onUpdate({ ...section, subtitle: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="Optional subtitle"
                  />
                </div>
              </div>

              {section.type === 'announcement_bar' && (
                <div>
                  <Label className="text-xs">Announcement Text</Label>
                  <Input
                    value={section.announcementText || ''}
                    onChange={(e) => onUpdate({ ...section, announcementText: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="🎉 Free shipping on orders above ₹999!"
                  />
                </div>
              )}

              {(section.type === 'hero' || section.type === 'text_block' || section.type === 'banner_carousel' || section.type === 'image_with_text') && (
                <div className="space-y-1.5">
                  {section.type === 'hero' && (
                    <div className="flex items-center gap-3 mb-2">
                      <Label className="text-xs font-medium">Mode:</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Static</span>
                        <Switch
                          checked={section.isSlider || false}
                          onCheckedChange={(checked) => onUpdate({ ...section, isSlider: checked, images: checked ? (section.images?.length ? section.images : (section.image ? [section.image] : [])) : section.images })}
                        />
                        <span className="text-xs text-muted-foreground">Slider</span>
                      </div>
                    </div>
                  )}

                  {section.type === 'hero' && section.isSlider ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Slider Images (Recommended: 1920×600px)</Label>
                      <div className="flex flex-wrap gap-2">
                        {(section.images || []).map((img, imgIdx) => (
                          <div key={imgIdx} className="relative group">
                            <img src={img} alt={`Slide ${imgIdx + 1}`} className="h-16 w-24 rounded border object-cover" />
                            <button
                              onClick={() => {
                                const newImages = [...(section.images || [])];
                                newImages.splice(imgIdx, 1);
                                onUpdate({ ...section, images: newImages });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md cursor-pointer hover:bg-accent transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        Add Slides
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            for (const file of files) {
                              const ext = file.name.split('.').pop();
                              const path = `hero/${crypto.randomUUID()}.${ext}`;
                              const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
                              if (error) { toast.error('Upload failed'); continue; }
                              const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
                              onUpdate({ ...section, images: [...(section.images || []), publicUrl] });
                            }
                            toast.success('Images uploaded!');
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <Label className="text-xs">Image {section.type === 'hero' ? '(Recommended: 1920×600px)' : '(Recommended: 1200×400px)'}</Label>
                      <div className="flex gap-2 items-start">
                        <Input
                          value={section.image}
                          onChange={(e) => onUpdate({ ...section, image: e.target.value })}
                          className="h-8 text-sm flex-1"
                          placeholder="Paste URL or upload below"
                        />
                      </div>
                      <HeroImageUpload
                        currentImage={section.image}
                        onUploaded={(url) => onUpdate({ ...section, image: url })}
                        sectionType={section.type}
                        currentTitle={section.title}
                        currentSubtitle={section.subtitle}
                      />
                    </>
                  )}
                </div>
              )}

              {section.type === 'hero' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Banner Height</Label>
                    <Select value={section.height || 'medium'} onValueChange={(v) => onUpdate({ ...section, height: v as HomepageSection['height'] })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (250px)</SelectItem>
                        <SelectItem value="medium">Medium (400px)</SelectItem>
                        <SelectItem value="large">Large (550px)</SelectItem>
                        <SelectItem value="xl">Extra Large (720px)</SelectItem>
                        <SelectItem value="cover">Cover (100vh)</SelectItem>
                        <SelectItem value="full">Full Image (no crop)</SelectItem>
                        <SelectItem value="custom">Custom (px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {section.height === 'custom' ? (
                    <div>
                      <Label className="text-xs">Custom Height (px)</Label>
                      <Input type="number" min={100} max={1200} value={section.customHeightPx ?? 500} onChange={(e) => onUpdate({ ...section, customHeightPx: Number(e.target.value) })} className="h-8 text-sm" />
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">Top Spacing (px)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        value={section.topMargin ?? 0}
                        onChange={(e) => onUpdate({ ...section, topMargin: Number(e.target.value) })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Testimonials editor */}
              {section.type === 'testimonials' && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-semibold">Testimonials</Label>
                  {(section.testimonials || []).map((t, ti) => (
                    <div key={ti} className="grid grid-cols-12 gap-2 items-start p-2 border rounded">
                      <Input value={t.avatar || ''} onChange={(e) => {
                        const arr = [...(section.testimonials || [])]; arr[ti] = { ...t, avatar: e.target.value };
                        onUpdate({ ...section, testimonials: arr });
                      }} placeholder="Avatar URL or emoji" className="col-span-2 h-8 text-xs" />
                      <Input value={t.name} onChange={(e) => {
                        const arr = [...(section.testimonials || [])]; arr[ti] = { ...t, name: e.target.value };
                        onUpdate({ ...section, testimonials: arr });
                      }} placeholder="Name" className="col-span-3 h-8 text-xs" />
                      <Input type="number" min={1} max={5} value={t.rating} onChange={(e) => {
                        const arr = [...(section.testimonials || [])]; arr[ti] = { ...t, rating: Number(e.target.value) };
                        onUpdate({ ...section, testimonials: arr });
                      }} placeholder="★" className="col-span-1 h-8 text-xs" />
                      <Input value={t.quote} onChange={(e) => {
                        const arr = [...(section.testimonials || [])]; arr[ti] = { ...t, quote: e.target.value };
                        onUpdate({ ...section, testimonials: arr });
                      }} placeholder="Quote" className="col-span-5 h-8 text-xs" />
                      <button onClick={() => {
                        const arr = [...(section.testimonials || [])]; arr.splice(ti, 1);
                        onUpdate({ ...section, testimonials: arr });
                      }} className="col-span-1 text-destructive text-xs">✕</button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => onUpdate({ ...section, testimonials: [...(section.testimonials || []), { name: '', rating: 5, quote: '', avatar: '👤' }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Testimonial
                  </Button>
                </div>
              )}

              {/* Trust badges editor */}
              {section.type === 'trust_badges' && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Trust Badges</Label>
                    <Select value={section.trustBadgeStyle || 'circle'} onValueChange={(v) => onUpdate({ ...section, trustBadgeStyle: v as any })}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(section.trustBadges || []).map((b, bi) => (
                    <div key={bi} className="grid grid-cols-12 gap-2 items-start p-2 border rounded">
                      <Select value={b.icon} onValueChange={(v) => {
                        const arr = [...(section.trustBadges || [])]; arr[bi] = { ...b, icon: v };
                        onUpdate({ ...section, trustBadges: arr });
                      }}>
                        <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ICON_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={b.label} onChange={(e) => {
                        const arr = [...(section.trustBadges || [])]; arr[bi] = { ...b, label: e.target.value };
                        onUpdate({ ...section, trustBadges: arr });
                      }} placeholder="Label" className="col-span-4 h-8 text-xs" />
                      <Input value={b.sub || ''} onChange={(e) => {
                        const arr = [...(section.trustBadges || [])]; arr[bi] = { ...b, sub: e.target.value };
                        onUpdate({ ...section, trustBadges: arr });
                      }} placeholder="Sub-text (optional)" className="col-span-4 h-8 text-xs" />
                      <button onClick={() => {
                        const arr = [...(section.trustBadges || [])]; arr.splice(bi, 1);
                        onUpdate({ ...section, trustBadges: arr });
                      }} className="col-span-1 text-destructive text-xs">✕</button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => onUpdate({ ...section, trustBadges: [...(section.trustBadges || []), { icon: 'shield', label: 'New Badge' }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Badge
                  </Button>
                </div>
              )}

              {/* Countdown date */}
              {section.type === 'countdown_timer' && (
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs font-semibold">Sale Ends At</Label>
                  <Input
                    type="datetime-local"
                    value={section.countdownDate ? new Date(section.countdownDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => onUpdate({ ...section, countdownDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Timer counts down to this date/time. Leave blank to show 00:00:00:00.</p>
                </div>
              )}

              {/* Brands */}
              {section.type === 'brand_marquee' && (
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs font-semibold">Brand Names (one per line)</Label>
                  <Textarea
                    value={(section.brands || []).join('\n')}
                    onChange={(e) => onUpdate({ ...section, brands: e.target.value.split('\n').filter(Boolean) })}
                    rows={4}
                    className="text-sm"
                    placeholder="Vogue&#10;Elle&#10;Harper's Bazaar"
                  />
                </div>
              )}

              {/* Animation & Spacing controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-xs">Animation</Label>
                  <Select value={section.animation || 'none'} onValueChange={(v) => onUpdate({ ...section, animation: v as HomepageSection['animation'] })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade-in">Fade In</SelectItem>
                      <SelectItem value="slide-up">Slide Up</SelectItem>
                      <SelectItem value="slide-in-left">Slide In Left</SelectItem>
                      <SelectItem value="slide-in-right">Slide In Right</SelectItem>
                      <SelectItem value="scale-in">Scale In</SelectItem>
                      <SelectItem value="blur-in">Blur In</SelectItem>
                      <SelectItem value="flip-up">Flip Up</SelectItem>
                      <SelectItem value="bounce-in">Bounce In</SelectItem>
                      <SelectItem value="parallax">Parallax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Animation Speed</Label>
                  <Select
                    value={typeof section.animationSpeed === 'number' ? 'custom' : (section.animationSpeed || 'normal')}
                    onValueChange={(v) => onUpdate({ ...section, animationSpeed: v === 'custom' ? 600 : (v as 'slow' | 'normal' | 'fast') })}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow (1.2s)</SelectItem>
                      <SelectItem value="normal">Normal (0.6s)</SelectItem>
                      <SelectItem value="fast">Fast (0.3s)</SelectItem>
                      <SelectItem value="custom">Custom (ms)</SelectItem>
                    </SelectContent>
                  </Select>
                  {typeof section.animationSpeed === 'number' && (
                    <Input type="number" min={100} max={3000} value={section.animationSpeed} onChange={(e) => onUpdate({ ...section, animationSpeed: Number(e.target.value) })} className="h-7 text-xs mt-1" />
                  )}
                </div>
                <div>
                  <Label className="text-xs">Layout</Label>
                  <Select value={section.layout || 'default'} onValueChange={(v) => onUpdate({ ...section, layout: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="full-width">Full Width</SelectItem>
                      <SelectItem value="grid-2">Grid 2</SelectItem>
                      <SelectItem value="grid-3">Grid 3</SelectItem>
                      <SelectItem value="grid-4">Grid 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Margin Top (px)</Label>
                  <Input type="number" min={0} max={200} value={section.marginTop ?? 0} onChange={(e) => onUpdate({ ...section, marginTop: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Margin Bottom (px)</Label>
                <Input type="number" min={0} max={200} value={section.marginBottom ?? 0} onChange={(e) => onUpdate({ ...section, marginBottom: Number(e.target.value) })} className="h-8 text-sm" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface Props {
  sections: HomepageSection[];
  onChange: (sections: HomepageSection[]) => void;
  showAllProductsGrid?: boolean;
  onShowAllProductsGridChange?: (v: boolean) => void;
}

const HomepageBuilder = ({ sections, onChange, showAllProductsGrid, onShowAllProductsGridChange }: Props) => {
  const [addType, setAddType] = useState<string>('hero');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      onChange(arrayMove(sections, oldIndex, newIndex));
    }
  };

  const addSection = () => {
    const seed: Partial<HomepageSection> = { id: crypto.randomUUID(), type: addType as any, title: '', subtitle: '', image: '', layout: 'default' };
    if (addType === 'testimonials') seed.testimonials = [
      { name: 'Happy Customer', rating: 5, quote: 'Absolutely love the quality!', avatar: '👩' },
      { name: 'Regular Buyer', rating: 5, quote: 'Fast delivery and great service!', avatar: '👨' },
    ];
    if (addType === 'trust_badges') seed.trustBadges = [
      { icon: 'truck', label: 'Free Shipping', sub: 'On orders ₹499+' },
      { icon: 'shield', label: 'Secure Payment', sub: '100% protected' },
      { icon: 'return', label: 'Easy Returns', sub: '7-day window' },
      { icon: 'headphones', label: '24/7 Support', sub: 'We are here' },
    ];
    if (addType === 'countdown_timer') seed.countdownDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    onChange([...sections, seed as HomepageSection]);
  };

  const updateSection = (index: number, updated: HomepageSection) => {
    const next = [...sections];
    next[index] = updated;
    onChange(next);
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Drag sections to reorder your homepage layout.</p>
        {onShowAllProductsGridChange && (
          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md">
            <Switch checked={showAllProductsGrid !== false} onCheckedChange={onShowAllProductsGridChange} />
            <Label className="text-xs">Show "All Products" grid before footer</Label>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, i) => (
            <SortableSection
              key={section.id}
              section={section}
              onUpdate={(s) => updateSection(i, s)}
              onRemove={() => removeSection(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <p className="text-sm">No sections yet. Add one below to start building your homepage.</p>
        </div>
      )}

      <div className="flex gap-2">
        <Select value={addType} onValueChange={setAddType}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={addSection} variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add Section
        </Button>
      </div>
    </div>
  );
};

export default HomepageBuilder;
