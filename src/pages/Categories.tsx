import { useState, useRef } from 'react';
import { useCategories, type Category } from '@/hooks/useCategories';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronRight, Edit2, Check, X, FolderTree, ImagePlus, Loader2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';

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

  const queryClient = useQueryClient();
  const { store } = useStore();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(cell.trim());
          cell = '';
        } else if (c === '\n' || c === '\r') {
          row.push(cell.trim());
          if (row.length > 0 && row.some(x => x !== '')) {
            result.push(row);
          }
          row = [];
          cell = '';
          if (c === '\r' && next === '\n') i++;
        } else {
          cell += c;
        }
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.length > 0 && row.some(x => x !== '')) result.push(row);
    }
    return result;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!store?.id) return toast.error("Store not loaded.");

    setCsvUploading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("CSV file is empty");

        const parsed = parseCSV(text);
        if (parsed.length <= 1) throw new Error("CSV must contain a header row and at least one category row");

        const headers = parsed[0].map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
        const rows = parsed.slice(1);

        const nameIndex = headers.findIndex(h => h === 'name' || h === 'category name');
        const parentIndex = headers.findIndex(h => h === 'parent' || h === 'parent category' || h === 'parent_category');
        const descIndex = headers.findIndex(h => h === 'description');
        const imgIndex = headers.findIndex(h => h === 'image url' || h === 'image_url' || h === 'image');

        if (nameIndex === -1) throw new Error("CSV must contain a 'Name' column");

        const { data: existingCats, error: fetchErr } = await supabase
          .from('categories')
          .select('id, name, parent_id')
          .eq('store_id', store.id);

        if (fetchErr) throw fetchErr;

        const nameToIdMap = new Map<string, string>();
        existingCats?.forEach(c => {
          nameToIdMap.set(c.name.toLowerCase().trim(), c.id);
        });
        
        const categoryData = rows.map((row, idx) => {
          const name = row[nameIndex]?.trim();
          const parentName = parentIndex !== -1 ? row[parentIndex]?.trim() : '';
          const description = descIndex !== -1 ? row[descIndex]?.trim() : '';
          const imageUrl = imgIndex !== -1 ? row[imgIndex]?.trim() : '';
          
          if (!name) throw new Error(`Row ${idx + 2}: Name is required`);
          
          return { name, parentName, description, imageUrl };
        });

        for (const item of categoryData) {
          if (item.parentName) {
            const parentKey = item.parentName.toLowerCase().trim();
            if (!nameToIdMap.has(parentKey)) {
              const { data: newParent, error: pErr } = await supabase
                .from('categories')
                .insert({
                  store_id: store.id,
                  name: item.parentName,
                  parent_id: null
                })
                .select()
                .single();
                
              if (pErr) throw pErr;
              nameToIdMap.set(parentKey, newParent.id);
            }
          }
        }

        const categoriesToInsert: any[] = [];
        for (const item of categoryData) {
          const key = item.name.toLowerCase().trim();
          if (nameToIdMap.has(key)) {
            continue;
          }
          
          const parentId = item.parentName ? nameToIdMap.get(item.parentName.toLowerCase().trim()) || null : null;
          
          categoriesToInsert.push({
            store_id: store.id,
            name: item.name,
            parent_id: parentId,
            description: item.description || null,
            image_url: item.imageUrl || null
          });
        }

        if (categoriesToInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('categories')
            .insert(categoriesToInsert);
            
          if (insErr) throw insErr;
          toast.success(`Successfully uploaded ${categoriesToInsert.length} new categories!`);
        } else {
          toast.info("All categories in the CSV already exist.");
        }

        queryClient.invalidateQueries({ queryKey: ['categories', store.id] });
        setBulkDialogOpen(false);
      } catch (err: any) {
        console.error("Categories bulk upload error:", err);
        toast.error(err.message || "Failed to process CSV file");
      } finally {
        setCsvUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read CSV file");
      setCsvUploading(false);
    };

    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const csvContent = "Name,Parent Category,Description,Image URL\n" +
      '"Mobiles","Electronics","Vibrant high resolution display smartphones",""\n' +
      '"Laptops","Electronics","Powerful laptops for creators and office use",""\n' +
      '"Espresso","Coffee","Freshly brewed single origin coffee cups",""\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "categories_sample.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Create categories with photos. They appear in your store's "Shop by category" section and filter the shop page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-1">
          <Download className="h-4 w-4" /> Bulk Upload
        </Button>
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

      {/* Categories Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Categories</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing multiple categories to import them in bulk.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-slate-700">Supported columns in CSV:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><span className="font-semibold text-slate-700">Name</span> (required) — e.g. "Mobiles"</li>
                <li><span className="font-semibold text-slate-700">Parent Category</span> — optional, e.g. "Electronics"</li>
                <li><span className="font-semibold text-slate-700">Description</span> — optional, details about category</li>
                <li><span className="font-semibold text-slate-700">Image URL</span> — optional, URL of the category banner photo</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700">Step 1: Download Template</span>
              <Button type="button" variant="outline" size="sm" onClick={downloadSampleCSV} className="gap-1 text-xs">
                <Download className="h-3.5 w-3.5" /> Download Sample CSV
              </Button>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <span className="text-sm font-medium text-slate-700 block">Step 2: Upload CSV File</span>
              <label 
                htmlFor="category-csv-file-upload"
                className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:bg-slate-50 transition-colors ${csvUploading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {csvUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground mt-1">Uploading categories...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <span className="text-xs text-muted-foreground mt-1">CSV files only, up to 10MB</span>
                    </>
                  )}
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={csvUploading}
                  className="hidden" 
                  id="category-csv-file-upload" 
                />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)} disabled={csvUploading}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
