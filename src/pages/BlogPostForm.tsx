import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useBlogPostById, useCreateBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Loader2, Save, ImagePlus, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';

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
  const [thumbnailImage, setThumbnailImage] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<'cover' | 'thumbnail' | null>(null);
  const coverGalleryRef = useRef<HTMLInputElement>(null);
  const coverCameraRef = useRef<HTMLInputElement>(null);
  const thumbGalleryRef = useRef<HTMLInputElement>(null);
  const thumbCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setBody(existing.body || '');
      setCoverImage(existing.cover_image || '');
      setThumbnailImage((existing as any).thumbnail_image || '');
      setIsPublished(existing.is_published);
      setSeoTitle(existing.seo_title || '');
      setSeoDescription(existing.seo_description || '');
    }
  }, [existing]);

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

  const handleImageFile = async (
    file: File | null | undefined,
    field: 'cover' | 'thumbnail'
  ) => {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { toast.error('Image must be under 30 MB'); return; }
    setUploadingField(field);
    try {
      const compressed = await compressImage(file, {
        maxWidth: field === 'thumbnail' ? 800 : 1600,
        maxHeight: field === 'thumbnail' ? 800 : 1600,
        maxSizeMB: field === 'thumbnail' ? 0.5 : 1.2,
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `${user.id}/blog/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('store-assets')
        .upload(path, compressed, { contentType: compressed.type, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(path);
      if (field === 'cover') setCoverImage(publicUrl); else setThumbnailImage(publicUrl);
      toast.success(`${field === 'cover' ? 'Main image' : 'Thumbnail'} uploaded`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingField(null);
      [coverGalleryRef, coverCameraRef, thumbGalleryRef, thumbCameraRef].forEach(r => {
        if (r.current) r.current.value = '';
      });
    }
  };

  const handleSave = async () => {
    if (!store || !title || !slug) { toast.error('Title and slug are required'); return; }
    const payload = {
      title, slug, body,
      cover_image: coverImage || null,
      thumbnail_image: thumbnailImage || null,
      is_published: isPublished,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
    };

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
        <Button variant="ghost" size="icon" onClick={() => navigate('/blog-posts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Post' : 'New Blog Post'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4 mt-4">
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

              {/* Image picker — reusable for both fields */}
              {(['thumbnail', 'cover'] as const).map((field) => {
                const value = field === 'cover' ? coverImage : thumbnailImage;
                const setValue = field === 'cover' ? setCoverImage : setThumbnailImage;
                const galleryRef = field === 'cover' ? coverGalleryRef : thumbGalleryRef;
                const cameraRef = field === 'cover' ? coverCameraRef : thumbCameraRef;
                const uploading = uploadingField === field;
                const label = field === 'cover' ? 'Main Image (post hero)' : 'Thumbnail (blog listing)';
                const hint = field === 'cover'
                  ? 'Wide image shown at the top of the post. Recommended 1600×900.'
                  : 'Square-ish image shown in the blog listing. Recommended 800×800. Falls back to main image if empty.';
                return (
                  <div key={field} className="space-y-2">
                    <Label>{label}</Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                    {value ? (
                      <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
                        <img src={value} alt={`${label} preview`} className="w-full max-h-64 object-cover" />
                        <button
                          type="button"
                          onClick={() => setValue('')}
                          className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow hover:bg-background"
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={cn(
                            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 py-6 transition-colors hover:border-primary/50 hover:bg-accent/50',
                            uploading && 'pointer-events-none opacity-60'
                          )}
                        >
                          {uploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <ImagePlus className="h-5 w-5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Upload from device</span>
                            </>
                          )}
                          <input
                            ref={galleryRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFile(e.target.files?.[0], field)}
                            disabled={uploading}
                          />
                        </label>
                        <label
                          className={cn(
                            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/5 py-6 transition-colors hover:bg-primary/10',
                            uploading && 'pointer-events-none opacity-60'
                          )}
                        >
                          <Camera className="h-5 w-5 text-primary" />
                          <span className="text-xs font-medium text-primary">Use camera</span>
                          <input
                            ref={cameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleImageFile(e.target.files?.[0], field)}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    )}
                    <Input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="…or paste an image URL"
                      className="text-xs"
                    />
                  </div>
                );
              })}

              <div className="flex items-center gap-3 pt-2">
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
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {coverImage && (
                <img src={coverImage} alt={title} className="w-full max-h-80 object-cover" />
              )}
              <article className="p-6 md:p-10 space-y-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {!isPublished && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-amber-800">Draft</span>}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                  {title || 'Untitled post'}
                </h1>
                {seoDescription && (
                  <p className="text-lg text-muted-foreground italic">{seoDescription}</p>
                )}
                <div className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {body || (
                    <span className="text-muted-foreground italic">
                      Start writing in the Edit tab to see the preview here.
                    </span>
                  )}
                </div>
              </article>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogPostForm;
