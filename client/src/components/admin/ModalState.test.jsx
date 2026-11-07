import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ForceResetPasswordModal } from './ForceResetPasswordModal';
import { RoleApprovalModal } from './RoleApprovalModal';

afterEach(cleanup);
const user = { _id: 'user-1', role: 'technician', requested_role: 'technician', full_name: 'Nguyễn An', code: 'KT01' };

it('temporary password draft resets when reopening or selecting another user', () => {
  const props = { user, isOpen: true, onClose: vi.fn(), onConfirm: vi.fn() };
  const { rerender } = render(<ForceResetPasswordModal {...props} />);
  const input = screen.getByPlaceholderText('Nhập tối thiểu 6 ký tự...');
  fireEvent.change(input, { target: { value: 'Manual@password1' } });
  expect(input.value).toBe('Manual@password1');
  rerender(<ForceResetPasswordModal {...props} isOpen={false} />);
  expect(screen.queryByPlaceholderText('Nhập tối thiểu 6 ký tự...')).toBeNull();
  rerender(<ForceResetPasswordModal {...props} />);
  expect(screen.getByPlaceholderText('Nhập tối thiểu 6 ký tự...').value).toMatch(/^Ruo@[0-9a-f]{24}$/);
  fireEvent.change(screen.getByPlaceholderText('Nhập tối thiểu 6 ký tự...'), { target: { value: 'Second@draft1' } });
  rerender(<ForceResetPasswordModal {...props} user={{ ...user, _id: 'user-2' }} />);
  expect(screen.getByPlaceholderText('Nhập tối thiểu 6 ký tự...').value).not.toBe('Second@draft1');
});

it('role approval starts with the requested role for each selected user', () => {
  const props = { user, isOpen: true, onClose: vi.fn(), onSubmit: vi.fn() };
  const { rerender } = render(<RoleApprovalModal {...props} />);
  expect(screen.getByRole('combobox').value).toBe('technician');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'facility_manager' } });
  rerender(<RoleApprovalModal {...props} isOpen={false} />);
  rerender(<RoleApprovalModal {...props} />);
  expect(screen.getByRole('combobox').value).toBe('technician');
});
