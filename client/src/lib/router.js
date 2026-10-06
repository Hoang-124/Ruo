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
        return { tab: 'equipment_detail', params: { id: segs[1] } };
      }
      return { tab: 'equipments', params: {} };
    }
    if (base === 'scan') {
      return { tab: 'scan', params: { qr: segs[1] || '' } };
    }
    if (base === 'transfers') {
      return { tab: 'transfers', params: {} };
    }
    if (base === 'repairs' || base === 'tickets') {
      return { tab: 'tickets_kanban', params: {} };
    }
    if (base === 'maintenance') {
      return { tab: 'maintenance', params: {} };
    }
    if (base === 'inventory') {
      return { tab: 'inventory', params: {} };
    }
    if (base === 'disposals') {
      return { tab: 'disposal_calc', params: {} };
    }
    if (base === 'map') {
      return { tab: 'map', params: {} };
    }
    if (base === 'admin') {
      const sub = segs[1];
      if (sub === 'audit') return { tab: 'audit_log', params: {} };
      if (sub === 'rbac') return { tab: 'rbac', params: {} };
      if (sub === 'users') return { tab: 'admin_users', params: {} };
    }

    return { tab: base, params: {} };
  }, [current]);

  const setTab = useCallback((tabId, queryParams = {}) => {
    const tabMap = {
      dashboard: '#/',
      equipments: '#/equipments',
      transfers: '#/transfers',
      tickets_kanban: '#/repairs',
      tickets: '#/repairs',
      maintenance: '#/maintenance',
      inventory: '#/inventory',
      disposal_calc: '#/disposals',
      map: '#/map',
      audit_log: '#/admin/audit',
      rbac: '#/admin/rbac'
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
