import React, { useCallback, useState } from 'react';
import { reportApi } from '../../lib/api';
import { Card } from '../../components/ui/Primitives';
import { reportDate, ReportPagination, ReportState, useReport } from './reportShared';

export function WarrantyReport({ refreshKey }) {
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(1);
  const report = useReport(useCallback(() => reportApi.getWarrantyExpiring({ days, page, limit: 20 }), [days, page]), refreshKey);
  const data = report.data;
  return <Card title="Thiết bị sắp hết bảo hành" subtitle="Tính từ hôm nay theo lịch Việt Nam · loại thiết bị đã thanh lý, mất hoặc bảo hành vô hiệu">
    <div className="dashboard-report-toolbar"><label>Hết hạn trong <select value={days} onChange={event => { setDays(event.target.value); setPage(1); }}>
      <option value="0">Hôm nay</option><option value="30">30 ngày tới</option><option value="60">60 ngày tới</option><option value="90">90 ngày tới</option><option value="365">365 ngày tới</option>
    </select></label></div>
    <ReportState report={report} label="báo cáo bảo hành">
      {data && <>
        <p><strong>{data.total}</strong> thiết bị cần theo dõi gia hạn.</p>
        <div className="dashboard-report-table"><table>
          <thead><tr><th scope="col">Thiết bị</th><th scope="col">Phòng / Loại</th><th scope="col">Ngày hết hạn</th><th scope="col">Còn lại</th><th scope="col">Nhà cung cấp / Liên hệ</th></tr></thead>
          <tbody>{data.equipment.map(item => <tr key={item._id}>
            <td><strong>{item.code}</strong><br />{item.name}</td><td>{item.room_id?.code || 'Chưa gán phòng'}<br />{item.category_id?.name || '—'}</td>
            <td>{reportDate(item.warranty_expiry)}</td><td>{item.daysRemaining === 0 ? 'Hôm nay' : `${item.daysRemaining} ngày`}</td>
            <td>{item.supplier_id?.name || 'Chưa có nhà cung cấp'}<br />{item.supplier_id?.contact}<br />{item.supplier_id?.phone}<br />{item.supplier_id?.email}</td>
          </tr>)}</tbody>
        </table></div>
        {data.equipment.length === 0 && <p>Không có thiết bị sắp hết bảo hành trong trang này.</p>}
        <ReportPagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </>}
    </ReportState>
  </Card>;
}
