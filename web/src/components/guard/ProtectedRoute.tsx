import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PermissionModule } from '../../types/database';
import { Unauthorized } from '../../pages/Unauthorized';
import { Skeleton } from '../common/Skeleton';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: PermissionModule;
  action?: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  module,
  action = 'can_view',
}) => {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (module && !can(module, action)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};
