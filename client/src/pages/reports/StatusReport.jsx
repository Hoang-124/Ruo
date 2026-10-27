import React, { useCallback } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { ReportState } from './reportShared';
import { money, useReport } from './reportUtils';

const EQUIPMENT_LABELS = {
  in_use: 'Đang sử dụng', in_stock: 'Trong kho', broken: 'Hỏng', repairing: 'Đang sửa chữa',
  pending_disposal: 'Chờ thanh lý', disposed: 'Đã thanh lý', lost: 'Thất lạc'
};
const colors = ['#059669', '#0284c7', '#dc2626', '#d97706', '#7c3aed', '#64748b', '#9f1239'];

export function StatusReport({ refreshKey }) {
  const report = useReport(useCallback(() => reportApi.getByStatus(), []), refreshKey);
  const groups = report.data?.groups || [];
  const total = groups.reduce((sum, row) => sum + row.count, 0);
  const value = groups.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...groups.map(row => row.count));
  return <Card title="Thiết bị theo trạng thái" subtitle="Toàn bộ tài sản đã đăng ký, bao gồm đã thanh lý và thất lạc">
    <ReportState report={report} label="báo cáo theo trạng thái">
      {report.data && <>
        <div className="reports-summary"><span>Tổng thiết bị <strong>{total}</strong></span><span>Tổng nguyên giá <strong>{money(value)}</strong></span></div>
        {total === 0 ? <p>Chưa có tài sản để thống kê trạng thái.</p> : <svg className="reports-status-chart" viewBox={`0 0 700 ${groups.length * 36}`} role="img" aria-label="Phân bổ thiết bị theo trạng thái">
          {groups.map((row, index) => <g key={row.status}>
            <title>{EQUIPMENT_LABELS[row.status] || row.status}: {row.count} thiết bị</title>
            <text x="0" y={index * 36 + 20} fill="currentColor" fontSize="13" aria-hidden="true">{EQUIPMENT_LABELS[row.status] || row.status}</text>
            <rect x="170" y={index * 36 + 3} width={row.count / max * 460} height="24" rx="4" fill={colors[index % colors.length]} />
            <text x="645" y={index * 36 + 20} fill="currentColor" fontSize="13">{row.count}</text>
          </g>)}
        </svg>}
        <div className="dashboard-report-table"><table>
          <thead><tr><th scope="col">Trạng thái</th><th scope="col">Số thiết bị</th><th scope="col">Tỷ trọng</th><th scope="col">Nguyên giá</th></tr></thead>
          <tbody>{groups.map(row => <tr key={row.status}><td>{EQUIPMENT_LABELS[row.status] || row.status}</td><td>{row.count}</td>
            <td>{(total ? row.count / total * 100 : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</td><td>{money(row.value)}</td></tr>)}</tbody>
        </table></div>
      </>}
    </ReportState>
  </Card>;
}
