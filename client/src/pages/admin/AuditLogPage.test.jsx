import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuditLogPage } from './AuditLogPage';

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn(),
  verifyChain: vi.fn(),
  downloadCsv: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } })
}));

vi.mock('../../lib/api', () => ({
  auditApi: {
    getLogs: mocks.getLogs,
    verifyChain: mocks.verifyChain,
    downloadCsv: mocks.downloadCsv
  }
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('verifies SHA-256 chain integrity and downloads CSV via authenticated blob request', async () => {
  mocks.getLogs.mockResolvedValue({
    success: true,
    logs: [
      {
        _id: 'log-1',
        seq: 1,
        hashed_at: '2026-10-28T08:00:00.000Z',
        user_display: 'Admin (AD001)',
        action: 'EQUIPMENT_CREATE',
        target_table: 'equipments',
        entity_id: 'EQ-001',
        previous_hash: '0'.repeat(64),
        hash_sha256: 'a'.repeat(64)
      }
    ]
  });
  mocks.verifyChain.mockResolvedValue({
    success: true,
    verification: {
      isValid: true,
      totalLogs: 1,
      message: 'Toàn bộ chuỗi kiểm toán SHA-256 hoàn toàn nguyên vẹn.'
    }
  });
  mocks.downloadCsv.mockResolvedValue(new Blob(['\uFEFFKhối #,Mã SHA-256'], { type: 'text/csv' }));

  const origCreateObjectURL = window.URL.createObjectURL;
  const origRevokeObjectURL = window.URL.revokeObjectURL;
  window.URL.createObjectURL = vi.fn(() => 'blob:audit-csv');
  window.URL.revokeObjectURL = vi.fn();
  const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    render(<AuditLogPage />);
    expect(await screen.findByText('#1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Kiểm Tra Toàn Vẹn Chuỗi SHA-256/i }));
    await waitFor(() => expect(mocks.verifyChain).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/CRYPTOGRAPHIC_VALID/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Xuất CSV Kiểm Toán/i }));
    await waitFor(() => expect(mocks.downloadCsv).toHaveBeenCalledTimes(1));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Đã xuất tệp CSV sổ cái kiểm toán SHA-256 thành công.');
  } finally {
    anchorClickSpy.mockRestore();
    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
  }
});
