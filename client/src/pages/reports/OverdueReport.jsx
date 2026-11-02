import React, { useCallback, useState } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { ReportPagination, ReportState } from './reportShared';
import { useReport } from './reportUtils';

const severityLabels = { minor: 'Nhẹ', major: 'Nặng', critical: 'Nghiêm trọng' };
const statusLabels = { reported: 'Chờ tiếp nhận', assigned: 'Đã giao việc', in_progress: 'Đang sửa chữa' };
const elapsed = minutes => `${Math.floor(minutes / 60).toLocaleString('vi-VN')} giờ ${minutes % 60} phút`;

export function OverdueReport({ refreshKey }) {
  const [severity, setSeverity] = useState('all');
  const [page, setPage] = useState(1);
  const report = useReport(useCallback(() => reportApi.getOverdueRepairs({ severity, page, limit: 20 }), [severity, page]), refreshKey);
  const data = report.data;
  return <Card title="Sự cố quá hạn SLA" subtitle="Phiếu còn mở và đã quá deadline · ưu tiên hạn cam kết cũ nhất">
    <div className="dashboard-report-toolbar"><label>Mức độ hỏng <select value={severity} onChange={event => { setSeverity(event.target.value); setPage(1); }}>
      <option value="all">Tất cả mức độ</option>{Object.entries(severityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label></div>
    <ReportState report={report} label="báo cáo quá hạn SLA">
      {data && <>
        <div className="reports-summary">
          <span>Phiếu quá hạn cần xử lý <strong>{data.total}</strong></span>
        </div>
        <div className="dashboard-report-table"><table>
          <thead><tr><th scope="col">Phiếu / Thiết bị</th><th scope="col">Phòng</th><th scope="col">Người xử lý</th><th scope="col">Mức độ / Trạng thái</th><th scope="col">Hạn cam kết</th><th scope="col">Thời gian trễ</th></tr></thead>
          <tbody>{data.repairs.map(item => <tr key={item._id}>
            <td><strong className="reports-code-pill">{item.ticket_code}</strong><br /><span className="reports-room-name">{item.equipment_id ? `${item.equipment_id.code} · ${item.equipment_id.name}` : 'Thiết bị không còn tồn tại'}</span></td>
            <td style={{ fontWeight: 700 }}>{item.room_id?.code || 'Chưa lưu phòng phát sinh'}</td>
            <td style={{ fontWeight: 600 }}>{item.assigned_to?.full_name || item.repair_unit_id?.name || 'Chưa giao việc'}</td>
            <td><strong>{severityLabels[item.damage_level] || item.damage_level || '—'}</strong><br /><span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{statusLabels[item.status] || item.status || '—'}</span></td>
            <td>{new Date(item.deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
            <td><span className="reports-broken-pill alert">{elapsed(item.overdueMinutes)}</span></td>
          </tr>)}</tbody>
        </table></div>
        {data.repairs.length === 0 && <p>Không có phiếu quá hạn trong trang này.</p>}
        <ReportPagination page={page} totalPages={data.totalPages} onPage={setPage} />
        <p className="dashboard-report-note">Thời gian trễ tính theo giờ liên tục từ deadline tới lúc tải báo cáo, làm tròn lên phút. Không gồm phiếu đã khắc phục, không thể sửa hoặc đã đóng. Dùng “Làm mới báo cáo” để cập nhật.</p>
      </>}
    </ReportState>
  </Card>;
}
