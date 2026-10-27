import React, { useState } from 'react';
import { Button } from '../../components/ui/Primitives';
import { Icons } from '../../components/common/SvgIcons';
import { RoomReport } from './RoomReport';
import '../dashboard/dashboardAnalytics.css';
import './reports.css';

export function ReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return <section className="reports-page" aria-label="Báo cáo quản trị">
    <div className="reports-heading">
      <div><h1>Báo cáo tài sản & vận hành</h1><p>Theo dõi phân bổ và giá trị tài sản toàn trường.</p></div>
      <Button variant="secondary" icon={Icons.RefreshCw} onClick={() => setRefreshKey(value => value + 1)}>Làm mới báo cáo</Button>
    </div>
    <RoomReport refreshKey={refreshKey} />
  </section>;
}
