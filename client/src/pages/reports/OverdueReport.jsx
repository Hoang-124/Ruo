import React, { useCallback, useState } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { ReportPagination, ReportState, useReport } from './reportShared';

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
        <p><strong>{data.total}</strong> phiếu quá hạn cần xử lý.</p>
        <div className="dashboard-report-table"><table>
          <thead><tr><th scope="col">Phiếu / Thiết bị</th><th scope="col">Phòng</th><th scope="col">Người xử lý</th><th scope="col">Mức độ / Trạng thái</th><th scope="col">Hạn cam kết</th><th scope="col">Thời gian trễ</th></tr></thead>
          <tbody>{data.repairs.map(item => <tr key={item._id}>
            <td><strong>{item.ticket_code}</strong><br />{item.equipment_id?.code} · {item.equipment_id?.name || 'Thiết bị không còn tồn tại'}</td>
            <td>{item.room_id?.code || 'Chưa lưu phòng phát sinh'}</td><td>{item.assigned_to?.full_name || item.repair_unit_id?.name || 'Chưa giao việc'}</td>
            <td>{severityLabels[item.damage_level]}<br />{statusLabels[item.status]}</td>
            <td>{new Date(item.deadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>{elapsed(item.overdueMinutes)}</td>
          </tr>)}</tbody>
        </table></div>
        {data.repairs.length === 0 && <p>Không có phiếu quá hạn trong trang này.</p>}
        <ReportPagination page={page} totalPages={data.totalPages} onPage={setPage} />
        <p className="dashboard-report-note">Thời gian trễ tính theo giờ liên tục từ deadline tới lúc tải báo cáo, làm tròn lên phút. Không gồm phiếu đã khắc phục, không thể sửa hoặc đã đóng. Dùng “Làm mới báo cáo” để cập nhật.</p>
      </>}
    </ReportState>
  </Card>;
}
