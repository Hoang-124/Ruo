import React from 'react';
import { Button } from '../../components/ui/Primitives';

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
