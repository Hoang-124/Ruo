import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QRScannerPage } from './QRScannerPage';
const mocks = vi.hoisted(() => ({ list: vi.fn(), getByQr: vi.fn() }));
vi.mock('../../lib/api', () => ({ equipmentApi: mocks }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast: { error: vi.fn(), success: vi.fn() } }) }));
beforeEach(() => { mocks.list.mockResolvedValue({ equipments: [] }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('reports unsupported QR scanning and does not request a camera without a decoder', async () => {
  vi.stubGlobal('BarcodeDetector', undefined);
  const getUserMedia = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  render(<QRScannerPage />);
  fireEvent.click(screen.getByText('Bật Camera QR'));
  await screen.findByText(/Trình duyệt không hỗ trợ đọc QR bằng camera/);
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(screen.queryByText(/Camera đang quét QR/)).toBeNull();
});

it('reports camera permission errors honestly', async () => {
  vi.stubGlobal('BarcodeDetector', class { detect() {} });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) } });
  render(<QRScannerPage />);
  fireEvent.click(screen.getByText('Bật Camera QR'));
  await screen.findByText(/Không thể mở camera/);
  expect(screen.queryByText(/Mô Phỏng Bắt Mã/)).toBeNull();
});

it('stops a camera stream that arrives after the scanner was closed', async () => {
  let resolveStream;
  const stop = vi.fn();
  vi.stubGlobal('BarcodeDetector', class { detect() {} });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => new Promise(resolve => { resolveStream = resolve; })) } });
  render(<QRScannerPage />);
  fireEvent.click(screen.getByText('Bật Camera QR'));
  fireEvent.click(screen.getByText('Tắt Camera'));
  resolveStream({ getTracks: () => [{ stop }] });
  await waitFor(() => expect(stop).toHaveBeenCalledOnce());
});
