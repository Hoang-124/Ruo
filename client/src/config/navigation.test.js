import { describe, it, expect } from 'vitest';
import {
  USER_ROLES,
  getNavItemsForRole,
  isTabAllowedForRole,
  isSameUser
} from './navigation';

const DEFAULT_ROLE_PERMS = {
  [USER_ROLES.LECTURER]: [
    'user:profile:read', 'room:read', 'equipment:read', 'equipment:qr:scan',
    'incident:create', 'incident:read_own', 'repair:rate'
  ],
  [USER_ROLES.TECHNICIAN]: [
    'user:profile:read', 'room:read', 'equipment:read', 'equipment:create',
    'equipment:update', 'equipment:qr:scan', 'warranty:read', 'warranty:update',
    'movement:confirm', 'incident:create', 'repair:read_assigned', 'repair:accept',
    'repair:log', 'repair:report_outcome', 'parts:request', 'inventory:scan', 'inventory:export'
  ],
  [USER_ROLES.FACILITY_MANAGER]: [
    'user:profile:read', 'room:read', 'equipment:read', 'equipment:create',
    'equipment:update', 'equipment:import', 'equipment:dispose', 'equipment:qr:generate',
    'equipment:qr:scan', 'warranty:read', 'warranty:update', 'movement:order',
    'placement:decide', 'incident:create', 'repair:read', 'repair:assign',
    'repair:close', 'parts:approve', 'spare_part:update', 'inventory:create',
    'inventory:scan', 'inventory:reconcile', 'inventory:export', 'disposal:propose',
    'dashboard:read', 'report:export'
  ],
  [USER_ROLES.ADMIN]: [
    'user:profile:read', 'user:create', 'user:update', 'user:lock',
    'user:reset_password', 'user:approve', 'role:update', 'room:read', 'room:*',
    'category:*', 'supplier:*', 'repair_unit:*', 'equipment:read', 'equipment:create',
    'equipment:update', 'equipment:import', 'equipment:dispose', 'equipment:qr:generate',
    'equipment:qr:scan', 'warranty:read', 'warranty:update', 'movement:order',
    'incident:create', 'inventory:create', 'inventory:reconcile', 'inventory:export',
    'disposal:approve', 'dashboard:read', 'report:export', 'audit:read',
    'audit:verify', 'audit:export', 'system:health'
  ]
};

const makeHasPermission = (role) => {
  const perms = DEFAULT_ROLE_PERMS[role] || [];
  return (code) => {
    if (!code) return false;
    if (perms.includes('*') || perms.includes(code)) return true;
    const prefix = String(code).split(':')[0];
    return Boolean(prefix && perms.includes(`${prefix}:*`));
  };
};

describe('RBAC Navigation & Tab Isolation (4 Canonical Roles)', () => {
  it('blocks lecturer from movements, inventory, disposal_propose, tickets_kanban, warehouse, and admin tabs', () => {
    const hasPerm = makeHasPermission(USER_ROLES.LECTURER);
    const tabs = getNavItemsForRole(USER_ROLES.LECTURER, hasPerm).map((i) => i.id);

    expect(tabs).toEqual(
      expect.arrayContaining([
        'dashboard',
        'transfer_history',
        'rooms',
        'report_issue',
        'my_tickets',
        'qr_scanner',
        'equipments'
      ])
    );

    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'movements', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'inventory', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'disposal_propose', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'tickets_kanban', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'warehouse', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'users', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.LECTURER, 'rbac', hasPerm)).toBe(false);
  });

  it('blocks technician from movements (FM/Admin order page), disposal_propose, and admin tabs', () => {
    const hasPerm = makeHasPermission(USER_ROLES.TECHNICIAN);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'assigned_tasks', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'movement_tasks', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'spare_parts', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'inventory', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'movements', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'disposal_propose', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.TECHNICIAN, 'users', hasPerm)).toBe(false);
  });

  it('grants facility_manager access to operational management tabs and blocks admin-only tabs', () => {
    const hasPerm = makeHasPermission(USER_ROLES.FACILITY_MANAGER);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'tickets_kanban', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'movements', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'warehouse', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'inventory', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'disposal_propose', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'users', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'rbac', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.FACILITY_MANAGER, 'disposal_approval', hasPerm)).toBe(false);
  });

  it('grants admin access to governance tabs and blocks lecturer/technician personal tabs', () => {
    const hasPerm = makeHasPermission(USER_ROLES.ADMIN);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'users', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'rbac', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'master_data', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'disposal_approval', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'audit_log', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'movements', hasPerm)).toBe(true);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'report_issue', hasPerm)).toBe(false);
    expect(isTabAllowedForRole(USER_ROLES.ADMIN, 'assigned_tasks', hasPerm)).toBe(false);
  });

  it('safely matches populated user objects and raw IDs without matching undefined/guest', () => {
    const user = { _id: '67a001', id: '67a001', code: 'GV001', email: 'gv@ruo.edu.vn' };
    expect(isSameUser({ _id: '67a001' }, user)).toBe(true);
    expect(isSameUser('67a001', user)).toBe(true);
    expect(isSameUser({ code: 'GV001' }, user)).toBe(true);
    expect(isSameUser({ _id: '67a999', code: 'GV999' }, user)).toBe(false);
    expect(isSameUser(null, user)).toBe(false);
    expect(isSameUser({}, { _id: 'guest', id: 'guest' })).toBe(false);
  });
});
