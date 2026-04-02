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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Plus, Trash2, Image, Type, ShoppingBag, Mail, Rows3, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const HeroImageUpload = ({ currentImage, onUploaded }: { currentImage: string; onUploaded: (url: string) => void }) => {
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md cursor-pointer hover:bg-accent transition-colors">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : 'Upload Image'}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
      </label>
      {currentImage && (
        <img src={currentImage} alt="Preview" className="h-10 rounded border object-cover" style={{ maxWidth: 80 }} />
      )}
    </div>
  );
};

export interface HomepageSection {
  id: string;
  type: 'hero' | 'featured_products' | 'category_grid' | 'text_block' | 'newsletter' | 'banner_carousel';
  title: string;
  subtitle: string;
  image: string;
  layout: string;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Banner', icon: Image },
  { value: 'featured_products', label: 'Featured Products', icon: ShoppingBag },
  { value: 'category_grid', label: 'Category Grid', icon: Rows3 },
  { value: 'text_block', label: 'Text / Image Block', icon: Type },
  { value: 'newsletter', label: 'Newsletter Signup', icon: Mail },
  { value: 'banner_carousel', label: 'Banner Carousel', icon: Image },
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

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </button>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold capitalize">{sectionMeta?.label || section.type}</span>
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
              {(section.type === 'hero' || section.type === 'text_block' || section.type === 'banner_carousel') && (
                <div className="space-y-1.5">
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
                  />
                </div>
              )}
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
}

const HomepageBuilder = ({ sections, onChange }: Props) => {
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
    const newSection: HomepageSection = {
      id: crypto.randomUUID(),
      type: addType as HomepageSection['type'],
      title: '',
      subtitle: '',
      image: '',
      layout: 'default',
    };
    onChange([...sections, newSection]);
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Drag sections to reorder your homepage layout.</p>
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
          <SelectTrigger className="w-48">
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
