import { SSPStatus } from '../types/database';

export type StatusLevel = 'red' | 'amber' | 'green';

export interface Thresholds {
  min_bonus_level: number; // default 0.90
  excellent_level: number; // default 1.00
  cap_level: number;       // default 1.20
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  min_bonus_level: 0.90,
  excellent_level: 1.00,
  cap_level: 1.20,
};

export function getSSPStatus(
  pct: number | null | undefined,
  thresholds: Thresholds = DEFAULT_THRESHOLDS
): SSPStatus | null {
  if (pct === null || pct === undefined || isNaN(pct)) return null;
  // normalize if given as 95 instead of 0.95
  const normPct = pct > 2 ? pct / 100 : pct;

  if (normPct < thresholds.min_bonus_level) return 'red';
  if (normPct < thresholds.excellent_level) return 'amber';
  return 'green';
}

export function getStatusBadgeClasses(status: SSPStatus | null): { bg: string; text: string; fill: string } {
  switch (status) {
    case 'red':
      return {
        bg: 'bg-status-red-soft',
        text: 'text-status-red',
        fill: '#B33636',
      };
    case 'amber':
      return {
        bg: 'bg-status-amber-soft',
        text: 'text-status-amber',
        fill: '#E0A100',
      };
    case 'green':
      return {
        bg: 'bg-status-green-soft',
        text: 'text-status-green',
        fill: '#1F9D55',
      };
    default:
      return {
        bg: 'bg-surface-muted',
        text: 'text-on-surface-muted',
        fill: '#9AA8A0',
      };
  }
}
