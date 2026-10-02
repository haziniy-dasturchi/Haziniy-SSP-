import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { Branch } from '../../types/database';

export interface BranchSwitcherProps {
  currentBranchId: string | null;
  onBranchChange: (branchId: string | null) => void;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  currentBranchId,
  onBranchChange,
}) => {
  const { profile, role } = useAuth();
  const isOwnerOrAll = profile?.is_owner || role?.branch_scope === 'all';

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data as Branch[]) || [];
    },
  });

  // Validate saved branchId against active branches list
  React.useEffect(() => {
    if (branches.length > 0 && currentBranchId && !branches.some((b) => b.id === currentBranchId)) {
      onBranchChange(null);
    }
  }, [branches, currentBranchId, onBranchChange]);

  if (!isOwnerOrAll) {
    // Single branch mode
    const ownBranch = branches.find((b) => b.id === profile?.branch_id);
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted rounded-md border border-border text-on-surface text-body-sm font-medium">
        <Building2 className="w-4 h-4 text-on-surface-muted" />
        <span>{ownBranch ? ownBranch.name : 'Mening filialim'}</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <div className="absolute left-3 pointer-events-none text-on-surface-muted">
        <Building2 className="w-4 h-4" />
      </div>
      <select
        value={currentBranchId || 'all'}
        onChange={(e) => {
          const val = e.target.value;
          onBranchChange(val === 'all' ? null : val);
        }}
        className="h-10 pl-9 pr-8 bg-surface text-on-surface text-body-sm font-medium border border-border-strong rounded-md hover:border-on-surface-muted focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-colors cursor-pointer appearance-none"
        aria-label="Filial tanlash"
      >
        <option value="all">Barcha filiallar</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 text-on-surface-muted">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
