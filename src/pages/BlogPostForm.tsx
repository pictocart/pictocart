import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useBlogPostById, useCreateBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const BlogPostForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { store } = useStore();
  const isEdit = !!id && id !== 'new';
  const { data: existing } = useBlogPostById(isEdit ? id : undefined);
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setBody(existing.body || '');
      setCoverImage(existing.cover_image || '');
      setIsPublished(existing.is_published);
      setSeoTitle(existing.seo_title || '');
      setSeoDescription(existing.seo_description || '');
    }
  }, [existing]);

  const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit) setSlug(generateSlug(val));
  };

  const handleAIGenerate = async () => {
    if (!title) { toast.error('Enter a title first'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog', {
        body: { topic: title, store_name: store?.name, category: store?.category },
      });
      if (error) throw error;
      if (data?.body) setBody(data.body);
      if (data?.seo_description) setSeoDescription(data.seo_description);
      toast.success('Blog content generated!');
    } catch {
      toast.error('AI generation failed');
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!store || !title || !slug) { toast.error('Title and slug are required'); return; }
    const payload = { title, slug, body, cover_image: coverImage || null, is_published: isPublished, seo_title: seoTitle || null, seo_description: seoDescription || null };

    if (isEdit) {
      updateMutation.mutate(
        { id, ...payload },
        { onSuccess: () => { toast.success('Post updated!'); navigate('/blog-posts'); }, onError: () => toast.error('Failed to save') }
      );
    } else {
      createMutation.mutate(
        { store_id: store.id, ...payload },
        { onSuccess: () => { toast.success('Post created!'); navigate('/blog-posts'); }, onError: () => toast.error('Failed to create') }
      );
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/blog-posts')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Post' : 'New Blog Post'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Blog post title" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="blog-post-slug" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Content</Label>
              <Button variant="outline" size="sm" onClick={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {aiLoading ? 'Generating...' : 'AI Write'}
              </Button>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} placeholder="Write your blog post content..." className="font-mono text-sm" />
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <Label>Published</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">SEO Title</Label>
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO title (optional)" />
          </div>
          <div>
            <Label className="text-xs">SEO Description</Label>
            <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} placeholder="Meta description for search engines" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogPostForm;
