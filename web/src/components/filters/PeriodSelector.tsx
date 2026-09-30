import React, { useState } from 'react';
import { PeriodType, SYSTEM_START_DATE } from '../../utils/dates';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Calendar } from 'lucide-react';

export interface PeriodSelectorProps {
  currentPeriod: PeriodType;
  dateFrom: string;
  dateTo: string;
  onPeriodChange: (period: PeriodType, customFrom?: string, customTo?: string) => void;
}

const PERIOD_PRESETS: { type: PeriodType; label: string }[] = [
  { type: 'today', label: 'Bugun' },
  { type: 'yesterday', label: 'Kecha' },
  { type: 'this_week', label: 'Bu hafta' },
  { type: 'last_week', label: "O'tgan hafta" },
  { type: 'this_month', label: 'Bu oy' },
  { type: 'last_month', label: "O'tgan oy" },
  { type: 'quarter', label: 'Chorak' },
  { type: 'year', label: 'Yil' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  currentPeriod,
  dateFrom,
  dateTo,
  onPeriodChange,
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(dateFrom);
  const [customEnd, setCustomEnd] = useState(dateTo);
  const [error, setError] = useState<string | null>(null);

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      setError('Ikkala sanani ham tanlang');
      return;
    }
    if (customStart < SYSTEM_START_DATE) {
      setError(`Sana ${SYSTEM_START_DATE} dan kam bo'lishi mumkin emas`);
      return;
    }
    if (customStart > customEnd) {
      setError("Boshlanish sanasi tugash sanasidan katta bo'lishi mumkin emas");
      return;
    }
    setError(null);
    onPeriodChange('custom', customStart, customEnd);
    setIsCustomOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {PERIOD_PRESETS.map((p) => {
          const isSelected = currentPeriod === p.type;
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => onPeriodChange(p.type)}
              className={`h-8 px-3 rounded-full text-label-md font-semibold whitespace-nowrap transition-colors select-none ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-surface text-on-surface-muted hover:bg-surface-muted hover:text-on-surface border border-border'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom Range Button */}
        <button
          type="button"
          onClick={() => {
            setCustomStart(dateFrom);
            setCustomEnd(dateTo);
            setIsCustomOpen(true);
          }}
          className={`h-8 px-3 rounded-full text-label-md font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors select-none ${
            currentPeriod === 'custom'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-surface text-on-surface-muted hover:bg-surface-muted hover:text-on-surface border border-border'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{currentPeriod === 'custom' ? `${dateFrom} — ${dateTo}` : 'Dan – gacha'}</span>
        </button>
      </div>

      {/* Custom Date Range Modal */}
      <Modal
        isOpen={isCustomOpen}
        onClose={() => setIsCustomOpen(false)}
        title="Oraliqni tanlash"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCustomOpen(false)}>
              Bekor qilish
            </Button>
            <Button variant="primary" onClick={handleApplyCustom}>
              Tanlash
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <Input
            type="date"
            label="Boshlanish sanasi"
            min={SYSTEM_START_DATE}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <Input
            type="date"
            label="Tugash sanasi"
            min={SYSTEM_START_DATE}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
          {error && <p className="text-body-sm text-status-red">{error}</p>}
        </div>
      </Modal>
    </>
  );
};
