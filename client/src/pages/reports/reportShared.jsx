import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Primitives';

export const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
export const reportDate = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

export function useReport(load, refreshKey) {
  const [state, setState] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    load().then(data => {
      if (active) setState({ load, refreshKey, retryKey, error: '', data });
    }).catch(error => {
      if (active) setState({ load, refreshKey, retryKey, error: error.message || 'Không tải được báo cáo.', data: null });
    });
    return () => { active = false; };
  }, [load, refreshKey, retryKey]);
  const current = state?.load === load && state.refreshKey === refreshKey && state.retryKey === retryKey;
  return { loading: !current, data: current ? state.data : null, error: current ? state.error : '', retry: () => setRetryKey(key => key + 1) };
}

export function ReportState({ report, label, children }) {
  if (report.loading) return <p role="status">Đang tải {label}…</p>;
  if (report.error) return <div role="alert" className="dashboard-report-error">
    <span>{report.error}</span>
    <Button variant="secondary" size="sm" onClick={report.retry} aria-label={`Thử lại ${label}`}>Thử lại</Button>
  </div>;
  return children;
}

export function ReportPagination({ page, totalPages, onPage }) {
  return <div className="dashboard-report-toolbar">
    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button>
    <span>Trang {page} / {totalPages}</span>
    <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Trang sau</Button>
  </div>;
}
