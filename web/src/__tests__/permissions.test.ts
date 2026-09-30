import { describe, it, expect } from 'vitest';
import { RolePermission, RoleMetricAccess } from '../types/database';

// Unit testing pure permission helper logic
function checkPermission(
  isOwner: boolean,
  permissions: RolePermission[],
  module: string,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
): boolean {
  if (isOwner) return true;
  const perm = permissions.find((p) => p.module === module);
  return !!perm?.[action];
}

function checkMetricAccess(
  isOwner: boolean,
  metricAccess: RoleMetricAccess[],
  metricId: string,
  type: 'can_view' | 'can_enter_fact'
): boolean {
  if (isOwner) return true;
  const access = metricAccess.find((a) => a.metric_id === metricId);
  return !!access?.[type];
}

describe('Role & Permission Helpers', () => {
  const dummyPermissions: RolePermission[] = [
    {
      id: 'p1',
      role_id: 'r1',
      module: 'fact_entry',
      can_view: true,
      can_create: true,
      can_edit: false,
      can_delete: false,
    },
    {
      id: 'p2',
      role_id: 'r1',
      module: 'ssp',
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
    },
  ];

  const dummyMetricAccess: RoleMetricAccess[] = [
    {
      id: 'a1',
      role_id: 'r1',
      metric_id: 'm1',
      can_view: true,
      can_enter_fact: true,
    },
    {
      id: 'a2',
      role_id: 'r1',
      metric_id: 'm2',
      can_view: true,
      can_enter_fact: false,
    },
  ];

  it('grants all permissions to owners unconditionally', () => {
    expect(checkPermission(true, [], 'users', 'can_delete')).toBe(true);
    expect(checkPermission(true, [], 'branches', 'can_create')).toBe(true);
    expect(checkMetricAccess(true, [], 'm999', 'can_enter_fact')).toBe(true);
  });

  it('checks granular module permissions for non-owners', () => {
    expect(checkPermission(false, dummyPermissions, 'fact_entry', 'can_view')).toBe(true);
    expect(checkPermission(false, dummyPermissions, 'fact_entry', 'can_create')).toBe(true);
    expect(checkPermission(false, dummyPermissions, 'fact_entry', 'can_delete')).toBe(false);
    expect(checkPermission(false, dummyPermissions, 'users', 'can_view')).toBe(false);
  });

  it('checks metric level view and fact entry access for non-owners', () => {
    expect(checkMetricAccess(false, dummyMetricAccess, 'm1', 'can_enter_fact')).toBe(true);
    expect(checkMetricAccess(false, dummyMetricAccess, 'm2', 'can_enter_fact')).toBe(false);
    expect(checkMetricAccess(false, dummyMetricAccess, 'm3', 'can_view')).toBe(false);
  });
});
