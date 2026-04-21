import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StoreWithHealth = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  cloudflare_hostname_id: string | null;
  ssl_status: string | null;
  last_health_check_at: string | null;
  consecutive_failures: number;
  downtime_started_at: string | null;
  domain_state: string | null;
  domain_strategy: string | null;
  ns_provider: string | null;
  ssl_validation_name: string | null;
  ssl_validation_value: string | null;
  state_entered_at: string | null;
};

export type AgentIncident = {
  id: string;
  store_id: string | null;
  domain: string | null;
  action: string;
  severity: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type HealthLogRow = {
  id: string;
  store_id: string;
  domain: string;
  status: string;
  http_code: number | null;
  ssl_valid: boolean | null;
  response_ms: number | null;
  checked_at: string;
};

export const useDomainStores = () =>
  useQuery({
    queryKey: ['admin-domain-stores'],
    queryFn: async (): Promise<StoreWithHealth[]> => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, custom_domain, cloudflare_hostname_id, ssl_status, last_health_check_at, consecutive_failures, downtime_started_at, domain_state, domain_strategy, ns_provider, ssl_validation_name, ssl_validation_value, state_entered_at')
        .not('custom_domain', 'is', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as StoreWithHealth[];
    },
    refetchInterval: 30_000,
  });

export const useAgentIncidents = (limit = 30) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['agent-incidents', limit],
    queryFn: async (): Promise<AgentIncident[]> => {
      const { data, error } = await supabase
        .from('agent_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AgentIncident[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('agent_incidents_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_incidents' }, () => {
        qc.invalidateQueries({ queryKey: ['agent-incidents'] });
        qc.invalidateQueries({ queryKey: ['admin-domain-stores'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
};

export const useHealthSummary = () =>
  useQuery({
    queryKey: ['health-summary'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from('domain_health_log')
        .select('store_id, status')
        .gte('checked_at', since);
      if (error) throw error;
      const byStore: Record<string, { up: number; total: number }> = {};
      (data ?? []).forEach((r: any) => {
        const k = r.store_id;
        byStore[k] = byStore[k] ?? { up: 0, total: 0 };
        byStore[k].total += 1;
        if (r.status === 'up') byStore[k].up += 1;
      });
      return byStore;
    },
    refetchInterval: 60_000,
  });
