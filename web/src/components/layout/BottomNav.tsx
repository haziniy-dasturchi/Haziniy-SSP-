import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardPen,
  Gift,
  Menu,
  X,
  CalendarDays,
  Sparkles,
  Building,
  Network,
  Shield,
  Users,
  Settings2,
  FileSpreadsheet,
  History,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PermissionModule } from '../../types/database';

import { prefetchRoute } from '../../utils/prefetch';

interface MenuItem {
  to: string;
  label: string;
  icon: React.ElementType;
  module?: PermissionModule;
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/plans', label: 'Rejalar', icon: CalendarDays, module: 'monthly_plans' },
  { to: '/ai', label: 'AI Tahlil', icon: Sparkles, module: 'ai_analysis' },
  { to: '/branches', label: 'Filiallar', icon: Building, module: 'branches' },
  { to: '/structure', label: 'Tuzilma', icon: Network, module: 'structure' },
  { to: '/roles', label: 'Rollar', icon: Shield, module: 'roles' },
  { to: '/users', label: 'Xodimlar', icon: Users, module: 'users' },
  { to: '/evaluation', label: 'Baholash sozlamalari', icon: Settings2, module: 'evaluation' },
  { to: '/import', label: 'Import', icon: FileSpreadsheet, module: 'import' },
  { to: '/audit', label: 'Audit jurnali', icon: History, module: 'audit_log' },
  { to: '/profile', label: 'Mening profilim', icon: User },
];

export const BottomNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { can, signOut } = useAuth();
  const location = useLocation();

  const extraMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.module) return true;
    return can(item.module, 'can_view');
  });

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around z-40 px-2 shadow-lg">
        <NavLink
          to={{ pathname: '/', search: location.search }}
          onTouchStart={() => prefetchRoute('/')}
          onMouseEnter={() => prefetchRoute('/')}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-muted hover:text-on-surface'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">SSP</span>
        </NavLink>

        <NavLink
          to={{ pathname: '/facts', search: location.search }}
          onTouchStart={() => prefetchRoute('/facts')}
          onMouseEnter={() => prefetchRoute('/facts')}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-muted hover:text-on-surface'
            }`
          }
        >
          <ClipboardPen className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Fakt kiritish</span>
        </NavLink>

        <NavLink
          to={{ pathname: '/bonus', search: location.search }}
          onTouchStart={() => prefetchRoute('/bonus')}
          onMouseEnter={() => prefetchRoute('/bonus')}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
              isActive ? 'text-primary font-semibold' : 'text-on-surface-muted hover:text-on-surface'
            }`
          }
        >
          <Gift className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Bonusim</span>
        </NavLink>

        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
            isMenuOpen ? 'text-primary font-semibold' : 'text-on-surface-muted hover:text-on-surface'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Menyu</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative bg-surface rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto shadow-2xl border-t border-border z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-headline-sm font-semibold text-on-surface">Menyu</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md text-on-surface-muted hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2 space-y-1">
              {extraMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={{ pathname: item.to, search: location.search }}
                    onTouchStart={() => prefetchRoute(item.to)}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-md font-medium transition-colors ${
                        isActive
                          ? 'bg-secondary-soft text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-muted'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 text-on-surface-muted" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-md font-medium text-status-red hover:bg-[#FBE9E9] transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
