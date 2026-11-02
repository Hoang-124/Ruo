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
  const tabs = [
    ['room', 'Theo phòng', Icons.Building],
    ['status', 'Theo trạng thái', Icons.BarChart],
    ['frequency', 'Tần suất hỏng', Icons.Wrench],
    ['warranty', 'Sắp hết bảo hành', Icons.Shield],
    ['overdue', 'Quá hạn SLA', Icons.Clock],
    ['export', 'Xuất báo cáo', Icons.Download]
  ];
  return <section className="reports-page" aria-label="Báo cáo quản trị">
    <div className="reports-heading">
      <div>
        <div className="reports-heading-badge-row">
          <span className="reports-heading-role-pill">BÁO CÁO QUẢN TRỊ • EXECUTIVE BI</span>
          <span className="reports-heading-subpill">Phân tích tài sản, tần suất sự cố & giám sát cam kết SLA</span>
        </div>
        <h1>Báo cáo tài sản & vận hành</h1>
        <p>Theo dõi phân bổ và giá trị tài sản toàn trường.</p>
      </div>
      <Button variant="secondary" icon={Icons.RefreshCw} onClick={() => setRefreshKey(value => value + 1)}>Làm mới báo cáo</Button>
    </div>
    <nav className="reports-tabs" aria-label="Loại báo cáo">
      {tabs.map(([key, label, IconComp]) =>
        <Button key={key} variant={active === key ? 'primary' : 'secondary'} icon={IconComp} aria-pressed={active === key} onClick={() => setActive(key)}>{label}</Button>)}
    </nav>
    {active === 'room' && <RoomReport refreshKey={refreshKey} />}
    {active === 'status' && <StatusReport refreshKey={refreshKey} />}
    {active === 'frequency' && <FrequencyReport refreshKey={refreshKey} />}
    {active === 'warranty' && <WarrantyReport refreshKey={refreshKey} />}
    {active === 'overdue' && <OverdueReport refreshKey={refreshKey} />}
    {active === 'export' && <ExportReport key={refreshKey} refreshKey={refreshKey} />}
  </section>;
}
