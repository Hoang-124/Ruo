import React, { useCallback, useEffect, useState } from 'react';
import { reportApi } from '../../lib/api';
import { Card, KPI, Button } from '../../components/ui/Primitives';
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

function CostChart({ series }) {
  const max = Math.max(1, ...series.map(row => row.totalCost));
  const step = 680 / Math.max(1, series.length);
  return <svg viewBox="0 0 760 260" role="img" aria-label="Biểu đồ chi phí sửa chữa và linh kiện" className="dashboard-cost-chart">
    {[0, 0.5, 1].map(fraction => <g key={fraction}>
      <line x1="65" x2="745" y1={210 - fraction * 180} y2={210 - fraction * 180} stroke="var(--border-default)" />
      <text x="58" y={214 - fraction * 180} textAnchor="end" fill="currentColor" fontSize="11">{(max * fraction / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</text>
    </g>)}
    <text x="65" y="15" fill="currentColor" fontSize="11">Triệu đồng</text>
    {series.map((row, index) => {
      const repairHeight = row.repairCost / max * 180;
      const partsHeight = row.partsCost / max * 180;
      const x = 65 + step * index + step * 0.2;
      return <g key={row.key}>
        <title>{row.label}: sửa chữa {money(row.repairCost)}, linh kiện {money(row.partsCost)}</title>
        <rect x={x} y={210 - repairHeight} width={step * 0.6} height={repairHeight} fill="#3E7BFA" rx="2" />
        <rect x={x} y={210 - repairHeight - partsHeight} width={step * 0.6} height={partsHeight} fill="#E5A33B" rx="2" />
        <text x={x + step * 0.3} y="232" textAnchor="middle" fill="currentColor" fontSize="11">{row.label.replace('Tháng ', 'T').replace('Quý ', 'Q')}</text>
      </g>;
    })}
  </svg>;
}

export function DashboardAnalytics({ refreshKey = 0 }) {
  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())));
  const [period, setPeriod] = useState('month');
  const [page, setPage] = useState(1);
  const kpi = useReport(useCallback(() => reportApi.getDashboard(), []), refreshKey);
  const costs = useReport(useCallback(() => reportApi.getRepairCosts({ year, period }), [year, period]), refreshKey);
  const health = useReport(useCallback(() => reportApi.getEquipmentHealth({ page, limit: 10 }), [page]), refreshKey);
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

    <Card title="Xu hướng chi phí sửa chữa" subtitle="Chi phí ghi nhận theo thời điểm phát sinh · múi giờ Việt Nam">
      <div className="dashboard-report-toolbar">
        <label>Năm báo cáo <input aria-label="Năm báo cáo" type="number" min="2000" max="2100" value={year}
          onChange={event => setYear(event.target.value)} /></label>
        <label>Kỳ báo cáo <select aria-label="Kỳ báo cáo" value={period} onChange={event => setPeriod(event.target.value)}>
          <option value="month">Theo tháng</option><option value="quarter">Theo quý</option>
        </select></label>
      </div>
      <ReportState report={costs} label="chi phí sửa chữa">
        {costs.data && <>
          <p>Tổng chi phí: <strong>{money(costs.data.totals.totalCost)}</strong></p>
          <div className="dashboard-chart-legend"><span><i style={{ background: '#3E7BFA' }} />Sửa chữa</span><span><i style={{ background: '#E5A33B' }} />Linh kiện xuất kho</span></div>
          {costs.data.totals.totalCost === 0 && <p>Chưa ghi nhận chi phí trong năm này.</p>}
          <CostChart series={costs.data.series} />
          {costs.data.unpricedItems > 0 && <p role="note">Có {costs.data.unpricedItems} dòng linh kiện có đơn giá bằng 0 hoặc chưa được ghi nhận; tổng chi phí có thể chưa đầy đủ.</p>}
          <details><summary>Xem số liệu chi tiết</summary><div className="dashboard-report-table"><table>
            <thead><tr><th>Kỳ</th><th>Sửa chữa</th><th>Linh kiện</th><th>Tổng</th></tr></thead>
            <tbody>{costs.data.series.map(row => <tr key={row.key}><td>{row.label}</td><td>{money(row.repairCost)}</td><td>{money(row.partsCost)}</td><td>{money(row.totalCost)}</td></tr>)}</tbody>
          </table></div></details>
          <p className="dashboard-report-note">Chi phí sửa chữa lấy từ nhật ký; linh kiện lấy theo đơn giá lưu lúc duyệt xuất kho. Chi phí nhật ký cần loại trừ linh kiện đã xuất kho để tránh ghi nhận hai lần.</p>
        </>}
      </ReportState>
    </Card>

    <Card title="Sức khỏe thiết bị & MTBF" subtitle="Ưu tiên thiết bị có điểm thấp · MTBF ước tính theo ngày tuổi thiết bị">
      <ReportState report={health} label="sức khỏe thiết bị">
        {health.data && <>
          <p>Điểm trung bình: <strong>{health.data.summary.averageHealthScore ?? 'Chưa đủ dữ liệu'}{health.data.summary.averageHealthScore != null ? '/100' : ''}</strong></p>
          <div className="dashboard-report-table"><table>
            <thead><tr><th>Thiết bị</th><th>Tuổi (ngày)</th><th>Số sự cố</th><th>MTBF (ngày)</th><th>Điểm / 100</th></tr></thead>
            <tbody>{health.data.equipment.map(item => <tr key={item._id}>
              <td><strong>{item.code}</strong><br />{item.name}</td><td>{item.ageDays ?? 'Chưa rõ'}</td><td>{item.failureCount}</td>
              <td>{item.mtbfDays ?? (item.failureCount === 0 ? 'Chưa có sự cố' : 'Chưa đủ dữ liệu')}</td><td>{item.healthScore ?? 'Chưa đủ dữ liệu'}</td>
            </tr>)}</tbody>
          </table></div>
          {health.data.equipment.length === 0 && <p>Không có thiết bị trong trang này.</p>}
          <div className="dashboard-report-toolbar">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button>
            <span>Trang {page} / {health.data.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= health.data.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</Button>
          </div>
          <p className="dashboard-report-note">MTBF = tuổi thiết bị / số phiếu sự cố. Điểm = 100 × tuổi / (tuổi + 30 × số sự cố). Đây là chỉ số tham khảo theo ngày lịch, chưa trừ thời gian dừng máy. Chưa có sự cố không có nghĩa là MTBF vô hạn.</p>
        </>}
      </ReportState>
    </Card>
  </section>;
}
