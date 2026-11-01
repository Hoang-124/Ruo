import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { DisposalApprovalPage } from './DisposalApprovalPage';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  approve: vi.fn(),
  bghApprove: vi.fn(),
  reject: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));
vi.mock('../../lib/api', () => ({
  disposalApi: {
    list: mocks.list,
    approve: mocks.approve,
    bghApprove: mocks.bghApprove,
    reject: mocks.reject
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('routes BGH approval through the RACI bgh-approve endpoint', async () => {
  mocks.list.mockResolvedValue({
    success: true,
    proposals: [{
      _id: 'disposal-1',
      status: 'hc_approved',
      reason: 'Thiết bị hỏng',
      equipment_id: { code: 'EQ-OLD', name: 'Máy chiếu' },
      recovery_value: 10000
    }]
  });
  mocks.bghApprove.mockResolvedValue({ success: true });

  render(<DisposalApprovalPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Phê Duyệt BGH' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ký Quyết Định & Duyệt' }));

  await waitFor(() => expect(mocks.bghApprove).toHaveBeenCalledWith(
    'disposal-1',
    expect.stringMatching(/^QD-TL-\d{8}\/EQ-OLD$/),
    10000
  ));
  expect(mocks.approve).not.toHaveBeenCalled();
});
