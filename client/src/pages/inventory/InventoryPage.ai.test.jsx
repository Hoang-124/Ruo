import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InventoryPage } from './InventoryPage';

const mocks = vi.hoisted(() => ({
  getRooms: vi.fn(),
  getSessions: vi.fn(),
  getSessionById: vi.fn(),
  aiAnalyze: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    toast: {
      success: mocks.toastSuccess,
      error: mocks.toastError,
      warning: mocks.toastWarning
    }
  })
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { _id: 'fm-1', role: 'facility_manager', full_name: 'Quản lý CSVC' },
    hasPermission: () => true
  })
}));

vi.mock('../../lib/api', () => ({
  masterDataApi: {
    getRooms: mocks.getRooms
  },
  inventoryApi: {
    getSessions: mocks.getSessions,
    getSessionById: mocks.getSessionById,
    aiAnalyze: mocks.aiAnalyze
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('runs AI inventory discrepancy analysis and displays zombie asset warning + room hotspots', async () => {
  mocks.getRooms.mockResolvedValue({
    rooms: [{ _id: 'r-101', code: 'P101', name: 'Phòng 101', floor: 1 }]
  });
  mocks.getSessions.mockResolvedValue({
    success: true,
    data: [{ _id: 'sess-1', name: 'Kiểm kê HK1 Tòa A1', scope_type: 'building', status: 'in_progress', date: '2026-10-28T00:00:00Z' }]
  });
  mocks.getSessionById.mockResolvedValue({
    success: true,
    data: {
      _id: 'sess-1',
      name: 'Kiểm kê HK1 Tòa A1',
      scope_type: 'building',
      status: 'in_progress',
      logs: [
        {
          _id: 'l-1',
          status: 'wrong_location',
          scanned_at: '2026-10-28T08:00:00Z',
          scanned_room_id: { code: 'P101', name: 'Phòng 101' },
          equipment_id: { _id: 'eq-z', code: 'EQ-ZOMBIE-99', name: 'PC Dell Đã Thanh Lý', status: 'disposed', price: 12000000 }
        }
      ],
      expected_equipments: [],
      unscanned_equipments: [],
      progress: { expected_count: 1, scanned_count: 1, unscanned_count: 0, completion_percent: 100 }
    }
  });
  mocks.aiAnalyze.mockResolvedValue({
    success: true,
    analysis: {
      engine: 'domain_heuristic',
      risk_level: 'critical',
      health_score: 42,
      executive_summary: 'Phát hiện 1 tài sản đã thanh lý vẫn xuất hiện thực địa tại P101.',
      metrics: { missing_value_vnd: 6500000 },
      zombie_assets: [{ code: 'EQ-ZOMBIE-99', name: 'PC Dell Đã Thanh Lý', scanned_room: 'P101', price: 12000000 }],
      hotspots_by_room: [{ room_code: 'P101', missing: 1, wrong_location: 1, damaged: 0, exposure_vnd: 18500000 }],
      recommendations: ['Kiểm tra ngay hồ sơ thanh lý đối với EQ-ZOMBIE-99.']
    }
  });

  render(<InventoryPage />);
  expect(await screen.findAllByText(/Kiểm kê HK1 Tòa A1/i)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /AI Phân Tích Lệch Kiểm Kê/i }));
  await waitFor(() => expect(mocks.aiAnalyze).toHaveBeenCalledWith('sess-1'));

  expect(await screen.findByText(/CẢNH BÁO TÀI SẢN BÓNG MA/i)).toBeTruthy();
  expect(screen.getByText(/Điểm khớp chuẩn: 42\/100/i)).toBeTruthy();
  expect(screen.getByText(/Kiểm tra ngay hồ sơ thanh lý đối với EQ-ZOMBIE-99/i)).toBeTruthy();
});
