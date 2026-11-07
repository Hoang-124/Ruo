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

const roleRecords = (
  technicianPermissions = [],
  facilityManagerPermissions = ['equipment:read', 'equipment:create', 'disposal:propose'],
  lecturerPermissions = ['equipment:read']
) => [
  { name: 'lecturer', permissions: lecturerPermissions },
  { name: 'technician', permissions: ['equipment:read', ...technicianPermissions] },
  { name: 'facility_manager', permissions: facilityManagerPermissions },
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

it('detects a disposal SoD conflict and clears it with the one-click fix', async () => {
  mocks.list.mockResolvedValue({
    success: true,
    roles: roleRecords([], ['equipment:read', 'disposal:propose', 'disposal:approve'])
  });

  render(<RBACMatrixPage />);

  expect(await screen.findByText(/Phát hiện 1 Xung Đột/)).toBeTruthy();
  expect(screen.getByText('Xung đột Đề xuất & Phê duyệt Thanh lý:')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Tự Động Khắc Phục SoD' }));

  expect(await screen.findByText(/Tuân thủ SoD hoàn hảo/)).toBeTruthy();
  expect(mocks.toastSuccess).toHaveBeenCalledWith(
    'Đã tự động loại bỏ các xung đột Separation of Duties!'
  );
});

it.each([
  {
    title: 'parts request and approval',
    roles: roleRecords(['parts:request', 'parts:approve']),
    conflict: 'Xung đột Yêu cầu & Phê duyệt Linh kiện:'
  },
  {
    title: 'movement order and confirmation',
    roles: roleRecords([], [
      'equipment:read',
      'movement:order',
      'movement:confirm'
    ]),
    conflict: 'Xung đột Ra lệnh & Xác nhận Điều chuyển:'
  },
  {
    title: 'lecturer privileged permission',
    roles: roleRecords([], undefined, ['equipment:read', 'role:update']),
    conflict: 'Vi phạm Đặc quyền Tối thiểu Giảng viên:'
  }
])('detects and resolves SoD conflict: $title', async ({ roles, conflict }) => {
  mocks.list.mockResolvedValue({ success: true, roles });

  render(<RBACMatrixPage />);

  expect(await screen.findByText(/Phát hiện 1 Xung Đột/)).toBeTruthy();
  expect(screen.getByText(conflict)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Tự Động Khắc Phục SoD' }));

  expect(await screen.findByText(/Tuân thủ SoD hoàn hảo/)).toBeTruthy();
  expect(mocks.toastSuccess).toHaveBeenCalledWith(
    'Đã tự động loại bỏ các xung đột Separation of Duties!'
  );
});

it('keeps the admin role:update permission fixed in the UI', async () => {
  mocks.list.mockResolvedValue({ success: true, roles: roleRecords() });

  render(<RBACMatrixPage />);

  const search = await screen.findByPlaceholderText(
    'Tìm theo mã quyền (e.g. equipment:create) hoặc tên nghiệp vụ...'
  );
  fireEvent.change(search, { target: { value: 'role:update' } });

  const permissionRow = screen.getByText('Cấu hình ma trận phân quyền hệ thống (RBAC)').closest('tr');
  const adminToggle = within(permissionRow).getByRole('button', { name: 'CỐ ĐỊNH' });
  fireEvent.click(adminToggle);

  expect(mocks.toastWarning).toHaveBeenCalled();
  expect(within(permissionRow).getByRole('button', { name: 'CỐ ĐỊNH' })).toBeTruthy();
});

it('asks for confirmation before saving a SoD-conflicting matrix', async () => {
  mocks.list.mockResolvedValue({
    success: true,
    roles: roleRecords([], ['equipment:read', 'disposal:propose', 'disposal:approve'])
  });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

  render(<RBACMatrixPage />);

  fireEvent.click(await screen.findByRole('button', { name: /Lưu Cấu Hình Quyền/ }));

  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('phát hiện 1 xung đột'));
  expect(mocks.batchUpdate).not.toHaveBeenCalled();
  confirm.mockRestore();
});

it('filters the matrix by business module and focused role', async () => {
  mocks.list.mockResolvedValue({ success: true, roles: roleRecords() });

  render(<RBACMatrixPage />);

  await screen.findByPlaceholderText(
    'Tìm theo mã quyền (e.g. equipment:create) hoặc tên nghiệp vụ...'
  );
  const filterBar = screen.getByText('Phân hệ:').parentElement;
  fireEvent.change(within(filterBar).getByRole('combobox'), { target: { value: 'mod_assets' } });

  expect(screen.getByText('Đăng ký tài sản mới vào hệ thống')).toBeTruthy();
  expect(screen.queryByText('Cấu hình ma trận phân quyền hệ thống (RBAC)')).toBeNull();

  const focusBar = screen.getByText('Chế độ xem:').parentElement;
  fireEvent.change(within(focusBar).getByRole('combobox'), { target: { value: 'technician' } });

  expect(screen.getByRole('columnheader', { name: /Kỹ Thuật Viên/ })).toBeTruthy();
  expect(screen.queryByRole('columnheader', { name: /Quản Trị BGH/ })).toBeNull();
});
