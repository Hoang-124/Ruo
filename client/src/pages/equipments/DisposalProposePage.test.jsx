import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { DisposalProposePage } from './DisposalProposePage';

const state = vi.hoisted(() => ({ role: 'technician' }));
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  completeReceipt: vi.fn(),
  repairList: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { _id: 'tech-1', role: state.role } })
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));
vi.mock('../../lib/api', () => ({
  disposalApi: {
    list: mocks.list,
    completeReceipt: mocks.completeReceipt
  },
  repairApi: { list: mocks.repairList }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('lets a technician receive a planned replacement and shows the returned QR', async () => {
  state.role = 'technician';
  mocks.list.mockImplementation(async () => ({
    success: true,
    proposals: mocks.completeReceipt.mock.calls.length
      ? [{
          _id: 'disposal-1',
          status: 'completed',
          reason: 'Thiết bị hỏng',
          equipment_id: { code: 'EQ-OLD', name: 'Máy chiếu' },
          replacement_equipment_id: { code: 'EQ-NEW', qr_code: 'QR-EQ-NEW' }
        }]
      : [{
          _id: 'disposal-1',
          status: 'procurement_planned',
          reason: 'Thiết bị hỏng',
          equipment_id: { code: 'EQ-OLD', name: 'Máy chiếu' },
          procurement: {
            budget: 12000000,
            category_id: { name: 'Máy chiếu' },
            room_id: { code: 'A101', name: 'Phòng A101' }
          }
        }]
  }));
  mocks.completeReceipt.mockResolvedValue({
    success: true,
    message: 'Đã tiếp nhận tài sản.',
    replacement: { code: 'EQ-NEW', qr_code: 'QR-EQ-NEW' }
  });

  render(<DisposalProposePage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Tiếp Nhận Thiết Bị Mới' }));
  expect(screen.getByText(/Ngân sách tối đa: 12\.000\.000 VNĐ/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Mã tài sản mới *'), { target: { value: 'EQ-NEW' } });
  fireEvent.change(screen.getByLabelText('Nguyên giá thực tế (VNĐ) *'), { target: { value: '11000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác Nhận Tiếp Nhận' }));

  await waitFor(() => expect(mocks.completeReceipt).toHaveBeenCalledWith('disposal-1', {
    code: 'EQ-NEW',
    serial_number: '',
    brand: '',
    model: '',
    price: 11000000
  }));
  expect(await screen.findByText(/Thiết bị mới: EQ-NEW • QR: QR-EQ-NEW/)).toBeTruthy();
  expect(mocks.repairList).not.toHaveBeenCalled();
});

it('does not send a receipt that exceeds the approved budget', async () => {
  state.role = 'technician';
  mocks.list.mockResolvedValue({
    success: true,
    proposals: [{
      _id: 'disposal-2',
      status: 'procurement_planned',
      reason: 'Thiết bị hỏng',
      equipment_id: { code: 'EQ-OLD', name: 'Máy chiếu' },
      procurement: { budget: 10000000, category_id: { name: 'Máy chiếu' }, room_id: { name: 'Phòng A101' } }
    }]
  });

  render(<DisposalProposePage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tiếp Nhận Thiết Bị Mới' }));
  fireEvent.change(screen.getByLabelText('Mã tài sản mới *'), { target: { value: 'EQ-OVER' } });
  fireEvent.change(screen.getByLabelText('Nguyên giá thực tế (VNĐ) *'), { target: { value: '11000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác Nhận Tiếp Nhận' }));

  expect(mocks.completeReceipt).not.toHaveBeenCalled();
  expect(mocks.toastError).toHaveBeenCalledWith('Nguyên giá thực tế không được vượt ngân sách dự trù.');
});
