import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import { Lock, Phone } from 'lucide-react';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { signIn } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  // Phone masking: +998 (XX) XXX-XX-XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val.startsWith('998')) {
      val = '998' + val;
    }
    // Limit to 12 digits
    val = val.slice(0, 12);

    // Format
    let formatted = '+998';
    if (val.length > 3) {
      formatted += ' (' + val.slice(3, 5);
    }
    if (val.length > 5) {
      formatted += ') ' + val.slice(5, 8);
    }
    if (val.length > 8) {
      formatted += '-' + val.slice(8, 10);
    }
    if (val.length > 10) {
      formatted += '-' + val.slice(10, 12);
    }

    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length !== 12) {
      setErrorMsg("Telefon raqami to'liq kiritilishi shart (+998 XX XXX XX XX)");
      return;
    }
    if (!password) {
      setErrorMsg('Parolni kiriting');
      return;
    }

    setLoading(true);
    try {
      await signIn(rawDigits, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.message === 'Invalid login credentials'
        ? "Telefon raqami yoki parol noto'g'ri"
        : (err.message || "Tizimga kirishda xatolik yuz berdi");
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#0A5D3A] to-[#084A2E]">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border p-8 text-on-surface">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/brand/logo-full-on-white.png"
            alt="Haziniy SSP"
            className="h-12 object-contain mb-3"
          />
          <p className="text-body-sm text-on-surface-muted text-center">
            Balanced Scorecard — Samaradorlik boshqaruv tizimi
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-[#FBE9E9] text-[#B33636] border border-[#F5C2C2] text-body-sm font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Telefon raqami"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="+998 (90) 123-45-67"
            required
            autoComplete="username"
            className="text-body-lg font-medium"
          />

          <Input
            label="Parol"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
          >
            Tizimga kirish
          </Button>
        </form>

        <div className="mt-8 text-center text-body-sm text-on-surface-muted border-t border-border pt-4">
          <p>Haziniy ilm maskani &copy; 2026</p>
        </div>
      </div>
    </div>
  );
};
