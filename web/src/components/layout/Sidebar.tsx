import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardPen,
  CalendarDays,
  Gift,
  Sparkles,
  Building,
  Network,
  Shield,
  Users,
  Settings2,
  FileSpreadsheet,
  History,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PermissionModule } from '../../types/database';

import { prefetchRoute } from '../../utils/prefetch';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  module?: PermissionModule;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'SSP', icon: LayoutDashboard, module: 'ssp' },
  { to: '/facts', label: 'Fakt kiritish', icon: ClipboardPen, module: 'fact_entry' },
  { to: '/plans', label: 'Rejalar', icon: CalendarDays, module: 'monthly_plans' },
  { to: '/bonus', label: 'Mening bonusim', icon: Gift, module: 'bonus' },
  { to: '/ai', label: 'AI Tahlil', icon: Sparkles, module: 'ai_analysis' },
  { to: '/branches', label: 'Filiallar', icon: Building, module: 'branches' },
  { to: '/structure', label: 'Tuzilma', icon: Network, module: 'structure' },
  { to: '/roles', label: 'Rollar', icon: Shield, module: 'roles' },
  { to: '/users', label: 'Xodimlar', icon: Users, module: 'users' },
  { to: '/evaluation', label: 'Baholash', icon: Settings2, module: 'evaluation' },
  { to: '/import', label: 'Import', icon: FileSpreadsheet, module: 'import' },
  { to: '/audit', label: 'Audit jurnali', icon: History, module: 'audit_log' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { can, profile, signOut } = useAuth();

  // Filter items based on permissions
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.module) return true;
    return can(item.module, 'can_view');
  });

  return (
    <aside
      className={`hidden md:flex flex-col bg-primary text-white border-r border-[#084A2E] transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#084A2E]">
        {collapsed ? (
          <img
            src="/brand/logo-mark-white.png"
            alt="Haziniy"
            className="w-9 h-9 object-contain mx-auto"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img
              src="/brand/logo-full-on-green.png"
              alt="Haziniy SSP"
              className="h-8 max-w-[170px] object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-md hover:bg-primary-hover text-white/80 hover:text-white transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          title={collapsed ? 'Kengaytirish' : 'Yig‘ish'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => prefetchRoute(item.to)}
              onTouchStart={() => prefetchRoute(item.to)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-label-md font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-hover text-white shadow-sm'
                    : 'text-white/85 hover:bg-primary-hover/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Footer */}
      <div className="p-2 border-t border-[#084A2E] space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-label-md font-medium transition-colors ${
              isActive ? 'bg-primary-hover text-white' : 'text-white/85 hover:bg-primary-hover/60 hover:text-white'
            } ${collapsed ? 'justify-center px-0' : ''}`
          }
          title={collapsed ? 'Mening profilim' : undefined}
        >
          <User className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="text-body-sm font-semibold truncate leading-tight">{profile?.full_name || 'Foydalanuvchi'}</p>
              <p className="text-[11px] text-white/60 truncate leading-none mt-0.5">Mening profilim</p>
            </div>
          )}
        </NavLink>

        <button
          onClick={signOut}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-label-md font-medium text-white/80 hover:text-red-200 hover:bg-red-900/30 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title={collapsed ? 'Chiqish' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Chiqish</span>}
        </button>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center py-2 text-white/60 hover:text-white transition-colors"
            title="Kengaytirish"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
