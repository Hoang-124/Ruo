import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Dashboard } from './Dashboard';

const state = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { _id: 'u1', role: state.role }, currentRoleKey: state.role }) }));
vi.mock('../../lib/api', () => {
  const empty = vi.fn().mockResolvedValue({});
  return { equipmentApi: { list: empty }, repairApi: { list: empty }, movementApi: { list: empty },
    disposalApi: { list: empty }, auditApi: { getLogs: empty, verifyChain: empty }, reportApi: {},
    facilityApi: { getCadCanvas: vi.fn().mockResolvedValue({ rooms: [] }) } };
});
vi.mock('../../components/common/FloorPlan2D', () => ({ FloorPlan2D: () => <div>Sơ đồ CAD 5 tầng</div> }));
vi.mock('./DashboardAnalytics', () => ({ DashboardAnalytics: () => <section>Phân tích quản lý</section> }));
afterEach(cleanup);

it.each(['admin', 'facility_manager', 'technician', 'lecturer'])('%s sees CAD; management analytics is role restricted', async role => {
  state.role = role;
  render(<Dashboard onNavigateTab={() => {}} />);
  expect(await screen.findByText('Sơ đồ CAD 5 tầng')).toBeTruthy();
  if (['admin', 'facility_manager'].includes(role)) expect(screen.getByText('Phân tích quản lý')).toBeTruthy();
  else expect(screen.queryByText('Phân tích quản lý')).toBeNull();
});
