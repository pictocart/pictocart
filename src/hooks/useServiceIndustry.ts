import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = new Set(['healthcare', 'beauty_services']);

export const useIsServiceStore = () => {
  const { store } = useStore();
  return SERVICE_CATEGORIES.has((store?.category ?? '').toLowerCase());
};

export const useIsHealthcareStore = () => {
  const { store } = useStore();
  return (store?.category ?? '').toLowerCase() === 'healthcare';
};

/* ============================== Providers ============================== */
export const useProviders = () => {
  const { store } = useStore();
  const qc = useQueryClient();
  const storeId = store?.id;

  const list = useQuery({
    queryKey: ['service-providers', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('service_providers' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!storeId,
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (!storeId) throw new Error('No store');
      const body = { ...payload, store_id: storeId };
      if (body.id) {
        const { error } = await supabase.from('service_providers' as any).update(body).eq('id', body.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_providers' as any).insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-providers', storeId] });
      toast.success('Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_providers' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-providers', storeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { providers: list.data ?? [], loading: list.isLoading, save: save.mutateAsync, remove: remove.mutateAsync };
};

/* ============================== Services ============================== */
export const useServices = () => {
  const { store } = useStore();
  const qc = useQueryClient();
  const storeId = store?.id;

  const list = useQuery({
    queryKey: ['services', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('services' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!storeId,
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (!storeId) throw new Error('No store');
      const body = { ...payload, store_id: storeId };
      if (body.id) {
        const { error } = await supabase.from('services' as any).update(body).eq('id', body.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services' as any).insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services', storeId] });
      toast.success('Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services', storeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { services: list.data ?? [], loading: list.isLoading, save: save.mutateAsync, remove: remove.mutateAsync };
};

/* ============================ Appointments ============================ */
export const useAppointments = (rangeStart?: string, rangeEnd?: string) => {
  const { store } = useStore();
  const qc = useQueryClient();
  const storeId = store?.id;

  const list = useQuery({
    queryKey: ['appointments', storeId, rangeStart, rangeEnd],
    queryFn: async () => {
      if (!storeId) return [];
      let q: any = supabase
        .from('appointments' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('slot_start', { ascending: true });
      if (rangeStart) q = q.gte('slot_start', rangeStart);
      if (rangeEnd) q = q.lte('slot_start', rangeEnd);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!storeId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes_internal }: { id: string; status: string; notes_internal?: string }) => {
      const patch: any = { status };
      if (notes_internal !== undefined) patch.notes_internal = notes_internal;
      const { error } = await supabase.from('appointments' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', storeId] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { appointments: list.data ?? [], loading: list.isLoading, updateStatus: updateStatus.mutateAsync };
};

/* ============================ Family Plans ============================ */
export const useFamilyPlans = () => {
  const { store } = useStore();
  const qc = useQueryClient();
  const storeId = store?.id;

  const plans = useQuery({
    queryKey: ['family-plans', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('family_plans' as any)
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!storeId,
  });

  const groups = useQuery({
    queryKey: ['family-groups', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('family_groups' as any)
        .select('*, family_members(*)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!storeId,
  });

  const savePlan = useMutation({
    mutationFn: async (payload: any) => {
      if (!storeId) throw new Error('No store');
      const body = { ...payload, store_id: storeId };
      if (body.id) {
        const { error } = await supabase.from('family_plans' as any).update(body).eq('id', body.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('family_plans' as any).insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-plans', storeId] });
      toast.success('Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('family_plans' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family-plans', storeId] }),
  });

  return {
    plans: plans.data ?? [],
    groups: groups.data ?? [],
    loading: plans.isLoading || groups.isLoading,
    savePlan: savePlan.mutateAsync,
    deletePlan: deletePlan.mutateAsync,
  };
};
