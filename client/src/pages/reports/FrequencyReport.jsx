import React, { useCallback, useState } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { ReportState } from './reportShared';
import { useReport } from './reportUtils';

function FrequencyTable({ title, rows }) {
  return <div className="dashboard-report-table"><table>
    <caption className="reports-caption">{title}</caption>
    <thead><tr><th scope="col">Nhóm</th><th scope="col">Số sự cố</th><th scope="col">Thiết bị có sự cố</th><th scope="col">Sự cố / TB có sự cố</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row._id || 'unknown'}><td><strong>{row.code}</strong><br />{row.name}</td>
      <td>{row.failureCount}</td><td>{row.affectedEquipment}</td><td>{row.incidentsPerEquipment.toLocaleString('vi-VN')}</td></tr>)}</tbody>
  </table>{rows.length === 0 && <p>Không có sự cố trong năm này.</p>}</div>;
}

export function FrequencyReport({ refreshKey }) {
  const [year, setYear] = useState(() => new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  const report = useReport(useCallback(() => reportApi.getRepairFrequency({ year }), [year]), refreshKey);
  const data = report.data;
  return <Card title="Tần suất hỏng hóc" subtitle="Đếm phiếu sự cố theo năm · gồm cả sự cố đã khắc phục">
    <div className="dashboard-report-toolbar"><label>Năm thống kê sự cố <input type="number" min="2000" max="2100" value={year} onChange={event => setYear(event.target.value)} /></label></div>
    <ReportState report={report} label="tần suất hỏng">
      {data && <>
        <div className="reports-summary"><span>Sự cố <strong>{data.summary.failureCount}</strong></span><span>Thiết bị có sự cố <strong>{data.summary.affectedEquipment}</strong></span></div>
        <FrequencyTable title="Theo loại thiết bị" rows={data.byCategory} />
        <FrequencyTable title="Theo phòng phát sinh" rows={data.byRoom} />
        <p className="dashboard-report-note">Tần suất = số phiếu / số thiết bị có sự cố trong nhóm. Không phải tỷ lệ hỏng trên toàn bộ thiết bị. Loại thiết bị lấy từ danh mục hiện tại; phòng ưu tiên nơi phát sinh lưu trên phiếu.</p>
        {data.summary.legacyRoomCount > 0 && <p role="note">Có {data.summary.legacyRoomCount} phiếu thiếu phòng phát sinh; dùng phòng hiện tại của thiết bị nếu có.</p>}
      </>}
    </ReportState>
  </Card>;
}
