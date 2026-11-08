import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SparePartForecastPanel } from './SparePartForecastPanel';

const mocks = vi.hoisted(() => ({
  forecast: vi.fn(),
  update: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));

vi.mock('../../lib/api', () => ({
  sparePartApi: { forecast: mocks.forecast, update: mocks.update }
}));

const forecastRow = (overrides) => ({
  _id: 'p1',
  code: 'SP-LAMP-01',
  name: 'Bóng đèn máy chiếu',
  unit: 'Bóng',
  stock: 2,
  pending_qty: 0,
  available: 2,
  current_min_stock: 2,
  monthly_demand: 3.2,
  days_until_stockout: 5,
  suggested_min_stock: 4,
  suggested_order_qty: 3,
  status: 'critical',
  confidence: 'high',
  basis: { policy: 'croston_sba', demand_events: 19, history_days: 180, lead_time_days: 7 },
  ...overrides
});

const payload = (forecasts) => ({
  success: true,
  parameters: { default_lead_time_days: 7 },
  summary: { out_of_stock: 0, critical: 1, reorder: 0, ok: forecasts.length - 1, no_demand: 0 },
  forecasts
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it('shows urgent parts with stock-out horizon and suggested order quantity', async () => {
  mocks.forecast.mockResolvedValue(payload([forecastRow(), forecastRow({ _id: 'p2', code: 'SP-HDMI', status: 'ok', suggested_order_qty: 0, days_until_stockout: 400, suggested_min_stock: null, confidence: 'low' })]));
  render(<SparePartForecastPanel />);

  const lamp = await screen.findByTestId('forecast-row-SP-LAMP-01');
  expect(within(lamp).getByText('~5 ngày')).toBeTruthy();
  expect(within(lamp).getByText('3 Bóng')).toBeTruthy();
  expect(within(lamp).getByText('Hết trước khi hàng về')).toBeTruthy();
  expect(within(screen.getByTestId('forecast-row-SP-HDMI')).getAllByText('Ít dữ liệu').length).toBeGreaterThan(0);
  expect(mocks.forecast).toHaveBeenCalledWith({ history_days: 180 });
});

it('applies a suggested min_stock only after confirmation and refreshes', async () => {
  mocks.forecast.mockResolvedValue(payload([forecastRow()]));
  mocks.update.mockResolvedValue({ success: true });
  const onApplied = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<SparePartForecastPanel onApplied={onApplied} />);

  const apply = await screen.findByRole('button', { name: 'Áp dụng định mức 4 cho SP-LAMP-01' });
  fireEvent.click(apply);
  expect(mocks.update).not.toHaveBeenCalled();

  fireEvent.click(apply);
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('p1', { min_stock: 4 }));
  await waitFor(() => expect(onApplied).toHaveBeenCalled());
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(mocks.forecast).toHaveBeenCalledTimes(2);
});

it('shows a retryable error state instead of an empty table when the forecast fails', async () => {
  mocks.forecast.mockRejectedValueOnce(new Error('Quyền truy cập bị từ chối')).mockResolvedValueOnce(payload([forecastRow()]));
  render(<SparePartForecastPanel />);

  const alert = await screen.findByRole('alert');
  expect(within(alert).getByText('Quyền truy cập bị từ chối')).toBeTruthy();
  fireEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByTestId('forecast-row-SP-LAMP-01')).toBeTruthy();
});

it('re-queries with the selected history window', async () => {
  mocks.forecast.mockResolvedValue(payload([forecastRow()]));
  render(<SparePartForecastPanel />);
  await screen.findByTestId('forecast-row-SP-LAMP-01');
  fireEvent.change(screen.getByLabelText('Lịch sử'), { target: { value: '365' } });
  await waitFor(() => expect(mocks.forecast).toHaveBeenLastCalledWith({ history_days: 365 }));
});
