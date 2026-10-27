import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RoomListPage } from './RoomListPage';
import { EquipmentBlockerList } from './RoomDeactivateModal';
import { facilityApi } from '../../lib/api';

const authState = vi.hoisted(() => ({ role: 'admin' }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { _id: 'u1', role: authState.role } })
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } })
}));

vi.mock('../../lib/api', () => ({
  facilityApi: {
    getAllRooms: vi.fn(),
    getRoomByCode: vi.fn(),
    getRoomMaintenanceHistory: vi.fn()
  },
  movementApi: { order: vi.fn() }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RoomListPage RBAC (UC-2.1 .. UC-2.6)', () => {
  it('shows create, edit, status and deactivate actions only to admin', async () => {
    const sampleRoom = { _id: 'r1', code: 'P101', name: 'Phòng 101', floor: 1, room_type: 'lecture', capacity: 40, status: 'available' };
    facilityApi.getAllRooms.mockResolvedValue({ rooms: [sampleRoom], total: 1, totalPages: 1 });

    authState.role = 'admin';
    const adminView = render(<RoomListPage />);
    expect(await screen.findByText('Phòng 101')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thêm Phòng/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sửa/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trạng thái/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ngừng/i })).toBeTruthy();
    adminView.unmount();

    for (const nonAdminRole of ['facility_manager', 'technician', 'lecturer']) {
      authState.role = nonAdminRole;
      const view = render(<RoomListPage />);
      expect(await screen.findByText('Phòng 101')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Chi Tiết/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Thêm Phòng/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Sửa/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Trạng thái/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Ngừng/i })).toBeNull();
      view.unmount();
    }
  });
});

describe('EquipmentBlockerList RACI transfer alignment (UC-2.5 / UC-2.6)', () => {
  const room = { _id: 'r1', code: 'P101', name: 'Phòng 101' };
  const blockers = [
    { _id: 'e1', code: 'EQ-01', name: 'Máy chiếu', status: 'in_use' },
    { _id: 'e2', code: 'EQ-02', name: 'Loa hội trường', status: 'in_use', pendingMovement: { status: 'awaiting_approval', toRoomCode: 'KHO-01' } }
  ];

  it('shows RACI read-only transfer state to admin instead of a 403 transfer button', () => {
    authState.role = 'admin';
    render(<EquipmentBlockerList items={blockers} room={room} />);
    expect(screen.getByText('Cần điều chuyển')).toBeTruthy();
    expect(screen.getByText('Chờ CSVC duyệt → KHO-01')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Điều chuyển/i })).toBeNull();
    expect(screen.getByText(/Theo phân quyền RACI/)).toBeTruthy();
  });

  it('exposes the transfer order button to facility_manager', () => {
    authState.role = 'facility_manager';
    render(<EquipmentBlockerList items={blockers} room={room} />);
    expect(screen.getByRole('button', { name: /Điều chuyển/i })).toBeTruthy();
    expect(screen.getByText('Chờ CSVC duyệt → KHO-01')).toBeTruthy();
  });
});
