import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Building, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../api/supabase';
import { fetchBranches } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Branch } from '../types/database';

export const Branches: React.FC = () => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const canCreate = can('branches', 'can_create');
  const canEdit = can('branches', 'can_edit');
  const canDelete = can('branches', 'can_delete');

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches-admin'],
    queryFn: fetchBranches,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const openCreateModal = () => {
    setEditingBranch(null);
    setName('');
    setAddress('');
    setPhone('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setName(b.name);
    setAddress(b.address || '');
    setPhone(b.phone || '');
    setIsActive(b.is_active);
    setModalOpen(true);
  };

  // Upsert mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Filial nomini kiriting');
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        is_active: isActive,
      };

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', editingBranch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      success(editingBranch ? 'Filial yangilandi' : 'Yangi filial qo‘shildi');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['branches-admin'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Xatolik yuz berdi');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!branchToDelete) return;
      const { error } = await supabase.from('branches').delete().eq('id', branchToDelete.id);
      if (error) throw error;
    },
    onSuccess: () => {
      success('Filial o‘chirildi');
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['branches-admin'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => {
      toastError(err.message || 'Filialni o‘chirishda xatolik yuz berdi');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Filiallar</h1>
          <p className="text-body-sm text-on-surface-muted">
            O'quv markazining barcha faol filiallari ro'yxati va sozlamalari
          </p>
        </div>

        {canCreate && (
          <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Yangi filial</span>
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted text-on-surface-muted border-b border-border text-label-sm uppercase tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Filial nomi</th>
                <th className="py-3.5 px-4 font-semibold">Manzil</th>
                <th className="py-3.5 px-4 font-semibold">Telefon</th>
                <th className="py-3.5 px-4 font-semibold text-center">Holat</th>
                <th className="py-3.5 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-muted">
                    Filiallar topilmadi
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="py-4 px-4 font-semibold text-on-surface flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-primary" />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-4 px-4 text-on-surface-muted">
                      {b.address || '—'}
                    </td>
                    <td className="py-4 px-4 text-on-surface font-mono">
                      {b.phone || '—'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {b.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F5EA] text-[#17703D]">
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-muted text-on-surface-muted">
                          Nofaol
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded hover:bg-surface-muted text-on-surface-muted hover:text-on-surface transition-colors inline-block"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            setBranchToDelete(b);
                            setDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-[#FBE9E9] text-on-surface-muted hover:text-[#B33636] transition-colors inline-block"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBranch ? 'Filialni tahrirlash' : 'Yangi filial qo‘shish'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Filial nomi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Farg'ona markaz"
            required
          />
          <Input
            label="Manzil"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Al-Farg'oniy ko'chasi 42-uy"
          />
          <Input
            label="Telefon raqami"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 73 123 45 67"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none text-body-md text-on-surface pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border-strong focus:ring-secondary"
            />
            <span>Faol filial</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Filialni o'chirish"
        message={`Haqiqatan ham "${branchToDelete?.name}" filialini o'chirib tashlamoqchimisiz?`}
      />
    </div>
  );
};
