import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import { Profile, Role, RolePermission, RoleMetricAccess, PermissionModule } from '../types/database';
import { updateLastLogin } from '../api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  permissions: RolePermission[];
  metricAccess: RoleMetricAccess[];
  loading: boolean;
  signIn: (phone: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (module: PermissionModule, action?: 'view' | 'create' | 'edit' | 'delete' | 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => boolean;
  canViewMetric: (metricId: string) => boolean;
  canEnterFact: (metricId: string) => boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [metricAccess, setMetricAccess] = useState<RoleMetricAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (currentUser: User) => {
    try {
      // 1. Load Profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*, branch:branches(*)')
        .eq('id', currentUser.id)
        .single();

      if (profErr || !prof) {
        console.error('Profile not found:', profErr);
        setProfile(null);
        return;
      }
      setProfile(prof as Profile);

      // If user has a role, load role and permissions
      if (prof.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('id', prof.role_id)
          .single();
        setRole(roleData as Role);

        const { data: perms } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role_id', prof.role_id);
        setPermissions((perms || []) as RolePermission[]);

        const { data: access } = await supabase
          .from('role_metric_access')
          .select('*')
          .eq('role_id', prof.role_id);
        setMetricAccess((access || []) as RoleMetricAccess[]);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user);
    }
  }, [user, loadUserData]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setPermissions([]);
        setMetricAccess([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (phoneInput: string, pass: string) => {
    // Clean phone number (digits only)
    const digits = phoneInput.replace(/\D/g, '');
    const cleanPhone = digits.startsWith('998') ? digits : `998${digits}`;
    const syntheticEmail = `${cleanPhone}@users.haziniyssp.app`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: pass,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      setUser(data.user);
      await loadUserData(data.user);
      // Track last login activity
      try {
        await updateLastLogin();
      } catch (e) {
        console.warn('update_last_login failed:', e);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setPermissions([]);
    setMetricAccess([]);
  };

  // Permission checkers
  const can = useCallback((module: PermissionModule, action: 'view' | 'create' | 'edit' | 'delete' | 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'view'): boolean => {
    if (!profile || !profile.is_active) return false;
    if (profile.is_owner) return true;

    const perm = permissions.find((p) => p.module === module);
    if (!perm) return false;

    switch (action) {
      case 'view':
      case 'can_view':
        return perm.can_view === true;
      case 'create':
      case 'can_create':
        return perm.can_create === true;
      case 'edit':
      case 'can_edit':
        return perm.can_edit === true;
      case 'delete':
      case 'can_delete':
        return perm.can_delete === true;
      default:
        return false;
    }
  }, [profile, permissions]);

  const canViewMetric = useCallback((metricId: string): boolean => {
    if (!profile || !profile.is_active) return false;
    if (profile.is_owner) return true;
    const access = metricAccess.find((a) => a.metric_id === metricId);
    return access ? access.can_view === true : false;
  }, [profile, metricAccess]);

  const canEnterFact = useCallback((metricId: string): boolean => {
    if (!profile || !profile.is_active) return false;
    if (profile.is_owner) return true;
    const access = metricAccess.find((a) => a.metric_id === metricId);
    return access ? access.can_enter_fact === true : false;
  }, [profile, metricAccess]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        permissions,
        metricAccess,
        loading,
        signIn,
        signOut,
        can,
        canViewMetric,
        canEnterFact,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
