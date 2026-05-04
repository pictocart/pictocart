import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogPost {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  body: string;
  cover_image: string | null;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export const useBlogPosts = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ['blog-posts', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
    enabled: !!storeId,
  });
};

export const usePublishedBlogPosts = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ['published-blog-posts', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
    enabled: !!storeId,
  });
};

export const useBlogPost = (storeId: string | undefined, slug: string | undefined) => {
  return useQuery({
    queryKey: ['blog-post', storeId, slug],
    queryFn: async () => {
      if (!storeId || !slug) return null;
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('store_id', storeId)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as BlogPost | null;
    },
    enabled: !!storeId && !!slug,
  });
};

export const useBlogPostById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['blog-post-by-id', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as BlogPost | null;
    },
    enabled: !!id,
  });
};

export const useCreateBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Partial<BlogPost> & { store_id: string; title: string; slug: string }) => {
      const { data, error } = await supabase.from('blog_posts').insert(post).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['blog-posts', vars.store_id] });
      qc.invalidateQueries({ queryKey: ['published-blog-posts', vars.store_id] });
      qc.invalidateQueries({ queryKey: ['storefront-bundle'] });
    },
  });
};

export const useUpdateBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      qc.invalidateQueries({ queryKey: ['published-blog-posts'] });
      qc.invalidateQueries({ queryKey: ['storefront-bundle'] });
      qc.invalidateQueries({ queryKey: ['blog-post-by-id'] });
    },
  });
};

export const useDeleteBlogPost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      qc.invalidateQueries({ queryKey: ['published-blog-posts'] });
      qc.invalidateQueries({ queryKey: ['storefront-bundle'] });
    },
  });
};
