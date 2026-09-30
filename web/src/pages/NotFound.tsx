import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 rounded-full bg-surface-muted text-on-surface-muted flex items-center justify-center mb-4">
        <Search className="w-8 h-8" />
      </div>
      <h2 className="text-headline-md font-bold text-on-surface mb-2">Sahifa topilmadi</h2>
      <p className="text-body-md text-on-surface-muted max-w-md mb-6">
        Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.
      </p>
      <Link to="/">
        <Button variant="primary">Bosh sahifaga qaytish</Button>
      </Link>
    </div>
  );
};
