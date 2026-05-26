import { useState, useRef } from 'react';
import { useCategories, type Category } from '@/hooks/useCategories';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronRight, Edit2, Check, X, FolderTree, ImagePlus, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const CategoryImage = ({ cat }: { cat: Category }) => {
  const { store } = useStore();
  const { updateCategory } = useCategories();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (file: File) => {
    if (!store?.id) return;
    if (!file.type.startsWith('image/')) return toast.error('Pick an image');
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5MB');
    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error('Not signed in');
      const ext = file.name.split('.').pop() || 'jpg';
      // store-assets RLS requires first folder = auth.uid()
      const path = `${userData.user.id}/categories/${store.id}/${cat.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      await updateCategory.mutateAsync({ id: cat.id, image_url: data.publicUrl });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    await updateCategory.mutateAsync({ id: cat.id, image_url: null });
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="h-10 w-10 rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center hover:bg-muted transition"
        title={cat.image_url ? 'Change image' : 'Add image'}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : cat.image_url ? (
          <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {cat.image_url && (
        <button
          type="button"
          onClick={remove}
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          title="Remove image"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

const CategoryDescription = ({ cat }: { cat: Category }) => {
  const { updateCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(cat.description ?? '');
  const hasDesc = !!(cat.description && cat.description.trim());
  const save = async () => {
    await updateCategory.mutateAsync({ id: cat.id, description: value.trim() || null });
    setOpen(false);
  };
  return (
    <div className="mt-2 ml-7">
      {!open ? (
        <button
          type="button"
          onClick={() => { setValue(cat.description ?? ''); setOpen(true); }}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <FileText className="h-3 w-3" />
          {hasDesc ? <span className="line-clamp-1 max-w-xl text-left">{cat.description}</span> : <span>Add description (shown on collection page)</span>}
        </button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder="Short description that customers see on the collection page (e.g. Freshly brewed espresso, lattes, and cold brew — all single-origin beans.)"
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={updateCategory.isPending}>
              <Check className="mr-1 h-3 w-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const Categories = () => {
  const { parentCategories, getSubcategories, createCategory, updateCategory, deleteCategory, loading } = useCategories();
  const [newParent, setNewParent] = useState('');
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const addParent = () => {
    const name = newParent.trim();
    if (!name) return toast.error('Enter a category name');
    createCategory.mutate({ name });
    setNewParent('');
  };

  const addSub = (parentId: string) => {
    const name = (newSub[parentId] || '').trim();
    if (!name) return toast.error('Enter a subcategory name');
    createCategory.mutate({ name, parent_id: parentId });
    setNewSub((s) => ({ ...s, [parentId]: '' }));
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCategory.mutate({ id: editingId, name: editName.trim() });
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Create categories with photos. They appear in your store's "Shop by category" section and filter the shop page.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newParent}
              onChange={(e) => setNewParent(e.target.value)}
              placeholder="e.g. Coffee, Sandwiches"
              onKeyDown={(e) => e.key === 'Enter' && addParent()}
            />
            <Button data-tour="cats-new" onClick={addParent} disabled={createCategory.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            After adding, click the image tile to upload a photo for that category.
          </p>
        </CardContent>
      </Card>

      {parentCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderTree className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No categories yet. Add your first category above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {parentCategories.map((parent) => {
            const subs = getSubcategories(parent.id);
            const isExpanded = expandedParent === parent.id;
            return (
              <Card key={parent.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                      className="shrink-0"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    <CategoryImage cat={parent} />

                    {editingId === parent.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-sm">{parent.name}</span>
                        <Badge variant="secondary" className="text-xs">{subs.length} sub</Badge>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(parent.id, parent.name)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteCategory.mutate(parent.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  <CategoryDescription cat={parent} />

                  {isExpanded && (
                    <div className="mt-3 ml-6 space-y-2 border-l-2 border-muted pl-4">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <CategoryImage cat={sub} />
                          {editingId === sub.id ? (
                            <div className="flex flex-1 items-center gap-2">
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm" autoFocus />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{sub.name}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(sub.id, sub.name)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteCategory.mutate(sub.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newSub[parent.id] || ''}
                          onChange={(e) => setNewSub((s) => ({ ...s, [parent.id]: e.target.value }))}
                          placeholder="Add subcategory..."
                          className="h-8 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && addSub(parent.id)}
                        />
                        <Button size="sm" variant="secondary" onClick={() => addSub(parent.id)} className="h-8">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Categories;
