import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WarehouseStockPage } from './WarehouseStockPage';

const mocks = vi.hoisted(() => ({
  getWarehouseStock: vi.fn(),
  sparePartList: vi.fn(),
  aiHealthSchedule: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    toast: {
      success: mocks.toastSuccess,
      error: mocks.toastError
    }
  })
}));

vi.mock('../../lib/api', () => ({
  masterDataApi: {
    getWarehouseStock: mocks.getWarehouseStock
  },
  sparePartApi: {
    list: mocks.sparePartList,
    updateStock: vi.fn()
  },
  equipmentApi: {
    aiHealthSchedule: mocks.aiHealthSchedule
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('renders AI 3-level color alert matrix (Green/Yellow/Red), concurrent failure clusters, and KHO-01 criticality schedule', async () => {
  mocks.getWarehouseStock.mockResolvedValue({
    success: true,
    stockItems: [
      {
        _id: 'st-tv-1',
        code: 'EQ-KHO-01-TV-01',
        name: 'Smart Tivi 75 inch Samsung Dự phòng',
        model: 'BU8000',
        brand: 'Samsung',
        price: 25000000,
        category_id: { name: 'Tivi / Màn hình tương tác' }
      }
    ],
    roomShortages: []
  });

  mocks.sparePartList.mockResolvedValue({
    success: true,
    parts: []
  });

  mocks.aiHealthSchedule.mockResolvedValue({
    success: true,
    optimization: {
      engine_label: 'Ruo Cortex Local AI v2.5',
      executive_summary: 'Hệ thống AI ghi nhận 1 thiết bị ở MỨC ĐỎ (Cảnh báo cao).',
      summary_counts: {
        total_evaluated: 3,
        green_count: 1,
        yellow_count: 1,
        red_count: 1,
        warehouse_ready_count: 1,
        scheduled_actions_count: 1
      },
      concurrent_failure_alerts: [
        {
          category_code: 'TV',
          category_name: 'Tivi / Màn hình tương tác',
          level: 'red',
          color_badge: '● Đỏ',
          status_label: 'Cảnh báo cao',
          recommended_action: 'Thay thế/Dự phòng khẩn cấp',
          available_in_warehouse: 1,
          advisory: 'Cảnh báo hỏng đồng loạt nhóm Tivi tại giảng đường A1-101, A1-102.'
        }
      ],
      warehouse_schedule: [
        {
          schedule_id: 'SCHED-RED-EQ-101-TV-01',
          priority_tier: 'P1 - Khẩn cấp (Mức Đỏ)',
          priority_level: 'red',
          color_badge: '● Đỏ',
          criticality_score: 95,
          time_slot: 'Ca 1 (06:45 – 07:15) · Trước giờ vào tiết giảng đường',
          warehouse_equipment: {
            _id: 'st-tv-1',
            code: 'EQ-KHO-01-TV-01',
            name: 'Smart Tivi 75 inch Samsung Dự phòng',
            warehouse_code: 'KHO-01'
          },
          target_room_code: 'A1-101',
          target_room_name: 'Giảng đường A1-101',
          target_equipment_code: 'EQ-101-TV-01',
          target_equipment_name: 'Smart Tivi 75 inch Giảng đường 101',
          category_name: 'Tivi / Màn hình tương tác',
          failure_frequency_summary: 'Hỏng 3 lần (2 lần/90 ngày) · R=56%',
          recommended_action: 'Thay thế/Dự phòng khẩn cấp',
          schedule_directive: 'Xuất kho dự phòng [EQ-KHO-01-TV-01] từ KHO-01 thay thế nóng cho [EQ-101-TV-01] tại A1-101.'
        }
      ],
      equipment_health_list: [
        {
          _id: 'eq-1',
          code: 'EQ-101-TV-01',
          name: 'Smart Tivi 75 inch Giảng đường 101',
          room_code: 'A1-101',
          room_name: 'Giảng đường A1-101',
          category_name: 'Tivi / Màn hình tương tác',
          repair_count: 3,
          recent_90d_repairs: 2,
          r_ratio: 56,
          ai_alert: {
            level: 'red',
            color_badge: '● Đỏ',
            color_hex: '#EF4444',
            status_label: 'Cảnh báo cao',
            recommended_action: 'Thay thế/Dự phòng khẩn cấp',
            reason: 'Hỏng lặp lại 3 lần · R = 56%'
          }
        }
      ]
    }
  });

  render(<WarehouseStockPage />);

  expect((await screen.findAllByText(/Hệ thống Cảnh báo Tình trạng Thiết bị \(AI\)/i)).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Duy trì bảo trì định kỳ').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Kiểm tra tần suất sử dụng').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Thay thế/Dự phòng khẩn cấp').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/Cảnh báo hỏng đồng loạt nhóm Tivi tại giảng đường A1-101/i)).toBeTruthy();
  expect(screen.getByText(/Xuất kho dự phòng \[EQ-KHO-01-TV-01\]/i)).toBeTruthy();

  // Switch to Warehouse Stock tab
  fireEvent.click(screen.getByRole('button', { name: /Thiết Bị Lưu Kho KHO-01/i }));
  expect((await screen.findAllByText('EQ-KHO-01-TV-01')).length).toBeGreaterThanOrEqual(1);
});
