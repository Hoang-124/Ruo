import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { reportApi } from '../../lib/api';
import { ReportsPage } from './ReportsPage';
import { isTabAllowedForRole } from '../../config/navigation';

vi.mock('../../lib/api', () => ({ reportApi: { getByRoom: vi.fn() } }));
beforeEach(() => {
  reportApi.getByRoom.mockResolvedValue({ rooms: [
    { _id: 'r1', code: 'P101', name: 'Phòng học 101', floor: 1, count: 2, value: 2000000, brokenCount: 1 },
    { _id: 'r2', code: 'P201', name: 'Phòng trống', floor: 2, count: 0, value: 0, brokenCount: 0 }
  ], unassigned: { count: 1, value: 500000 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('UC-8.4 report by room', () => {
  it('shows rooms including empty rooms, asset values and unassigned assets', async () => {
    render(<ReportsPage />);
    expect(await screen.findByText('Phòng học 101')).toBeTruthy();
    expect(screen.getByText('Phòng trống')).toBeTruthy();
    expect(screen.getByText('Chưa gán phòng / phòng không còn tồn tại')).toBeTruthy();
    expect(screen.getAllByText('2.000.000 đ').length).toBeGreaterThan(0);
    expect(screen.getByText('2.500.000 đ')).toBeTruthy();
  });
  it('recovers from a failed request and supports refresh', async () => {
    reportApi.getByRoom.mockRejectedValueOnce(new Error('Mất kết nối báo cáo'));
    render(<ReportsPage />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại báo cáo theo phòng' }));
    expect(await screen.findByText('Phòng học 101')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới báo cáo' }));
    await screen.findByText('Phòng học 101');
    expect(reportApi.getByRoom).toHaveBeenCalledTimes(3);
  });
  it('restricts navigation to managers and admins', () => {
    for (const role of ['admin', 'facility_manager']) expect(isTabAllowedForRole(role, 'reports')).toBe(true);
    for (const role of ['technician', 'lecturer']) expect(isTabAllowedForRole(role, 'reports')).toBe(false);
  });
});
