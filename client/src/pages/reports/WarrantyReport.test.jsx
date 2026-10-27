import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { reportApi } from '../../lib/api';
import { WarrantyReport } from './WarrantyReport';
vi.mock('../../lib/api', () => ({ reportApi: { getWarrantyExpiring: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('UC-8.7 shows expiry and supplier contacts, paginates and resets page on a new window', async () => {
  reportApi.getWarrantyExpiring.mockResolvedValue({ total: 21, totalPages: 2, equipment: [{ _id: 'e1', code: 'E1', name: 'Máy chiếu',
    warranty_expiry: '2026-10-27', daysRemaining: 0, supplier_id: { name: 'NCC A', phone: '0901234567', email: 'ncc@example.test' } }] });
  render(<WarrantyReport refreshKey={0} />);
  expect(await screen.findByRole('cell', { name: /NCC A.*0901234567.*ncc@example.test/ })).toBeTruthy();
  expect(screen.getByRole('cell', { name: 'Hôm nay' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  await waitFor(() => expect(reportApi.getWarrantyExpiring).toHaveBeenLastCalledWith({ days: '30', page: 2, limit: 20 }));
  fireEvent.change(screen.getByLabelText('Hết hạn trong'), { target: { value: '90' } });
  await waitFor(() => expect(reportApi.getWarrantyExpiring).toHaveBeenLastCalledWith({ days: '90', page: 1, limit: 20 }));
});
