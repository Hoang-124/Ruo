import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuditLogPage } from './AuditLogPage';

const mocks = vi.hoisted(() => ({
  getLogs: vi.fn(),
  verifyChain: vi.fn(),
  aiAnalyze: vi.fn(),
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
    aiAnalyze: mocks.aiAnalyze,
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

it('runs AI CSO anomaly analysis and opens block diff drawer when clicking #seq reference', async () => {
  mocks.getLogs.mockResolvedValue({
    success: true,
    logs: [
      {
        _id: 'log-19',
        seq: 19,
        hashed_at: '2026-10-28T19:30:00.000Z',
        user_display: 'Admin Root',
        action: 'UPDATE_ROLE_PERMISSIONS',
        target_table: 'roles',
        entity_id: 'role-lecturer',
        previous_hash: '0'.repeat(64),
        hash_sha256: 'f'.repeat(64),
        new_value: { permissions: ['incident:create'] }
      }
    ]
  });

  mocks.aiAnalyze.mockResolvedValue({
    success: true,
    analysis: {
      engine: 'domain_heuristic',
      risk_level: 'high',
      security_score: 78,
      executive_summary: 'Phát hiện 1 thay đổi quyền RBAC ngoài giờ hành chính tại khối #19.',
      chain_integrity: {
        isValid: true,
        totalLogs: 19,
        message: 'Chuỗi băm nguyên vẹn.'
      },
      stats: {
        logs_analyzed: 19,
        rbac_mutations: 1,
        auth_lockouts: 0,
        off_hours_sensitive: 1
      },
      anomalies: [
        {
          severity: 'high',
          category: 'RBAC_MUTATION',
          title: '1 thao tác thay đổi Ma trận Phân quyền RBAC',
          detail: 'Chỉnh sửa quyền vai trò ngoài khung giờ hành chính.',
          seq_refs: [19]
        }
      ],
      recommendations: ['Rà soát Diff của khối #19.']
    }
  });

  render(<AuditLogPage />);
  expect(await screen.findByText('#19')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: /AI Phân Tích Bất Thường/i }));
  await waitFor(() => expect(mocks.aiAnalyze).toHaveBeenCalledTimes(1));

  expect(await screen.findByText(/Điểm an toàn: 78\/100/i)).toBeTruthy();
  expect(screen.getByText(/1 thao tác thay đổi Ma trận Phân quyền RBAC/i)).toBeTruthy();

  // Click the #19 chip inside the AI anomaly card to open the Diff Drawer
  const seqButtons = screen.getAllByRole('button', { name: '#19' });
  fireEvent.click(seqButtons[0]);
  expect(await screen.findByText(/Chi Tiết Bản Ghi Kiểm Toán #19/i)).toBeTruthy();
});
