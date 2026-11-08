import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TechnicianTasksPage } from './TechnicianTasksPage';

const mocks = vi.hoisted(() => ({ list: vi.fn(), aiCopilot: vi.fn(), progress: vi.fn(), reportOutcome: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { _id: 'tech-1', role: 'technician' } }) }));
vi.mock('../../lib/api', () => ({ repairApi: mocks }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const tasks = ['A', 'B'].map((id) => ({ _id: id, ticket_code: `REP-${id}`, status: 'in_progress', assigned_to: 'tech-1', damage_level: 'minor' }));
const copilot = { diagnosis: { suggested_log_action: 'Nháp A', suggested_log_notes: 'Ghi chú A', suggested_outcome: 'repaired', suggested_outcome_notes: 'Đối chiếu thực tế trước khi nghiệm thu.' } };

it('does not fill a different task form with a delayed AI draft', async () => {
  mocks.list.mockResolvedValue({ success: true, repairs: tasks });
  let resolveAi;
  mocks.aiCopilot.mockImplementationOnce(() => new Promise((resolve) => { resolveAi = resolve; }));
  render(<TechnicianTasksPage />);
  const openButtons = await screen.findAllByRole('button', { name: 'Ghi Nhật Ký' });
  fireEvent.click(openButtons[0]);
  fireEvent.click(screen.getByRole('button', { name: /Điền Nhanh Bằng AI/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Hủy Bỏ' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Ghi Nhật Ký' })[1]);
  await act(async () => resolveAi({ success: true, copilot }));
  expect(screen.getByPlaceholderText(/VD: Đoản mạch nguồn cấp/i).value).toBe('');
});

it('preserves manually selected outcome and refreshes AI after writing progress', async () => {
  mocks.list.mockResolvedValue({ success: true, repairs: [tasks[0]] });
  mocks.aiCopilot.mockResolvedValue({ success: true, copilot });
  mocks.progress.mockResolvedValue({ success: true });
  mocks.reportOutcome.mockResolvedValue({ success: true });
  render(<TechnicianTasksPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ghi Nhật Ký' }));
  fireEvent.click(screen.getByRole('button', { name: /Điền Nhanh Bằng AI/i }));
  await waitFor(() => expect(screen.getByPlaceholderText(/VD: Đoản mạch nguồn cấp/i).value).toBe('Nháp A'));
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Nhật Ký' }));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  fireEvent.click(await screen.findByRole('button', { name: 'Báo Cáo Kết Quả' }));
  fireEvent.click(screen.getByText('Không Thể Khắc Phục'));
  fireEvent.click(screen.getByRole('button', { name: /Gợi Ý Kết Luận AI/i }));
  await waitFor(() => expect(mocks.aiCopilot).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: /Xác Nhận & Gửi Báo Cáo/i }));
  await waitFor(() => expect(mocks.reportOutcome).toHaveBeenCalledWith('A', { outcome: 'unrepairable', notes: 'Đối chiếu thực tế trước khi nghiệm thu.' }));
});
