import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { EquipmentsPage } from './EquipmentsPage';

const mocks = vi.hoisted(() => ({
  equipmentList: vi.fn(),
  disposalList: vi.fn(),
  propose: vi.fn(),
  completeReceipt: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { _id: 'tech-1', role: 'technician' },
    hasPermission: (permission) => permission === 'disposal:propose'
  })
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));
vi.mock('../../lib/api', () => ({
  equipmentApi: {
    list: mocks.equipmentList,
    getByQr: vi.fn(),
    getById: vi.fn(),
    getLifecycle: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateWarranty: vi.fn(),
    checkWarrantyExpirations: vi.fn(),
    dispose: vi.fn(),
    validateBatch: vi.fn(),
    importBatch: vi.fn()
  },
  disposalApi: {
    list: mocks.disposalList,
    propose: mocks.propose,
    completeReceipt: mocks.completeReceipt
  },
  masterDataApi: {
    getCategories: vi.fn().mockResolvedValue({ categories: [] }),
    getRooms: vi.fn().mockResolvedValue({ rooms: [] }),
    getSuppliers: vi.fn().mockResolvedValue({ suppliers: [] })
  }
}));

const oldEquipment = {
  _id: 'eq-old',
  code: 'EQ-OLD',
  qr_code: 'QR-EQ-OLD',
  name: 'Máy chiếu cũ',
  brand: 'Epson',
  model: 'Old',
  price: 10000000,
  estimated_repair_cost: 7000000,
  status: 'broken',
  category_id: { name: 'Máy chiếu' },
  room_id: { code: 'A101', name: 'Phòng A101' }
};

const renderPage = async () => {
  render(<EquipmentsPage />);
  await screen.findByText('EQ-OLD');
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('allows a technician to create an eligible disposal proposal from the equipment inventory', async () => {
  mocks.equipmentList.mockResolvedValue({ success: true, equipments: [oldEquipment], total: 1 });
  mocks.disposalList.mockResolvedValue({ success: true, candidates: [{ ...oldEquipment, r_ratio: 70 }], proposals: [] });
  mocks.propose.mockResolvedValue({ success: true, message: 'Đã gửi đề xuất.' });

  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Đề Xuất TL' }));
  expect(screen.getByText('EQ-OLD • R = 70.0%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi Đề Xuất' }));

  await waitFor(() => expect(mocks.propose).toHaveBeenCalledWith({
    equipment_id: 'eq-old',
    repair_id: null,
    reason: expect.stringContaining('70.0%'),
    recovery_value: 0
  }));
});

it('allows a technician to receive a planned replacement from the equipment inventory', async () => {
  mocks.equipmentList.mockResolvedValue({ success: true, equipments: [oldEquipment], total: 1 });
  mocks.disposalList.mockResolvedValue({
    success: true,
    candidates: [],
    proposals: [{
      _id: 'disposal-1',
      status: 'procurement_planned',
      equipment_id: { _id: 'eq-old', code: 'EQ-OLD' },
      procurement: { budget: 12000000 }
    }]
  });
  mocks.completeReceipt.mockResolvedValue({ success: true, message: 'Đã tiếp nhận tài sản mới.' });

  await renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Tiếp Nhận Mới' }));
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
});
