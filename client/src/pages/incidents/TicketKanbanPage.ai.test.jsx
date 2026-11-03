import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TicketKanbanPage } from './TicketKanbanPage';

const mocks = vi.hoisted(() => ({
  listRepairs: vi.fn(),
  getSlaStats: vi.fn(),
  aiCopilot: vi.fn(),
  assignRepair: vi.fn(),
  listUsers: vi.fn(),
  listEquipments: vi.fn(),
  getRooms: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));

vi.mock('../../lib/api', () => ({
  repairApi: {
    list: mocks.listRepairs,
    getSlaStats: mocks.getSlaStats,
    aiCopilot: mocks.aiCopilot,
    assign: mocks.assignRepair
  },
  authApi: {
    listUsers: mocks.listUsers
  },
  equipmentApi: {
    list: mocks.listEquipments
  },
  masterDataApi: {
    getRooms: mocks.getRooms
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('runs AI dispatch copilot in Assign Modal and applies optimal technician + spare equipment', async () => {
  mocks.listRepairs.mockResolvedValue({
    success: true,
    repairs: [
      {
        _id: 'rep-202',
        ticket_code: 'REP-2026-202',
        status: 'reported',
        damage_level: 'major',
        incident_description: 'Máy chiếu mất nguồn',
        equipment_id: { _id: 'eq-202', code: 'EQ-202', name: 'Máy chiếu Sony' },
        room_id: { _id: 'room-202', code: 'P202', name: 'Phòng 202' }
      }
    ]
  });
  mocks.getSlaStats.mockResolvedValue({ success: true, data: null });
  mocks.listUsers.mockResolvedValue({
    success: true,
    users: [
      { _id: 'tech-1', full_name: 'Trần Bận Rộn', code: 'KT01', department: 'Tổ Điện' },
      { _id: 'tech-2', full_name: 'Nguyễn Sẵn Sàng', code: 'KT02', department: 'Tổ Nghe Nhìn' }
    ]
  });
  mocks.listEquipments.mockResolvedValue({
    success: true,
    // The recommended asset is outside the first page of the warehouse list.
    equipments: []
  });
  mocks.getRooms.mockResolvedValue({ success: true, rooms: [] });
  mocks.aiCopilot.mockResolvedValue({
    success: true,
    copilot: {
      engine: 'domain_heuristic',
      diagnosis: { root_cause: 'Lỗi bo nguồn cấp.' },
      recommended_parts: [],
      disposal_advisory: { should_consider_disposal: false, r_ratio: 20 },
      dispatch_recommendation: {
        recommended_technician: {
          _id: 'tech-2',
          full_name: 'Nguyễn Sẵn Sàng',
          code: 'KT02',
          score: 93,
          reason: 'Đang xử lý 0 phiếu • 0 quá hạn SLA'
        },
        recommended_replacement: {
          _id: 'spare-eq-1',
          code: 'EQ-SPARE-01',
          name: 'Máy chiếu Epson dự phòng'
        },
        suggested_damage_level: 'major',
        suggested_deadline: '2026-11-03T15:00:00.000Z'
      }
    }
  });
  mocks.assignRepair.mockResolvedValue({ success: true });

  render(<TicketKanbanPage />);
  expect(await screen.findByText('REP-2026-202')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /Giao KTV & Cấp Đồ/i }));
  fireEvent.click(screen.getByRole('button', { name: /Gợi Ý Từ AI/i }));

  await waitFor(() => expect(mocks.aiCopilot).toHaveBeenCalledWith('rep-202'));
  await screen.findByText('EQ-SPARE-01');

  fireEvent.click(screen.getByRole('button', { name: /Áp Dụng Gợi Ý/i }));
  expect(screen.getByRole('option', { name: /EQ-SPARE-01/ }).selected).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Giao Việc/i }));

  await waitFor(() => expect(mocks.assignRepair).toHaveBeenCalledTimes(1));
  expect(mocks.assignRepair.mock.calls[0][1].assigned_to).toBe('tech-2');
  expect(mocks.assignRepair.mock.calls[0][1].replacement_equipment_id).toBe('spare-eq-1');
  expect(mocks.assignRepair.mock.calls[0][1].deadline.toISOString()).toBe('2026-11-03T15:00:00.000Z');
});
