import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  fetchBranches,
  fetchMetrics,
  fetchProfiles,
  upsertDailyFacts,
  upsertMonthlyPlans,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/Skeleton';
import { SYSTEM_START_DATE } from '../utils/dates';
import { Branch, Metric, Profile } from '../types/database';

type ImportType = 'facts' | 'plans';

interface ParsedRow {
  rowNumber: number;
  branchName: string;
  metricCode: string;
  dateOrMonth: string;
  value: number;
  employeePhone?: string;
  branchId?: string;
  metricId?: string;
  employeeId?: string | null;
  isValid: boolean;
  errorMessage?: string;
}

export const ImportCSV: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [importType, setImportType] = useState<ImportType>('facts');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importReport, setImportReport] = useState<{
    inserted: number;
    updated: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const { data: metrics = [] } = useQuery<Metric[]>({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ['profiles-all'],
    queryFn: fetchProfiles,
  });

  // Download sample CSV templates
  const downloadTemplate = (type: ImportType) => {
    let csvContent = '';
    let downloadName = '';

    if (type === 'facts') {
      csvContent = `branch_name,metric_code,date,value,employee_phone\n${branches[0]?.name || "Farg'ona markaz"},S1,2026-09-15,25,\n`;
      downloadName = 'namuna_kundalik_faktlar.csv';
    } else {
      csvContent = `branch_name,metric_code,month,value,employee_phone\n${branches[0]?.name || "Farg'ona markaz"},S1,2026-09,100,\n`;
      downloadName = 'namuna_oylik_rejalar.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file selection and parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportReport(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = [];

        results.data.forEach((raw: any, index: number) => {
          const rowNum = index + 2; // header is row 1
          const bName = (raw.branch_name || '').trim();
          const mCode = (raw.metric_code || '').trim();
          const dVal = (raw.date || raw.month || '').trim();
          const rawVal = (raw.value || '').toString().trim().replace(/\s+/g, '').replace(',', '.');
          const phone = (raw.employee_phone || '').trim();

          const branch = branches.find((b) => b.name.toLowerCase() === bName.toLowerCase());
          const metric = metrics.find((m) => m.code.toLowerCase() === mCode.toLowerCase());
          const employee = phone
            ? profiles.find((p) => p.phone === phone.replace(/\D/g, ''))
            : null;

          const numVal = parseFloat(rawVal);
          let isValid = true;
          let errMsg = '';

          if (!branch) {
            isValid = false;
            errMsg = `Filial topilmadi: "${bName}"`;
          } else if (!metric) {
            isValid = false;
            errMsg = `Ko'rsatkich kodi topilmadi: "${mCode}"`;
          } else if (isNaN(numVal)) {
            isValid = false;
            errMsg = `Noto'g'ri qiymat: "${rawVal}"`;
          } else if (importType === 'facts' && dVal < SYSTEM_START_DATE) {
            isValid = false;
            errMsg = `Sana ${SYSTEM_START_DATE} dan kam bo'lishi mumkin emas`;
          }

          // Format month to 1st of month if plans
          let formattedDateOrMonth = dVal;
          if (importType === 'plans') {
            if (dVal.length === 7) {
              formattedDateOrMonth = `${dVal}-01`;
            } else if (dVal.length === 10) {
              formattedDateOrMonth = `${dVal.slice(0, 7)}-01`;
            }
          }

          rows.push({
            rowNumber: rowNum,
            branchName: bName,
            metricCode: mCode,
            dateOrMonth: formattedDateOrMonth,
            value: numVal,
            employeePhone: phone,
            branchId: branch?.id,
            metricId: metric?.id,
            employeeId: employee?.id || null,
            isValid,
            errorMessage: errMsg,
          });
        });

        setParsedRows(rows);
      },
      error: (error) => {
        toastError(`CSV faylni o'qishda xatolik: ${error.message}`);
      },
    });
  };

  // Perform bulk upsert mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const validRows = parsedRows.filter((r) => r.isValid && r.branchId && r.metricId);
      if (validRows.length === 0) {
        throw new Error('Yuborish uchun yaroqli qatorlar mavjud emas');
      }

      if (importType === 'facts') {
        const payload = validRows.map((r) => ({
          branch_id: r.branchId!,
          metric_id: r.metricId!,
          fact_date: r.dateOrMonth,
          value: r.value,
          employee_id: r.employeeId || null,
        }));
        return upsertDailyFacts(payload);
      } else {
        const payload = validRows.map((r) => ({
          branch_id: r.branchId!,
          metric_id: r.metricId!,
          month: r.dateOrMonth,
          value: r.value,
          employee_id: r.employeeId || null,
        }));
        return upsertMonthlyPlans(payload);
      }
    },
    onSuccess: (res) => {
      setImportReport(res);
      success(`${res.inserted + res.updated} ta qator muvaffaqiyatli import qilindi`);
      queryClient.invalidateQueries({ queryKey: ['ssp'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-plan-grid'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Import qilishda xatolik yuz berdi');
    },
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">CSV Ma'lumotlarni Import Qilish</h1>
          <p className="text-body-sm text-on-surface-muted">
            Kundalik faktlar yoki oylik rejalarni ommaviy CSV fayl orqali yuklash
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => downloadTemplate(importType)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Namunani yuklab olish</span>
          </Button>
        </div>
      </div>

      {/* Import Type Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setImportType('facts');
            setParsedRows([]);
            setImportReport(null);
          }}
          className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-colors border ${
            importType === 'facts'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface text-on-surface hover:bg-surface-muted border-border'
          }`}
        >
          Kundalik faktlar importi
        </button>
        <button
          onClick={() => {
            setImportType('plans');
            setParsedRows([]);
            setImportReport(null);
          }}
          className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-colors border ${
            importType === 'plans'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface text-on-surface hover:bg-surface-muted border-border'
          }`}
        >
          Oylik rejalar importi
        </button>
      </div>

      {/* File Upload Drop Area */}
      <Card className="p-8 border-2 border-dashed border-border-strong hover:border-primary transition-colors text-center">
        <UploadCloud className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-headline-sm font-bold text-on-surface mb-1">
          CSV faylni tanlang yoki shu yerga tashlang
        </h3>
        <p className="text-body-sm text-on-surface-muted mb-4">
          UTF-8 formatidagi vergul (,) bilan ajratilgan CSV fayllar qo'llab-quvvatlanadi
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-file-upload"
        />
        <label htmlFor="csv-file-upload">
          <span className="inline-flex items-center justify-center font-semibold rounded-md transition-colors bg-primary text-white hover:bg-primary-hover px-6 py-2.5 text-label-lg cursor-pointer">
            Faylni tanlash
          </span>
        </label>
        {fileName && <p className="mt-3 text-body-sm font-medium text-primary">Tanlangan fayl: {fileName}</p>}
      </Card>

      {/* Import Result Report Banner */}
      {importReport && (
        <Card className="p-5 bg-[#E3F5EA]/40 border border-[#BCE8CD] space-y-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#17703D]" />
            <h4 className="font-bold text-body-lg text-[#17703D]">Import natijasi</h4>
          </div>
          <p className="text-body-sm text-on-surface">
            Yangi qo'shildi: <strong>{importReport.inserted} ta</strong> &bull; Yangilandi: <strong>{importReport.updated} ta</strong> &bull; Xatolar: <strong>{importReport.errors?.length || 0} ta</strong>
          </p>
        </Card>
      )}

      {/* Preview Table & Validation */}
      {parsedRows.length > 0 && (
        <Card className="p-0 overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-headline-sm font-bold text-on-surface">Fayl tarkibini tekshirish</h3>
              <p className="text-body-sm text-on-surface-muted">
                Jami: <strong>{parsedRows.length} ta</strong> &bull; To'g'ri: <strong className="text-[#17703D]">{validCount} ta</strong> &bull; Xato: <strong className="text-[#B33636]">{errorCount} ta</strong>
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => importMutation.mutate()}
              loading={importMutation.isPending}
              disabled={validCount === 0}
              className="flex items-center gap-2"
            >
              <span>{validCount} ta qatorni import qilish</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-body-sm border-collapse">
              <thead className="sticky top-0 bg-surface-muted z-10">
                <tr className="text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Qator</th>
                  <th className="py-3 px-4 font-semibold">Filial</th>
                  <th className="py-3 px-4 font-semibold">Kod</th>
                  <th className="py-3 px-4 font-semibold">
                    {importType === 'facts' ? 'Sana' : 'Oy'}
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Qiymat</th>
                  <th className="py-3 px-4 font-semibold text-center">Holat</th>
                  <th className="py-3 px-4 font-semibold">Izoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={`transition-colors ${
                      r.isValid ? 'hover:bg-surface-muted/30' : 'bg-[#FBE9E9]/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-on-surface-muted">{r.rowNumber}</td>
                    <td className="py-3 px-4 font-medium text-on-surface">{r.branchName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-primary">{r.metricCode}</td>
                    <td className="py-3 px-4 font-mono">{r.dateOrMonth}</td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface tnum">
                      {r.value}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.isValid ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#E3F5EA] text-[#17703D] font-semibold">
                          Yaroqli
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#FBE9E9] text-[#B33636] font-semibold">
                          Xato
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#B33636] font-medium">
                      {r.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
