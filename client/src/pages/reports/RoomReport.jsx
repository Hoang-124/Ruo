import React, { useCallback } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { money, ReportState, useReport } from './reportShared';

export function RoomReport({ refreshKey }) {
  const report = useReport(useCallback(() => reportApi.getByRoom(), []), refreshKey);
  const data = report.data;
  const totals = data?.rooms.reduce((sum, room) => ({ count: sum.count + room.count, value: sum.value + room.value }), { ...data.unassigned });
  return <Card title="Phân bổ thiết bị theo phòng" subtitle="Nguyên giá tài sản hiện có · không gồm thiết bị đã thanh lý hoặc mất">
    <ReportState report={report} label="báo cáo theo phòng">
      {data && <>
        <div className="reports-summary"><span>Tổng thiết bị <strong>{totals.count}</strong></span><span>Tổng giá trị <strong>{money(totals.value)}</strong></span></div>
        <div className="dashboard-report-table"><table>
          <caption className="reports-caption">Phân bổ tài sản tại {data.rooms.length} phòng</caption>
          <thead><tr><th scope="col">Phòng</th><th scope="col">Tầng</th><th scope="col">Số thiết bị</th><th scope="col">Hỏng / đang sửa</th><th scope="col">Nguyên giá</th></tr></thead>
          <tbody>{data.rooms.map(room => <tr key={room._id}>
            <td><strong>{room.code}</strong><br />{room.name}</td><td>{room.floor ?? '—'}</td><td>{room.count}</td><td>{room.brokenCount}</td><td>{money(room.value)}</td>
          </tr>)}<tr><td>Chưa gán phòng / phòng không còn tồn tại</td><td>—</td><td>{data.unassigned.count}</td><td>—</td><td>{money(data.unassigned.value)}</td></tr></tbody>
        </table></div>
        {totals.count === 0 && <p>Chưa có thiết bị hiện có để thống kê.</p>}
      </>}
    </ReportState>
  </Card>;
}
