import React, { useState } from 'react';
import { Button } from '../../components/ui/Primitives';
import { Icons } from '../../components/common/SvgIcons';
import { RoomReport } from './RoomReport';
import { StatusReport } from './StatusReport';
import { FrequencyReport } from './FrequencyReport';
import { WarrantyReport } from './WarrantyReport';
import { OverdueReport } from './OverdueReport';
import { ExportReport } from './ExportReport';
import '../dashboard/dashboardAnalytics.css';
import './reports.css';

export function ReportsPage() {
  const [active, setActive] = useState('room');
  const [refreshKey, setRefreshKey] = useState(0);
  return <section className="reports-page" aria-label="Báo cáo quản trị">
    <div className="reports-heading">
      <div><h1>Báo cáo tài sản & vận hành</h1><p>Theo dõi phân bổ và giá trị tài sản toàn trường.</p></div>
      <Button variant="secondary" icon={Icons.RefreshCw} onClick={() => setRefreshKey(value => value + 1)}>Làm mới báo cáo</Button>
    </div>
    <nav className="reports-tabs" aria-label="Loại báo cáo">
      {[['room', 'Theo phòng'], ['status', 'Theo trạng thái'], ['frequency', 'Tần suất hỏng'], ['warranty', 'Sắp hết bảo hành'], ['overdue', 'Quá hạn SLA'], ['export', 'Xuất báo cáo']].map(([key, label]) =>
        <Button key={key} variant={active === key ? 'primary' : 'secondary'} aria-pressed={active === key} onClick={() => setActive(key)}>{label}</Button>)}
    </nav>
    {active === 'room' && <RoomReport refreshKey={refreshKey} />}
    {active === 'status' && <StatusReport refreshKey={refreshKey} />}
    {active === 'frequency' && <FrequencyReport refreshKey={refreshKey} />}
    {active === 'warranty' && <WarrantyReport refreshKey={refreshKey} />}
    {active === 'overdue' && <OverdueReport refreshKey={refreshKey} />}
    {active === 'export' && <ExportReport key={refreshKey} refreshKey={refreshKey} />}
  </section>;
}
