import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { reportApi } from '../../lib/api';
import { FrequencyReport } from './FrequencyReport';
vi.mock('../../lib/api', () => ({ reportApi: { getRepairFrequency: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('UC-8.6 displays both groupings and reloads when year changes', async () => {
  reportApi.getRepairFrequency.mockResolvedValue({ summary: { failureCount: 4, affectedEquipment: 2, legacyRoomCount: 1 },
    byCategory: [{ _id: 'c1', code: 'MC', name: 'Máy chiếu', failureCount: 4, affectedEquipment: 2, incidentsPerEquipment: 2 }],
    byRoom: [{ _id: 'r1', code: 'P101', name: 'Phòng 101', failureCount: 4, affectedEquipment: 2, incidentsPerEquipment: 2 }] });
  render(<FrequencyReport refreshKey={0} />);
  expect(await screen.findByText('Máy chiếu')).toBeTruthy();
  expect(screen.getByText('Phòng 101')).toBeTruthy();
  expect(screen.getByText(/1 phiếu thiếu phòng/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Năm thống kê sự cố'), { target: { value: '2025' } });
  await waitFor(() => expect(reportApi.getRepairFrequency).toHaveBeenLastCalledWith({ year: '2025' }));
});
