import React, { useCallback, useEffect, useState } from 'react';
import { reportApi } from '../../lib/api';
import { KPI, Button } from '../../components/ui/Primitives';
import { Icons } from '../../components/common/SvgIcons';
import './dashboardAnalytics.css';

const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

function useReport(load, refreshKey) {
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

function ReportState({ report, label, children }) {
  if (report.loading) return <p role="status">Đang tải {label}…</p>;
  if (report.error) return <div role="alert" className="dashboard-report-error">
    <span>{report.error}</span>
    <Button variant="secondary" size="sm" onClick={report.retry} aria-label={`Thử lại ${label}`}>Thử lại</Button>
  </div>;
  return children;
}

export function DashboardAnalytics({ refreshKey = 0 }) {
  const kpi = useReport(useCallback(() => reportApi.getDashboard(), []), refreshKey);
  const metrics = kpi.data?.metrics;

  return <section className="dashboard-analytics" aria-label="Phân tích vận hành">
    <ReportState report={kpi} label="chỉ số tổng quan">
      {metrics && <div className="dashboard-kpi-grid">
        <KPI label="Tổng số thiết bị" value={metrics.totalEquipment} subtext="Toàn bộ tài sản đã đăng ký" icon={Icons.Equipment} color="#3E7BFA" />
        <KPI label="Tỷ lệ hoạt động" value={`${metrics.operatingRate}%`} subtext="Đang sử dụng / chưa thanh lý, mất" icon={Icons.CheckCircle} color="#2FB37A" />
        <KPI label="Thiết bị hỏng" value={metrics.brokenEquipment} subtext={`${metrics.repairingEquipment || 0} thiết bị đang sửa`} icon={Icons.Wrench} color="#E5A33B" />
        <KPI label="Ca sửa quá hạn" value={metrics.overdueRepairs} subtext="Phiếu còn mở và đã quá hạn" icon={Icons.Clock} color="#E5484D" />
        <KPI label="Giá trị kho" value={money(metrics.warehouseValue)} subtext={`Thiết bị ${money(metrics.equipmentStockValue)} · linh kiện ${money(metrics.sparePartsValue)}`} icon={Icons.Layers} color="#3E7BFA" />
      </div>}
    </ReportState>

  </section>;
}
