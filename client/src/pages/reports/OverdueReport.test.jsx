import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { reportApi } from '../../lib/api';
import { OverdueReport } from './OverdueReport';
vi.mock('../../lib/api', () => ({ reportApi: { getOverdueRepairs: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('UC-8.8 renders unresolved SLA breaches and filters severity', async () => {
  reportApi.getOverdueRepairs.mockResolvedValue({ total: 1, totalPages: 1, repairs: [{ _id: 'r1', ticket_code: 'REP-1',
    equipment_id: { code: 'E1', name: 'Máy chiếu' }, room_id: { code: 'P101' }, assigned_to: { full_name: 'Kỹ thuật A' },
    status: 'in_progress', damage_level: 'critical', deadline: '2026-10-27T00:00:00Z', overdueMinutes: 125 }] });
  render(<OverdueReport refreshKey={0} />);
  expect(await screen.findByText('REP-1')).toBeTruthy();
  expect(screen.getByRole('cell', { name: 'Kỹ thuật A' })).toBeTruthy();
  expect(screen.getByText('2 giờ 5 phút')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Mức độ hỏng'), { target: { value: 'critical' } });
  await waitFor(() => expect(reportApi.getOverdueRepairs).toHaveBeenLastCalledWith({ severity: 'critical', page: 1, limit: 20 }));
});
