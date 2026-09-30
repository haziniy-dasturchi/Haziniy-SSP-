import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 rounded-full bg-[#FFF4D6] text-[#8A6100] flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-headline-md font-bold text-on-surface mb-2">Ruxsat yo'q</h2>
      <p className="text-body-md text-on-surface-muted max-w-md mb-6">
        Sizning rolingizda ushbu sahifani ko'rish huquqi mavjud emas. Agar bu xatolik deb hisoblasangiz, tizim ma'muriga murojaat qiling.
      </p>
      <Link to="/">
        <Button variant="primary">Bosh sahifaga qaytish</Button>
      </Link>
    </div>
  );
};
