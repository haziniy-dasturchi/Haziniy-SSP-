import { describe, it, expect } from 'vitest';
import { generateBSCAnalysis } from '../utils/aiAnalysisEngine';
import { SSPResponse } from '../types/database';

describe('generateBSCAnalysis', () => {
  it('generates rich analysis when metrics are present and evaluated', () => {
    const mockSSP: SSPResponse = {
      period: { from: '2026-10-01', to: '2026-10-31' },
      effective_date: '2026-10-02',
      total: { pct: 0.88, status: 'amber' },
      departments: [
        {
          id: 'dept-1',
          name: 'Sotuv',
          weight: 0.4,
          pct: 0.82,
          status: 'amber',
          metrics: [
            {
              id: 'm-1',
              code: 'S1',
              name: 'Lidlar',
              unit: 'count',
              direction: 'higher_better',
              weight: 0.5,
              plan: 100,
              full_period_plan: 100,
              fact: 70,
              diff: -30,
              pct: 0.70,
              status: 'red',
            },
            {
              id: 'm-2',
              code: 'S3',
              name: 'Yangi o\'quvchilar',
              unit: 'count',
              direction: 'higher_better',
              weight: 0.5,
              plan: 30,
              full_period_plan: 30,
              fact: 35,
              diff: 5,
              pct: 1.16,
              status: 'green',
            },
          ],
        },
      ],
    };

    const result = generateBSCAnalysis(mockSSP, 'Farg\'ona filiali');

    expect(result.summary).toContain("Farg'ona filiali");
    expect(result.summary).toContain('88.0%');
    expect(result.weakest.length).toBeGreaterThan(0);
    expect(result.weakest[0].metric_code).toContain('S1');
    expect(result.weakest[0].likely_causes.length).toBeGreaterThan(0);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('handles empty facts gracefully without crashing', () => {
    const emptySSP: SSPResponse = {
      period: { from: '2026-10-01', to: '2026-10-31' },
      effective_date: '2026-09-30',
      total: { pct: null, status: null },
      departments: [],
    };

    const result = generateBSCAnalysis(emptySSP);

    expect(result.summary).toBeDefined();
    expect(result.weakest.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
