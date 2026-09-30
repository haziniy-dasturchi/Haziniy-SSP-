import React, { useState } from 'react';
import { getSupabaseConfig } from '../../api/supabase';
import { Button } from './Button';
import { Input } from './Input';
import { KeyRound, ShieldAlert } from 'lucide-react';

export const ConfigGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = getSupabaseConfig();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (config.isConfigured) {
    return <>{children}</>;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setError('Iltimos, Supabase Anon kalitini kiriting');
      return;
    }
    localStorage.setItem('haziniy_anon_key', cleanKey);
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#0A5D3A] to-[#084A2E]">
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border p-6 sm:p-8 text-on-surface">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary-soft text-primary flex items-center justify-center mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-headline-md font-bold text-on-surface">
            Supabase Ulanish Kaliti Kerak
          </h2>
          <p className="text-body-sm text-on-surface-muted mt-1">
            Veb-ilovaning server bilan aloqa o'rnatishi uchun <code className="bg-surface-muted px-1.5 py-0.5 rounded text-primary">anon</code> kalitini kiriting
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#FBE9E9] text-[#B33636] text-body-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Supabase Anon Key (Publishable key)"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sb_publishable_... yoki anon kalitingizni kiriting"
            required
            className="font-mono text-xs sm:text-sm"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Kalitni saqlash va tizimga kirish
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-body-sm text-on-surface-muted space-y-2">
          <p className="font-semibold text-on-surface">Doimiy sozlash uchun (Vercel / Netlify):</p>
          <p className="text-xs leading-relaxed">
            Hosting boshqaruv panelida <strong>Environment Variables</strong> bo'limiga o'tib, <strong>VITE_SUPABASE_ANON_KEY</strong> o'zgaruvchisini qo'shing va loyihani <em>Redeploy</em> qiling.
          </p>
        </div>
      </div>
    </div>
  );
};
