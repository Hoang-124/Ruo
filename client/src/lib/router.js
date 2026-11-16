/**
 * Ruo UEMS — Lightweight Zero-Dependency Native Hash Router
 * Listens to window.location.hash and triggers reactive updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export const parseHash = (hashString = window.location.hash) => {
  const raw = hashString.replace(/^#\/?/, '') || '';
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  const query = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    for (const [key, val] of searchParams.entries()) {
      query[key] = val;
    }
  }

  return {
    raw,
    path: '/' + (segments.join('/') || ''),
    segments,
    query
  };
};

export const navigate = (toHash) => {
  const clean = toHash.startsWith('#') ? toHash : `#/${toHash.replace(/^\//, '')}`;
  if (window.location.hash !== clean) {
    window.location.hash = clean;
  }
};

export const useRouter = () => {
  const [current, setCurrent] = useState(() => parseHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrent(parseHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const routeMatch = useMemo(() => {
    const segs = current.segments;
    const base = segs[0] || 'dashboard';

    // Route matching table
    if (segs.length === 0 || base === 'dashboard') {
      return { tab: 'dashboard', params: {} };
    }
    if (base === 'equipments') {
      if (segs[1]) {
        return { tab: 'equipments', params: { id: segs[1] } };
      }
      return { tab: 'equipments', params: {} };
    }
    if (base === 'scan' || base === 'qr_scanner' || base === 'qr-scanner') {
      return { tab: 'qr_scanner', params: { qr: segs[1] || '' } };
    }
    if (base === 'transfers' || base === 'transfer_history' || base === 'transfer-history') {
      return { tab: 'transfer_history', params: {} };
    }
    if (base === 'movements') {
      return { tab: 'movements', params: {} };
    }
    if (base === 'repairs' || base === 'tickets' || base === 'tickets_kanban' || base === 'tickets-kanban') {
      return { tab: 'tickets_kanban', params: {} };
    }
    if (base === 'technician-tasks' || base === 'assigned-tasks' || base === 'assigned_tasks') {
      return { tab: 'assigned_tasks', params: {} };
    }
    if (base === 'report-issue' || base === 'report_issue') {
      return { tab: 'report_issue', params: {} };
    }
    if (base === 'my-tickets' || base === 'my_tickets') {
      return { tab: 'my_tickets', params: {} };
    }
    if (base === 'spare-parts' || base === 'spare_parts') {
      return { tab: 'spare_parts', params: {} };
    }
    if (base === 'movement-tasks' || base === 'movement_tasks') {
      return { tab: 'movement_tasks', params: {} };
    }
    if (base === 'warehouse' || base === 'warehouse-stock' || base === 'warehouse_stock') {
      return { tab: 'warehouse', params: {} };
    }
    if (base === 'reports') {
      return { tab: 'reports', params: {} };
    }
    if (base === 'master-data' || base === 'master_data') {
      return { tab: 'master_data', params: {} };
    }
    if (base === 'rooms') {
      return { tab: 'rooms', params: {} };
    }
    if (base === 'maintenance') return { tab: 'maintenance', params: {} };
    if (base === 'inventory') {
      return { tab: 'inventory', params: {} };
    }
    if (base === 'disposals' || base === 'disposal_propose' || base === 'disposal-propose') {
      return { tab: 'disposal_propose', params: {} };
    }
    if (base === 'disposal_approval' || base === 'disposal-approval') {
      return { tab: 'disposal_approval', params: {} };
    }
    if (base === 'map') {
      return { tab: 'dashboard', params: {} };
    }
    if (base === 'admin') {
      const sub = segs[1];
      if (sub === 'audit' || sub === 'audit_log' || sub === 'audit-log') return { tab: 'audit_log', params: {} };
      if (sub === 'rbac') return { tab: 'rbac', params: {} };
      if (sub === 'users') return { tab: 'users', params: {} };
      if (sub === 'master-data' || sub === 'master_data') return { tab: 'master_data', params: {} };
    }

    const normalized = base.replace(/-/g, '_');
    return { tab: normalized, params: {} };
  }, [current]);

  const setTab = useCallback((tabId, queryParams = {}) => {
    const tabMap = {
      dashboard: '#/',
      equipments: '#/equipments',
      rooms: '#/rooms',
      qr_scanner: '#/scan',
      transfers: '#/transfers',
      transfer_history: '#/transfers',
      movements: '#/movements',
      tickets_kanban: '#/repairs',
      tickets: '#/repairs',
      repairs: '#/repairs',
      maintenance: '#/maintenance',
      inventory: '#/inventory',
      disposal_propose: '#/disposal_propose',
      disposal_approval: '#/disposal_approval',
      disposal_calc: '#/disposal_propose',
      map: '#/map',
      users: '#/admin/users',
      audit_log: '#/admin/audit',
      rbac: '#/admin/rbac',
      master_data: '#/admin/master-data',
      report_issue: '#/report-issue',
      my_tickets: '#/my-tickets',
      assigned_tasks: '#/technician-tasks',
      spare_parts: '#/spare-parts',
      movement_tasks: '#/movement-tasks',
      warehouse: '#/warehouse',
      reports: '#/reports'
    };

    let target = tabMap[tabId] || `#/${tabId}`;
    const qs = new URLSearchParams(queryParams).toString();
    if (qs) target += `?${qs}`;
    navigate(target);
  }, []);

  return {
    ...current,
    tab: routeMatch.tab,
    params: routeMatch.params,
    navigate,
    setTab
  };
};

export default useRouter;
