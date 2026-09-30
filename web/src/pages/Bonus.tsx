import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gift,
  Award,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  User,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { fetchMyBonus, fetchEmployeeBonus, fetchProfiles } from '../api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  formatMoney,
  formatPercent,
  formatMonthYear,
} from '../i18n/uz';
import { SYSTEM_START_DATE, getTashkentToday } from '../utils/dates';
import { format, startOfMonth } from 'date-fns';

export const Bonus: React.FC = () => {
  const { profile } = useAuth();
  const isOwner = !!profile?.is_owner;

  // Selected month (first of current month or system start)
  const defaultMonth = format(startOfMonth(getTashkentToday()), 'yyyy-MM-01');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    defaultMonth < SYSTEM_START_DATE ? SYSTEM_START_DATE : defaultMonth
  );

  // Selected employee (only if owner)
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profile?.id || '');

  // Fetch employees list if owner
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-bonus'],
    queryFn: fetchProfiles,
    enabled: isOwner,
  });

  // Fetch bonus calculation
  const {
    data: bonusData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bonus-calc', selectedMonth, isOwner ? selectedProfileId : 'me'],
    queryFn: async () => {
      if (isOwner && selectedProfileId && selectedProfileId !== profile?.id) {
        return fetchEmployeeBonus(selectedProfileId, selectedMonth);
      }
      return fetchMyBonus(selectedMonth);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const scorePct = bonusData?.score ?? 0;
  const status = scorePct >= 1.0 ? 'green' : scorePct >= 0.9 ? 'amber' : 'red';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Mening Bonusim</h1>
          <p className="text-body-sm text-on-surface-muted">
            SSP ko'rsatkichlari bajarilishiga bog'langan oylik bonus hisobi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Employee Picker for Owner */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-on-surface-muted" />
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="h-10 px-3 bg-surface text-on-surface border border-border-strong rounded-md text-body-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role?.name || 'Xodim'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-on-surface-muted" />
            <input
              type="date"
              value={selectedMonth}
              min={SYSTEM_START_DATE}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  // Ensure first day of month
                  setSelectedMonth(val.slice(0, 7) + '-01');
                }
              }}
              className="h-10 px-3 bg-surface text-on-surface border border-border-strong rounded-md text-body-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
        </div>
      </div>

      {error || !bonusData ? (
        <EmptyState
          icon={AlertCircle}
          title="Bonus hisoblanmadi"
          description="Ushbu oy uchun bonus sxemasi mavjud emas yoki hisoblashda xatolik yuz berdi."
        />
      ) : (
        <>
          {/* Main Bonus Card */}
          <Card className="p-6 sm:p-8 bg-gradient-to-br from-surface via-surface to-secondary-soft/30 border-border shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <span className="text-label-sm uppercase tracking-wider text-on-surface-muted font-bold">
                  {formatMonthYear(selectedMonth)} uchun hisoblangan bonus
                </span>
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl sm:text-5xl font-extrabold text-primary tnum tracking-tight">
                    {formatMoney(bonusData.bonus)}
                  </span>
                  <Badge status={status} className="text-sm px-3 py-1">
                    {status === 'green' ? '100% To\'liq' : status === 'amber' ? 'Qisman' : 'Bonus yo\'q'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 text-body-sm">
                  <div>
                    <span className="text-on-surface-muted block text-xs">Bazaviy stavka:</span>
                    <strong className="text-on-surface font-semibold tnum text-base">
                      {formatMoney(bonusData.base_amount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-on-surface-muted block text-xs">Koeffitsient:</span>
                    <strong className="text-on-surface font-semibold tnum text-base">
                      {(bonusData.coefficient * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Visual Score Ring / Box */}
              <div className="flex flex-col items-center justify-center p-6 bg-surface rounded-2xl border border-border shadow-sm min-w-[220px]">
                <span className="text-label-sm text-on-surface-muted font-semibold mb-1">
                  Umumiy ball
                </span>
                <span className="text-5xl font-black text-on-surface tnum">
                  {formatPercent(scorePct)}
                </span>
                <div className="w-full mt-3">
                  <div className="h-2.5 w-full bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        status === 'green'
                          ? 'bg-[#1F9D55]'
                          : status === 'amber'
                          ? 'bg-[#E0A100]'
                          : 'bg-[#B33636]'
                      }`}
                      style={{ width: `${Math.min(scorePct * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Thresholds Explanation */}
          <Card className="p-6">
            <h3 className="text-headline-sm font-bold text-on-surface mb-3">
              Bonus hisoblash shartlari
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#F5C2C2] bg-[#FBE9E9]/40 space-y-1">
                <span className="text-xs font-bold text-[#B33636] uppercase tracking-wider">
                  0% &bull; &lt; 90%
                </span>
                <h4 className="font-bold text-body-md text-on-surface">Bonus berilmaydi</h4>
                <p className="text-body-sm text-on-surface-muted">
                  Ko'rsatkich 90% dan kam bajarilsa, bonus 0 so'm hisoblanadi.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#FBE099] bg-[#FFF4D6]/40 space-y-1">
                <span className="text-xs font-bold text-[#8A6100] uppercase tracking-wider">
                  90% – 99%
                </span>
                <h4 className="font-bold text-body-md text-on-surface">Mutanosib bonus</h4>
                <p className="text-body-sm text-on-surface-muted">
                  Bajarilish foiziga mutanosib ravishda qisman to'lanadi.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#BCE8CD] bg-[#E3F5EA]/40 space-y-1">
                <span className="text-xs font-bold text-[#17703D] uppercase tracking-wider">
                  &ge; 100%
                </span>
                <h4 className="font-bold text-body-md text-on-surface">To'liq bonus</h4>
                <p className="text-body-sm text-on-surface-muted">
                  Bazaviy stavka 100% hajmida to'liq taqdim etiladi.
                </p>
              </div>
            </div>
          </Card>

          {/* Gap Analysis / "90% va 100% ga yetish uchun" */}
          {bonusData.gap_analysis && bonusData.gap_analysis.length > 0 && (
            <Card className="p-6">
              <h3 className="text-headline-sm font-bold text-on-surface mb-2">
                Bonusga yetish uchun maslahatlar (Gap-tahlil)
              </h3>
              <p className="text-body-sm text-on-surface-muted mb-4">
                Oy yakuniga qadar bonus darajasiga erishish uchun kunlik talab qilinadigan qiymatlar:
              </p>

              <div className="space-y-3">
                {bonusData.gap_analysis.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border bg-surface hover:border-secondary transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-muted text-on-surface">
                          {gap.metric_code}
                        </span>
                        <h4 className="font-semibold text-body-md text-on-surface">
                          {gap.metric_name}
                        </h4>
                      </div>
                      <p className="text-body-sm text-on-surface-muted">
                        Joriy holat: <strong className="tnum text-on-surface">{formatPercent(gap.pct)}</strong> &bull; Qolgan kunlar: <strong className="tnum text-on-surface">{gap.remaining_days} kun</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-on-surface-muted block">90% uchun kuniga:</span>
                        <strong className="text-body-lg text-[#8A6100] font-bold tnum">
                          +{gap.daily_for_90}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-on-surface-muted block">100% uchun kuniga:</span>
                        <strong className="text-body-lg text-[#17703D] font-bold tnum">
                          +{gap.daily_for_100}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
