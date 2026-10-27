import React from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { disposalApi, facilityApi } from '../../lib/api';

const state = vi.hoisted(() => ({ role: 'admin' }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { _id: 'u1', role: state.role }, currentRoleKey: state.role }) }));
vi.mock('../../lib/api', () => {
  const empty = vi.fn().mockResolvedValue({});
  return { equipmentApi: { list: empty }, repairApi: { list: empty }, movementApi: { list: empty },
    disposalApi: { list: vi.fn().mockResolvedValue({}) }, auditApi: { getLogs: empty, verifyChain: empty }, reportApi: {},
    facilityApi: { getCadCanvas: vi.fn().mockResolvedValue({ rooms: [] }) } };
});
vi.mock('../../components/common/FloorPlan2D', () => ({ FloorPlan2D: () => <div>Sơ đồ CAD 5 tầng</div> }));
vi.mock('./DashboardAnalytics', () => ({ DashboardAnalytics: () => <section>Phân tích quản lý</section> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['admin', 'facility_manager', 'technician', 'lecturer'])('%s sees CAD; management analytics is role restricted', async role => {
  state.role = role;
  render(<Dashboard onNavigateTab={() => {}} />);
  expect(await screen.findByText('Sơ đồ CAD 5 tầng')).toBeTruthy();
  if (['admin', 'facility_manager'].includes(role)) expect(screen.getByText('Phân tích quản lý')).toBeTruthy();
  else expect(screen.queryByText('Phân tích quản lý')).toBeNull();
});

it('renders localized CAD equipment badges, preserves architectural floor area, and filters BGH disposals to hc_approved', async () => {
  state.role = 'admin';
  facilityApi.getCadCanvas.mockResolvedValueOnce({
    rooms: [{
      code: 'A1-PH-TB',
      name: 'PH (Phòng Học & Tự Học)',
      room_type: 'lecture',
      capacity: 65,
      status: 'available',
      effectiveStatus: 'maintenance',
      equipmentCount: 2,
      brokenCount: 1,
      equipments: [
        { _id: 'eq1', code: 'EQ-01', name: 'Màn hình LED', status: 'in_use' },
        { _id: 'eq2', code: 'EQ-02', name: 'Kiosk tra cứu', status: 'broken' }
      ]
    }]
  });
  disposalApi.list.mockResolvedValueOnce({
    proposals: [
      { _id: 'd1', status: 'proposed', reason: 'Chờ CSVC duyệt', equipment_id: { code: 'OLD-1', name: 'TB bước 1' } },
      { _id: 'd2', status: 'hc_approved', reason: 'Đã qua thẩm định CSVC', recovery_value: 500000, equipment_id: { code: 'OLD-2', name: 'TB chờ BGH' } }
    ]
  });

  render(<Dashboard onNavigateTab={() => {}} />);
  expect(await screen.findByText('Đang sử dụng')).toBeTruthy();
  expect(screen.getByText('Hỏng')).toBeTruthy();
  expect(screen.queryByText('in_use')).toBeNull();
  expect(screen.getByText('95 m²')).toBeTruthy();
  expect(screen.getByText(/OLD-2 — TB chờ BGH/)).toBeTruthy();
  expect(screen.queryByText(/OLD-1 — TB bước 1/)).toBeNull();
});
