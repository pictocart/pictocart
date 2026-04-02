import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useBlogPosts, useDeleteBlogPost } from '@/hooks/useBlogPosts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BlogPosts = () => {
  const { store } = useStore();
  const { data: posts = [], isLoading } = useBlogPosts(store?.id);
  const deleteMutation = useDeleteBlogPost();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Post deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
          <p className="text-sm text-muted-foreground">Create and manage blog content for your store</p>
        </div>
        <Link to="/blog-posts/new">
          <Button><Plus className="h-4 w-4 mr-1" /> New Post</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No blog posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start writing to engage your customers</p>
            <Link to="/blog-posts/new"><Button><Plus className="h-4 w-4 mr-1" /> Create First Post</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {post.cover_image && (
                  <img src={post.cover_image} alt="" className="h-16 w-24 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={post.is_published ? 'default' : 'secondary'}>
                  {post.is_published ? 'Published' : 'Draft'}
                </Badge>
                <div className="flex gap-1">
                  <Link to={`/blog-posts/${post.id}`}>
                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPosts;
