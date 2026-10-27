import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { inventoryApi, reportApi } from '../../lib/api';
import { ExportReport } from './ExportReport';
vi.mock('../../lib/api', () => ({ inventoryApi: { getSessions: vi.fn() }, reportApi: { exportFile: vi.fn(), getPrintReport: vi.fn() } }));
beforeEach(() => {
  inventoryApi.getSessions.mockResolvedValue({ data: [{ _id: 's1', name: 'Đợt tháng 10', date: '2026-10-27' }] });
  reportApi.getPrintReport.mockResolvedValue('<!doctype html><html lang="vi"><body>BÁO CÁO KIỂM KÊ</body></html>');
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('UC-8.9 requires an inventory session and previews the selected report before printing', async () => {
  render(<ExportReport refreshKey={0} />);
  fireEvent.change(screen.getByLabelText('Loại dữ liệu'), { target: { value: 'inventory' } });
  await screen.findByRole('option', { name: /Đợt tháng 10/ });
  expect(screen.getByRole('button', { name: 'Tải CSV (Excel)' }).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Đợt kiểm kê'), { target: { value: 's1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem bản in / PDF' }));
  const frame = await screen.findByTitle('Bản xem trước báo cáo');
  expect(reportApi.getPrintReport).toHaveBeenCalledWith({ type: 'inventory', sessionId: 's1' });
  expect(frame.getAttribute('srcdoc')).toContain('BÁO CÁO KIỂM KÊ');
  const printMock = vi.spyOn(frame.contentWindow, 'print').mockImplementation(() => {});
  vi.spyOn(frame.contentWindow, 'focus').mockImplementation(() => {});
  fireEvent.load(frame);
  fireEvent.click(screen.getByRole('button', { name: 'In / Lưu PDF' }));
  expect(printMock).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText('Loại dữ liệu'), { target: { value: 'equipment' } });
  expect(screen.queryByTitle('Bản xem trước báo cáo')).toBeNull();
});
it('UC-8.9 exposes failed downloads and allows retrying', async () => {
  reportApi.exportFile.mockRejectedValueOnce(new Error('Xuất thất bại'));
  render(<ExportReport refreshKey={0} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tải CSV (Excel)' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Xuất thất bại');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tải CSV (Excel)' }).disabled).toBe(false));
});
