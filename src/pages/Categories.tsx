import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronRight, Edit2, Check, X, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

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
        <p className="text-sm text-muted-foreground">Create categories and subcategories for your products</p>
      </div>

      {/* Add parent category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newParent}
              onChange={(e) => setNewParent(e.target.value)}
              placeholder="e.g. Fashion, Food, Electronics"
              onKeyDown={(e) => e.key === 'Enter' && addParent()}
            />
            <Button onClick={addParent} disabled={createCategory.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category list */}
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
                  {/* Parent row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                      className="shrink-0"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

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

                  {/* Subcategories */}
                  {isExpanded && (
                    <div className="mt-3 ml-6 space-y-2 border-l-2 border-muted pl-4">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2">
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
                      {/* Add subcategory */}
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
