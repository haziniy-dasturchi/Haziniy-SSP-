import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Filter, Search, Eye, ArrowRight, User } from 'lucide-react';
import { supabase } from '../api/supabase';
import { fetchAuditLogs, fetchProfiles } from '../api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { formatDate } from '../i18n/uz';
import { AuditLogItem } from '../types/database';

export const AuditLog: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditLogItem[]>({
    queryKey: ['audit-logs'],
    queryFn: () => fetchAuditLogs(150),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-all'],
    queryFn: fetchProfiles,
  });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((p) => {
      map.set(p.id, p.full_name);
    });
    return map;
  }, [profiles]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (entityFilter !== 'all' && log.entity !== entityFilter) return false;
      return true;
    });
  }, [logs, actionFilter, entityFilter]);

  const uniqueEntities = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => s.add(l.entity));
    return Array.from(s).sort();
  }, [logs]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'insert':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E3F5EA] text-[#17703D]">Qo‘shish</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFF4D6] text-[#8A6100]">Tahrirlash</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FBE9E9] text-[#B33636]">O‘chirish</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-muted text-on-surface-muted">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Audit Jurnali</h1>
        <p className="text-body-sm text-on-surface-muted">
          Tizimda foydalanuvchilar tomonidan amalga oshirilgan barcha o'zgarishlar tarixi
        </p>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-on-surface-muted" />
          <span className="text-body-sm font-semibold text-on-surface">Amal:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-3 bg-surface border border-border-strong rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="all">Barcha amallar</option>
            <option value="insert">Qo‘shish (insert)</option>
            <option value="update">Tahrirlash (update)</option>
            <option value="delete">O‘chirish (delete)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-body-sm font-semibold text-on-surface">Jadval:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 px-3 bg-surface border border-border-strong rounded-md text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="all">Barcha jadvallar</option>
            {uniqueEntities.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Vaqt</th>
                <th className="py-3 px-4 font-semibold">Foydalanuvchi</th>
                <th className="py-3 px-4 font-semibold text-center">Amal</th>
                <th className="py-3 px-4 font-semibold">Jadval (Entity)</th>
                <th className="py-3 px-4 font-semibold">Obyekt ID</th>
                <th className="py-3 px-4 text-right">Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-muted">
                    Audit yozuvlari topilmadi
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const userName = (log.user_id ? userMap.get(log.user_id) : undefined) || 'Tizim / Noma‘lum';

                  return (
                    <tr key={log.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-on-surface-muted whitespace-nowrap">
                        {formatDate(log.at)}
                      </td>

                      <td className="py-3 px-4 font-medium text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-on-surface-muted" />
                          <span>{userName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">
                        {log.entity}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-on-surface-muted truncate max-w-[120px]">
                        {log.entity_id || '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded hover:bg-surface-muted text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ko‘rish</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* JSON Diff Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Yozuvi Tafsiloti"
          maxWidth="lg"
          footer={
            <Button variant="secondary" onClick={() => setSelectedLog(null)}>
              Yopish
            </Button>
          }
        >
          <div className="space-y-4 py-2 text-body-sm">
            <div className="grid grid-cols-2 gap-2 p-3 bg-surface-muted rounded-lg">
              <div>
                <span className="text-xs text-on-surface-muted block">Jadval:</span>
                <strong className="font-mono text-on-surface">{selectedLog.entity}</strong>
              </div>
              <div>
                <span className="text-xs text-on-surface-muted block">Amal:</span>
                <strong className="uppercase text-on-surface">{selectedLog.action}</strong>
              </div>
            </div>

            {selectedLog.old_value && (
              <div>
                <span className="text-xs font-bold text-[#B33636] uppercase tracking-wider block mb-1">
                  Oldingi qiymat (Old value):
                </span>
                <pre className="p-3 rounded-lg bg-surface-muted text-xs font-mono overflow-x-auto max-h-48 border border-border">
                  {JSON.stringify(selectedLog.old_value, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_value && (
              <div>
                <span className="text-xs font-bold text-[#17703D] uppercase tracking-wider block mb-1">
                  Yangi qiymat (New value):
                </span>
                <pre className="p-3 rounded-lg bg-surface-muted text-xs font-mono overflow-x-auto max-h-48 border border-border">
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
