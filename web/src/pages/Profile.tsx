import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, KeyRound, Shield, Building, Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatDate } from '../i18n/uz';

export const Profile: React.FC = () => {
  const { profile, role } = useAuth();
  const { success, error: toastError } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const passwordMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      if (newPassword.length < 8) {
        throw new Error("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak");
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Parol tasdig‘i mos kelmadi');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      success('Parolingiz muvaffaqiyatli o‘zgartirildi');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      const msg = err.message || 'Parolni yangilashda xatolik yuz berdi';
      setValidationError(msg);
      toastError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    passwordMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Mening Profilim</h1>
        <p className="text-body-sm text-on-surface-muted">
          Shaxsiy ma'lumotlar va akkaunt xavfsizligi sozlamalari
        </p>
      </div>

      {/* Profile Details Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-secondary-soft text-primary flex items-center justify-center font-bold text-2xl">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">{profile?.full_name}</h3>
            <span className="text-body-sm text-primary font-semibold flex items-center gap-1.5 mt-0.5">
              <Shield className="w-4 h-4" />
              <span>{role?.name || (profile?.is_owner ? 'Boshqaruvchi' : 'Xodim')}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-body-sm">
          <div className="space-y-1">
            <span className="text-xs text-on-surface-muted flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Telefon raqami</span>
            </span>
            <p className="font-semibold text-on-surface font-mono">+{profile?.phone}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-on-surface-muted flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Filial</span>
            </span>
            <p className="font-semibold text-on-surface">
              {profile?.is_owner ? 'Barcha filiallar' : (profile as any)?.branch?.name || 'Biriktirilmagan'}
            </p>
          </div>
        </div>
      </Card>

      {/* Change Password Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="text-headline-sm font-bold text-on-surface">Parolni O'zgartirish</h3>
        </div>
        <p className="text-body-sm text-on-surface-muted">
          Akkauntingiz xavfsizligini ta'minlash uchun kuchli paroldan foydalaning (kamida 8 ta belgi).
        </p>

        {validationError && (
          <div className="p-3 rounded-lg bg-[#FBE9E9] text-[#B33636] border border-[#F5C2C2] text-body-sm font-medium">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Yangi parol"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Kamida 8 ta belgi"
            required
            autoComplete="new-password"
          />

          <Input
            label="Yangi parolni tasdiqlang"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yangi parolni qayta kiriting"
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            loading={passwordMutation.isPending}
            className="w-full sm:w-auto"
          >
            Parolni saqlash
          </Button>
        </form>
      </Card>
    </div>
  );
};
