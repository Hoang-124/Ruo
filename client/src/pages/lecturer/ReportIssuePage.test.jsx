import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReportIssuePage } from './ReportIssuePage';

const mocks = vi.hoisted(() => ({
  getRooms: vi.fn(),
  listEquipments: vi.fn(),
  aiTriage: vi.fn(),
  createRepair: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));

vi.mock('../../lib/api', () => ({
  masterDataApi: {
    getRooms: mocks.getRooms
  },
  equipmentApi: {
    list: mocks.listEquipments
  },
  repairApi: {
    aiTriage: mocks.aiTriage,
    create: mocks.createRepair
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('runs AI incident triage, warns about duplicate open tickets, and applies priority + standardized description', async () => {
  mocks.getRooms.mockResolvedValue({
    rooms: [{ _id: 'room-301', code: 'P301', name: 'Phòng lý thuyết 301', building: 'A1', floor: 3, room_type: 'lecture' }]
  });
  mocks.listEquipments.mockResolvedValue({
    equipments: [{ _id: 'eq-101', code: 'EQ-2026-101', name: 'Máy chiếu Epson', brand: 'Epson', model: 'EB-L200F', status: 'in_use' }]
  });
  mocks.aiTriage.mockResolvedValue({
    success: true,
    triage: {
      engine: 'domain_heuristic',
      suggested_damage_level: 'critical',
      confidence: 95,
      sla_label: 'Khẩn cấp 8 giờ (24/7)',
      refined_description: '[P301 - EQ-2026-101] Máy chiếu Epson: Bốc khói khét tại cụm nguồn trần, cần cô lập điện khẩn cấp.',
      reasoning: 'Có dấu hiệu mất an toàn điện nghiêm trọng.',
      quick_checks: ['Ngắt cầu dao nhánh thiết bị ngay lập tức'],
      has_exact_duplicate: true,
      duplicate_tickets: [
        { _id: 'dup-1', ticket_code: 'REP-DUP-001', status: 'reported', incident_description: 'Máy chiếu có mùi khét' }
      ]
    }
  });
  mocks.createRepair.mockResolvedValue({
    success: true,
    repair: { ticket_code: 'REP-NEW-999' }
  });

  render(<ReportIssuePage />);
  expect((await screen.findAllByText(/EQ-2026-101/)).length).toBeGreaterThanOrEqual(1);

  const textarea = screen.getByPlaceholderText(/Máy chiếu bật không lên nguồn/i);
  fireEvent.change(textarea, { target: { value: 'Máy chiếu bốc khói khét ở ổ điện trần' } });

  fireEvent.click(screen.getByRole('button', { name: /AI Phân Loại & Kiểm Tra Trùng Lặp/i }));
  await waitFor(() => expect(mocks.aiTriage).toHaveBeenCalledTimes(1));

  expect(await screen.findByText(/REP-DUP-001/)).toBeTruthy();
  expect(screen.getByText(/Đề xuất: CRITICAL/i)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /Áp Dụng Gợi Ý AI/i }));
  expect(textarea.value).toContain('[P301 - EQ-2026-101] Máy chiếu Epson');

  fireEvent.click(screen.getByRole('button', { name: /Gửi Báo Hỏng Ngay/i }));
  await waitFor(() => expect(mocks.createRepair).toHaveBeenCalledTimes(1));
  expect(mocks.createRepair.mock.calls[0][0].damage_level).toBe('critical');
});
