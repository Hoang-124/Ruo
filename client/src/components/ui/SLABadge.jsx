import React from 'react';
import { Icons } from '../common/SvgIcons';

export const SLABadge = ({ slaState, remainingMinutes }) => {
  if (slaState === 'overdue' || remainingMinutes < 0) {
    const overdueMins = Math.abs(remainingMinutes);
    const overdueHours = Math.floor(overdueMins / 60);
    return (
      <span className="badge badge-danger sla-overdue-pulse" title="Sự cố đã quá hạn cam kết giải quyết (SLA Overdue)">
        <Icons.AlertTriangle size={13} />
        <span>QUÁ HẠN ({overdueHours > 0 ? `${overdueHours}h` : ''}{overdueMins % 60}m)</span>
      </span>
    );
  }

  if (slaState === 'at_risk' || remainingMinutes <= 60) {
    return (
      <span className="badge badge-warning" title="Sự cố có nguy cơ vi phạm SLA trong 60 phút tới">
        <Icons.Clock size={13} />
        <span>SẮP HẾT HẠN ({remainingMinutes}m còn lại)</span>
      </span>
    );
  }

  const hoursLeft = Math.floor(remainingMinutes / 60);
  return (
    <span className="badge badge-success" title="Tiến độ xử lý sự cố đang trong hạn SLA an toàn">
      <Icons.CheckCircle size={13} />
      <span>ON TRACK ({hoursLeft > 0 ? `${hoursLeft}h` : ''}{remainingMinutes % 60}m)</span>
    </span>
  );
};
