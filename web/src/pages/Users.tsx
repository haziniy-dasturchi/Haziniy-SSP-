import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  KeyRound,
  Edit2,
  Trash2,
  Copy,
  Check,
  Shield,
  Building,
  UserCheck,
  UserX,
  Phone,
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { fetchProfiles, fetchRoles, fetchBranches, adminUsersAction } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Skeleton } from '../components/common/Skeleton';
import { formatDate } from '../i18n/uz';
import { Profile, Role, Branch } from '../types/database';

function generateRandomPassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export const Users: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canCreate = can('users', 'can_create');
  const canEdit = can('users', 'can_edit');
  const canDelete = can('users', 'can_delete');

  const { data: users = [], isLoading: usersLoading } = useQuery<Profile[]>({
    queryKey: ['users-list'],
    queryFn: fetchProfiles,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form States
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('998');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [copied, setCopied] = useState(false);

  // Password Generator Handler
  const handleGeneratePassword = () => {
    const newPass = generateRandomPassword(10);
    setPassword(newPass);
    setCopied(false);
  };

  const handleCopyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 12) {
        throw new Error("Telefon raqami 12 ta raqam bo'lishi kerak (masalan 998901234567)");
      }
      if (password.length < 8) {
        throw new Error("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
      }

      return adminUsersAction('create', {
        full_name: fullName.trim(),
        phone: cleanPhone,
        password,
        role_id: roleId,
        branch_id: branchId || null,
        is_active: true,
      });
    },
    onSuccess: () => {
      success('Yangi xodim muvaffaqiyatli yaratildi');
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xodimni yaratishda xatolik yuz berdi');
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!targetUser) return;
      return adminUsersAction('update', {
        user_id: targetUser.id,
        full_name: fullName.trim(),
        role_id: roleId,
        branch_id: branchId || null,
      });
    },
    onSuccess: () => {
      success('Xodim ma‘lumotlari yangilandi');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!targetUser) return;
      if (password.length < 8) {
        throw new Error("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak");
      }
      return adminUsersAction('reset_password', {
        user_id: targetUser.id,
        new_password: password,
      });
    },
    onSuccess: () => {
      success('Parol muvaffaqiyatli yangilandi');
      setResetModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.message || 'Parolni tiklashda xatolik yuz berdi');
    },
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (u: Profile) => {
      return adminUsersAction('set_active', {
        user_id: u.id,
        is_active: !u.is_active,
      });
    },
    onSuccess: () => {
      success('Xodim holati o‘zgartirildi');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!targetUser) return;
      return adminUsersAction('delete', {
        user_id: targetUser.id,
      });
    },
    onSuccess: () => {
      success('Xodim tizimdan o‘chirildi');
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  if (usersLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Xodimlar Boshqaruvi</h1>
          <p className="text-body-sm text-on-surface-muted">
            Tizim foydalanuvchilari, rollar, filiallar va parollarni boshqarish
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            onClick={() => {
              setFullName('');
              setPhone('998');
              setPassword(generateRandomPassword(10));
              setRoleId(roles[0]?.id || '');
              setBranchId(branches[0]?.id || '');
              setCopied(false);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Yangi xodim</span>
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Ism Familiya</th>
                <th className="py-3.5 px-4 font-semibold">Telefon</th>
                <th className="py-3.5 px-4 font-semibold">Rol</th>
                <th className="py-3.5 px-4 font-semibold">Filial</th>
                <th className="py-3.5 px-4 font-semibold text-center">Holat</th>
                <th className="py-3.5 px-4 font-semibold">Oxirgi kirish</th>
                <th className="py-3.5 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-on-surface">
                    <div className="flex items-center gap-2">
                      <span>{u.full_name}</span>
                      {u.is_owner && (
                        <span className="text-[10px] uppercase font-bold bg-[#E3F5EA] text-[#17703D] px-2 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-on-surface">
                    +{u.phone}
                  </td>

                  <td className="py-3.5 px-4 text-on-surface">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-muted font-medium text-xs">
                      <Shield className="w-3 h-3 text-on-surface-muted" />
                      {u.role?.name || '—'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-on-surface-muted">
                    {u.branch?.name || (u.is_owner ? 'Barchasi' : '—')}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {u.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E3F5EA] text-[#17703D]">
                        Faol
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FBE9E9] text-[#B33636]">
                        Nofaol
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-on-surface-muted">
                    {u.last_login_at ? formatDate(u.last_login_at) : 'Kirmagan'}
                  </td>

                  <td className="py-3.5 px-4 text-right space-x-1">
                    {/* Reset Password */}
                    {canEdit && (
                      <button
                        onClick={() => {
                          setTargetUser(u);
                          setPassword(generateRandomPassword(10));
                          setCopied(false);
                          setResetModalOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-surface-muted text-on-surface-muted hover:text-primary transition-colors"
                        title="Parolni yangilash"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    )}

                    {/* Edit Profile */}
                    {canEdit && (
                      <button
                        onClick={() => {
                          setTargetUser(u);
                          setFullName(u.full_name);
                          setRoleId(u.role_id || '');
                          setBranchId(u.branch_id || '');
                          setEditModalOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-surface-muted text-on-surface-muted hover:text-on-surface transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Toggle Active */}
                    {canEdit && !u.is_owner && (
                      <button
                        onClick={() => toggleActiveMutation.mutate(u)}
                        className={`p-1.5 rounded hover:bg-surface-muted transition-colors ${
                          u.is_active ? 'text-[#B33636]' : 'text-[#17703D]'
                        }`}
                        title={u.is_active ? 'Faolsizlantirish' : 'Faollashtirish'}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Delete */}
                    {canDelete && !u.is_owner && (
                      <button
                        onClick={() => {
                          setTargetUser(u);
                          setDeleteDialogOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-[#FBE9E9] text-on-surface-muted hover:text-[#B33636] transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yangi xodim qo‘shish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
            >
              Yaratish
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Ism va Familiya"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alisher Karimov"
            required
          />

          <Input
            label="Telefon raqami (12 ta raqam)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="998901234567"
            required
          />

          <div>
            <label className="text-label-md font-semibold text-on-surface block mb-1.5">
              Parol
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parol"
                className="font-mono text-body-md"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGeneratePassword}
                className="shrink-0 text-xs px-3"
              >
                Generatsiya
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyPassword}
                className="shrink-0 p-2.5"
                title="Nusxa olish"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && <span className="text-xs text-primary mt-1 block">Parol nusxalandi!</span>}
          </div>

          <Select
            label="Rol"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />

          <Select
            label="Filial"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={[
              { value: '', label: 'Biriktirilmagan' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Xodim ma‘lumotlarini tahrirlash"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Ism va Familiya"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Select
            label="Rol"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />

          <Select
            label="Filial"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            options={[
              { value: '', label: 'Biriktirilmagan' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Parolni yangilash"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => resetPasswordMutation.mutate()}
              loading={resetPasswordMutation.isPending}
            >
              Yangilash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-body-sm text-on-surface-muted">
            <strong>{targetUser?.full_name}</strong> uchun yangi parol o'rnating:
          </p>

          <div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yangi parol"
                className="font-mono text-body-md"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleGeneratePassword}
                className="shrink-0 text-xs px-3"
              >
                Generatsiya
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyPassword}
                className="shrink-0 p-2.5"
                title="Nusxa olish"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && <span className="text-xs text-primary mt-1 block">Parol nusxalandi!</span>}
          </div>
        </div>
      </Modal>

      {/* Delete User Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Xodimni o'chirish"
        message={`Haqiqatan ham "${targetUser?.full_name}" xodimini tizimdan butunlay o'chirib tashlamoqchimisiz?`}
      />
    </div>
  );
};
