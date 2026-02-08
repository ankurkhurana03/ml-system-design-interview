import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditLogEntry, AuditAction, ActorType } from '@/types/tree';

interface AuditLogFilters {
  action?: AuditAction;
  actor_type?: ActorType;
  date_from?: string;
  date_to?: string;
}

interface LogActionParams {
  comment_id: string | null;
  action: AuditAction;
  actor_type: ActorType;
  actor_id?: string | null;
  actor_name: string;
  reason?: string | null;
  confidence?: number | null;
  rules_applied?: string[] | null;
  metadata?: Record<string, any>;
}

const PAGE_SIZE = 20;

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query
      let query = supabase
        .from('moderation_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.actor_type) {
        query = query.eq('actor_type', filters.actor_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEntries(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log');
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const logAction = useCallback(async (params: LogActionParams) => {
    try {
      const { error: insertError } = await supabase
        .from('moderation_audit_log')
        .insert({
          comment_id: params.comment_id,
          action: params.action,
          actor_type: params.actor_type,
          actor_id: params.actor_id,
          actor_name: params.actor_name,
          reason: params.reason,
          confidence: params.confidence,
          rules_applied: params.rules_applied,
          metadata: params.metadata || {},
        });

      if (insertError) throw insertError;

      // Refetch if we're on the first page
      if (page === 1) {
        await fetchEntries();
      }
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  }, [page, fetchEntries]);

  return {
    entries,
    loading,
    error,
    totalCount,
    page,
    setPage,
    filters,
    setFilters,
    logAction,
  };
}
