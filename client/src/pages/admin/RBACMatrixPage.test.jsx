import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { RBACMatrixPage } from './RBACMatrixPage';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  batchUpdate: vi.fn(),
  resetDefaults: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    toast: {
      info: mocks.toastInfo,
      success: mocks.toastSuccess,
      error: mocks.toastError,
      warning: mocks.toastWarning
    }
  })
}));
vi.mock('../../lib/api', () => ({
  roleApi: {
    list: mocks.list,
    update: mocks.update,
    batchUpdate: mocks.batchUpdate,
    resetDefaults: mocks.resetDefaults
  }
}));

const roleRecords = (technicianPermissions = []) => [
  { name: 'lecturer', permissions: ['equipment:read'] },
  { name: 'technician', permissions: ['equipment:read', ...technicianPermissions] },
  { name: 'facility_manager', permissions: ['equipment:read', 'equipment:create', 'disposal:propose'] },
  { name: 'admin', permissions: ['equipment:read', 'equipment:create', 'role:update', 'user:profile:read'] }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('saves RBAC permission changes through a single batch request', async () => {
  mocks.list.mockResolvedValue({ success: true, roles: roleRecords() });
  mocks.batchUpdate.mockResolvedValue({ success: true, roles: roleRecords(['equipment:create']) });

  render(<RBACMatrixPage />);

  fireEvent.change(
    await screen.findByPlaceholderText('Tìm theo mã quyền (e.g. equipment:create) hoặc tên nghiệp vụ...'),
    { target: { value: 'equipment:create' } }
  );
  const permissionRow = screen.getByText('Đăng ký tài sản mới vào hệ thống').closest('tr');
  fireEvent.click(within(permissionRow).getAllByRole('button')[1]);
  fireEvent.click(screen.getByRole('button', { name: /Lưu Cấu Hình Quyền/ }));

  await waitFor(() => expect(mocks.batchUpdate).toHaveBeenCalledTimes(1));
  const payload = mocks.batchUpdate.mock.calls[0][0];
  expect(payload.find((role) => role.name === 'technician').permissions).toContain('equipment:create');
  expect(mocks.update).not.toHaveBeenCalled();
});
