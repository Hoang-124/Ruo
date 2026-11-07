import React, { useCallback } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { ReportState } from './reportShared';
import { money, useReport } from './reportUtils';

export function RoomReport({ refreshKey }) {
  const report = useReport(useCallback(() => reportApi.getByRoom(), []), refreshKey);
  const data = report.data;
  const totals = data?.rooms.reduce((sum, room) => ({ count: sum.count + room.count, value: sum.value + room.value, broken: (sum.broken || 0) + (room.brokenCount || 0) }), { ...data.unassigned, broken: 0 });
  return <Card title="Phân bổ thiết bị theo phòng" subtitle="Nguyên giá tài sản hiện có · không gồm thiết bị đã thanh lý hoặc mất">
    <ReportState report={report} label="báo cáo theo phòng">
      {data && <>
        <div className="reports-summary">
          <span>Tổng thiết bị <strong>{totals.count}</strong></span>
          <span>Tổng giá trị <strong>{money(totals.value)}</strong></span>
          <span>Tổng số phòng <strong>{data.rooms.length}</strong></span>
          <span>Thiết bị hỏng / đang sửa <strong>{totals.broken}</strong></span>
        </div>
        <div className="dashboard-report-table"><table>
          <caption className="reports-caption">Phân bổ tài sản tại {data.rooms.length} phòng</caption>
          <thead><tr><th scope="col">Phòng</th><th scope="col">Tầng</th><th scope="col">Số thiết bị</th><th scope="col">Hỏng / đang sửa</th><th scope="col">Nguyên giá</th></tr></thead>
          <tbody>{data.rooms.map(room => <tr key={room._id}>
            <td><strong className="reports-code-pill">{room.code}</strong><br /><span className="reports-room-name">{room.name}</span></td>
            <td><span className="reports-floor-pill">{room.floor ?? '—'}</span></td>
            <td style={{ fontWeight: 700 }}>{room.count}</td>
            <td><span className={`reports-broken-pill ${room.brokenCount > 0 ? 'alert' : 'healthy'}`}>{room.brokenCount}</span></td>
            <td className="reports-value-cell">{money(room.value)}</td>
          </tr>)}<tr>
            <td><strong className="reports-code-pill">KHO / CHƯA GÁN</strong><br /><span className="reports-room-name">Chưa gán phòng / phòng không còn tồn tại</span></td>
            <td><span className="reports-floor-pill">—</span></td>
            <td style={{ fontWeight: 700 }}>{data.unassigned.count}</td>
            <td>—</td>
            <td className="reports-value-cell">{money(data.unassigned.value)}</td>
          </tr></tbody>
        </table></div>
        {totals.count === 0 && <p>Chưa có thiết bị hiện có để thống kê.</p>}
      </>}
    </ReportState>
  </Card>;
}
