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
  const inUseCount = groups.find(row => row.status === 'in_use')?.count || 0;
  return <Card title="Thiết bị theo trạng thái" subtitle="Toàn bộ tài sản đã đăng ký, bao gồm đã thanh lý và thất lạc">
    <ReportState report={report} label="báo cáo theo trạng thái">
      {report.data && <>
        <div className="reports-summary">
          <span>Tổng thiết bị <strong>{total}</strong></span>
          <span>Tổng nguyên giá <strong>{money(value)}</strong></span>
          <span>Đang vận hành tốt <strong>{inUseCount}</strong></span>
        </div>
        {total === 0 ? <p>Chưa có tài sản để thống kê trạng thái.</p> : <svg className="reports-status-chart" viewBox={`0 0 700 ${groups.length * 40}`} role="img" aria-label="Phân bổ thiết bị theo trạng thái">
          {groups.map((row, index) => <g key={row.status}>
            <title>{EQUIPMENT_LABELS[row.status] || row.status}: {row.count} thiết bị</title>
            <text x="0" y={index * 40 + 22} fill="currentColor" fontSize="13" fontWeight="700" aria-hidden="true">{EQUIPMENT_LABELS[row.status] || row.status}</text>
            <rect x="170" y={index * 40 + 6} width="460" height="22" rx="6" fill="rgba(148, 163, 184, 0.14)" />
            <rect x="170" y={index * 40 + 6} width={Math.max(row.count > 0 ? 6 : 0, row.count / max * 460)} height="22" rx="6" fill={colors[index % colors.length]} />
            <text x="645" y={index * 40 + 22} fill="currentColor" fontSize="13" fontWeight="800">{row.count}</text>
          </g>)}
        </svg>}
        <div className="dashboard-report-table"><table>
          <thead><tr><th scope="col">Trạng thái</th><th scope="col">Số thiết bị</th><th scope="col">Tỷ trọng</th><th scope="col">Nguyên giá</th></tr></thead>
          <tbody>{groups.map((row, index) => <tr key={row.status}>
            <td style={{ fontWeight: 700 }}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: colors[index % colors.length], marginRight: 8 }} aria-hidden="true" />{EQUIPMENT_LABELS[row.status] || row.status}</td>
            <td style={{ fontWeight: 700 }}>{row.count}</td>
            <td style={{ fontWeight: 600 }}>{(total ? row.count / total * 100 : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</td>
            <td className="reports-value-cell">{money(row.value)}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
    </ReportState>
  </Card>;
}
