import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InventoryPage } from './InventoryPage';

const mocks = vi.hoisted(() => ({
  getRooms: vi.fn(),
  getSessions: vi.fn(),
  getSessionById: vi.fn(),
  aiAnalyze: vi.fn(),
  reconcile: vi.fn(),
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
    aiAnalyze: mocks.aiAnalyze,
    reconcile: mocks.reconcile
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('discards old inventory AI and detail responses after switching sessions', async () => {
  const sessions = [{ _id: 'a', name: 'Đợt A' }, { _id: 'b', name: 'Đợt B' }];
  mocks.getRooms.mockResolvedValue({ rooms: [] });
  mocks.getSessions.mockResolvedValue({ success: true, data: sessions });
  mocks.getSessionById.mockImplementation((id) => Promise.resolve({ success: true, data: { ...sessions.find((s) => s._id === id), logs: [] } }));
  let resolveAnalysis;
  mocks.aiAnalyze.mockImplementationOnce(() => new Promise((resolve) => { resolveAnalysis = resolve; }));
  render(<InventoryPage />);
  fireEvent.click(await screen.findByRole('button', { name: /AI Phân Tích Lệch/i }));
  fireEvent.click(screen.getByText('Đợt B'));
  await waitFor(() => expect(screen.getAllByText('Đợt B')).toHaveLength(2));
  await act(async () => resolveAnalysis({ success: true, analysis: { executive_summary: 'Kết quả cũ đợt A', recommendations: [] } }));
  expect(screen.queryByText('Kết quả cũ đợt A')).toBeNull();
  let resolveDetails;
  mocks.getSessionById.mockImplementationOnce(() => new Promise((resolve) => { resolveDetails = resolve; }));
  fireEvent.click(screen.getByText('Đợt A'));
  fireEvent.click(screen.getByText('Đợt B'));
  await waitFor(() => expect(screen.getAllByText('Đợt B')).toHaveLength(2));
  await act(async () => resolveDetails({ success: true, data: { ...sessions[0], logs: [] } }));
  expect(screen.getAllByText('Đợt B')).toHaveLength(2);
});

it('keeps the newly selected session when reconciliation of another session completes', async () => {
  const sessions = [{ _id: 'a', name: 'Đợt A', status: 'in_progress' }, { _id: 'b', name: 'Đợt B', status: 'in_progress' }];
  mocks.getRooms.mockResolvedValue({ rooms: [] });
  mocks.getSessions.mockResolvedValue({ success: true, data: sessions });
  mocks.getSessionById.mockImplementation((id) => Promise.resolve({ success: true, data: { ...sessions.find((s) => s._id === id), logs: [] } }));
  let resolveReconcile;
  mocks.reconcile.mockImplementationOnce(() => new Promise((resolve) => { resolveReconcile = resolve; }));
  render(<InventoryPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Chốt Số Liệu Đối Soát/i }));
  fireEvent.click(screen.getByText('Đợt B'));
  await waitFor(() => expect(screen.getAllByText('Đợt B')).toHaveLength(2));
  await act(async () => resolveReconcile({ success: true }));
  await waitFor(() => expect(mocks.getSessions).toHaveBeenCalledTimes(2));
  expect(screen.getAllByText('Đợt B')).toHaveLength(2);
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
      metrics: { missing_value_vnd: 6500000, expected_count: 3, completion_percent: 33 },
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
  expect(screen.getByText(/Điểm dữ liệu đã kiểm tra: 42\/100/i)).toBeTruthy();
  expect(screen.getByText(/Tiến độ kiểm kê: 33%/i)).toBeTruthy();
  expect(screen.getByText(/Kiểm tra ngay hồ sơ thanh lý đối với EQ-ZOMBIE-99/i)).toBeTruthy();
});
