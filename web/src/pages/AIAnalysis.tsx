import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  TrendingDown,
  ThumbsUp,
  Lightbulb,
  History,
  Clock,
  AlertCircle,
  Building,
  Calendar,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { runAIAnalysis } from '../api';
import { useFilterParams } from '../hooks/useFilterParams';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, formatPercent } from '../i18n/uz';
import { AIAnalysisResult, AIAnalysisRecord } from '../types/database';

export const AIAnalysis: React.FC = () => {
  const { branchId, dateFrom, dateTo } = useFilterParams();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [currentResult, setCurrentResult] = useState<AIAnalysisResult | null>(null);

  // Fetch past analyses history
  const { data: history = [], isLoading: historyLoading } = useQuery<AIAnalysisRecord[]>({
    queryKey: ['ai-analyses-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as AIAnalysisRecord[];
    },
  });

  // Run AI analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return runAIAnalysis(branchId, dateFrom, dateTo);
    },
    onSuccess: (data) => {
      setCurrentResult(data);
      success('AI tahlil muvaffaqiyatli yakunlandi');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses-history'] });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('429')
        ? 'Kunlik tahlil limiti tugadi (20 ta)'
        : (err.message || 'AI tahlilni amalga oshirishda xatolik yuz berdi');
      toastError(msg);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-headline-md font-bold text-on-surface">Sun'iy Intellekt Tahlili</h1>
          </div>
          <p className="text-body-sm text-on-surface-muted">
            SSP ko'rsatkichlarini chuqur tahlil qilish va samaradorlikni oshirish bo'yicha tavsiyalar
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => analyzeMutation.mutate()}
          loading={analyzeMutation.isPending}
          className="flex items-center gap-2 shadow-sm"
        >
          <Sparkles className="w-5 h-5" />
          <span>Tahlil qilish</span>
        </Button>
      </div>

      {/* AI Processing Loading State */}
      {analyzeMutation.isPending && (
        <Card className="p-8 text-center space-y-4 border-dashed border-primary/40 bg-secondary-soft/20 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-secondary-soft text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-headline-sm font-bold text-on-surface">
            Sun'iy intellekt tahlil qilmoqda...
          </h3>
          <p className="text-body-md text-on-surface-muted max-w-md mx-auto">
            Tanlangan filial va davr bo'yicha barcha ko'rsatkichlar, rejalar va faktlar taqqoslanmoqda.
          </p>
        </Card>
      )}

      {/* Analysis Results Display */}
      {currentResult && !analyzeMutation.isPending && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Summary */}
          <Card className="p-6 bg-gradient-to-r from-surface to-secondary-soft/20 border-border">
            <h3 className="text-headline-sm font-bold text-on-surface mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Umumiy Xulosa</span>
            </h3>
            <p className="text-body-lg text-on-surface leading-relaxed whitespace-pre-line">
              {currentResult.summary}
            </p>
          </Card>

          {/* Strengths & Weaknesses Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weakest Metrics */}
            <Card className="p-6 space-y-4">
              <h3 className="text-headline-sm font-bold text-[#B33636] flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <span>Zaif ko'rsatkichlar</span>
              </h3>

              {currentResult.weakest?.length === 0 ? (
                <p className="text-body-sm text-on-surface-muted">Zaif ko'rsatkichlar aniqlanmadi.</p>
              ) : (
                <div className="space-y-3">
                  {currentResult.weakest?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[#F5C2C2] bg-[#FBE9E9]/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-body-md text-on-surface">
                          {item.metric_code}
                        </span>
                        <Badge status="red">{formatPercent(item.pct)}</Badge>
                      </div>
                      <p className="text-body-sm text-on-surface-muted">
                        Rejadan qolish: <strong className="text-[#B33636] tnum">{item.gap}%</strong>
                      </p>
                      {item.likely_causes && item.likely_causes.length > 0 && (
                        <div className="text-body-sm pt-1">
                          <span className="text-xs font-semibold text-on-surface-muted block">
                            Taxminiy sabablar:
                          </span>
                          <ul className="list-disc list-inside text-on-surface space-y-0.5 mt-1">
                            {item.likely_causes.map((c, cIdx) => (
                              <li key={cIdx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Strengths */}
            <Card className="p-6 space-y-4">
              <h3 className="text-headline-sm font-bold text-[#17703D] flex items-center gap-2">
                <ThumbsUp className="w-5 h-5" />
                <span>Kuchli jihatlar</span>
              </h3>

              {currentResult.strengths?.length === 0 ? (
                <p className="text-body-sm text-on-surface-muted">Kuchli tomonlar topilmadi.</p>
              ) : (
                <div className="space-y-2.5">
                  {currentResult.strengths?.map((strength, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#BCE8CD] bg-[#E3F5EA]/40 text-body-md font-medium text-on-surface flex items-start gap-2.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#1F9D55] mt-2 shrink-0" />
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Actionable Recommendations */}
          <Card className="p-6 space-y-4">
            <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Amaliy Tavsiyalar</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentResult.recommendations?.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-surface hover:border-secondary transition-colors space-y-3"
                >
                  <h4 className="font-bold text-body-lg text-on-surface leading-snug">
                    {rec.action}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-body-sm text-on-surface-muted pt-2 border-t border-border">
                    <div>
                      <span className="text-xs block">Mas'ul rol:</span>
                      <strong className="text-on-surface">{rec.owner_role}</strong>
                    </div>
                    <div>
                      <span className="text-xs block">Muddat:</span>
                      <strong className="text-on-surface">{rec.deadline_days} kun ichida</strong>
                    </div>
                  </div>

                  {rec.expected_effect && (
                    <div className="p-2.5 rounded-lg bg-surface-muted text-body-sm">
                      <span className="text-xs font-semibold text-on-surface-muted block">
                        Kutilayotgan samara:
                      </span>
                      <span className="text-on-surface font-medium">{rec.expected_effect}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* History of Past Analyses */}
      <Card className="p-6">
        <h3 className="text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-on-surface-muted" />
          <span>Tahlillar Tarixi</span>
        </h3>

        {historyLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-6 text-center text-on-surface-muted text-body-sm">
            Oldingi tahlillar mavjud emas
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((h) => (
              <div
                key={h.id}
                onClick={() => setCurrentResult(h.result)}
                className="py-3 px-2 flex items-center justify-between hover:bg-surface-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-body-sm font-semibold text-on-surface">
                    <Calendar className="w-4 h-4 text-on-surface-muted" />
                    <span>
                      {formatDate(h.date_from)} — {formatDate(h.date_to)}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-muted line-clamp-1 max-w-xl">
                    {h.result?.summary}
                  </p>
                </div>
                <div className="text-right text-xs text-on-surface-muted">
                  <span className="block font-medium">Model: {h.model || 'gemini-1.5-flash'}</span>
                  <span>{formatDate(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
