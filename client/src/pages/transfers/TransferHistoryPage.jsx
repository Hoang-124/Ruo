import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { equipmentApi, movementApi } from '../../lib/api';

const STATUS_LABELS = {
  awaiting_approval: 'Chờ phê duyệt',
  approved: 'Đã duyệt - chờ thực hiện',
  pending: 'Chờ thực hiện',
  rejected: 'Đã từ chối',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy'
};

export const TransferHistoryPage = () => {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const [equipments, setEquipments] = useState([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let active = true;
    const loadEquipments = async () => {
      try {
        const firstPage = await equipmentApi.list({ page: 1, limit: 100 });
        const additionalPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
            equipmentApi.list({ page: index + 2, limit: 100 })
          )
        );
        if (active) {
          setEquipments([
            ...(firstPage.equipments || []),
            ...additionalPages.flatMap(page => page.equipments || [])
          ]);
        }
      } catch (error) {
        if (active) toastRef.current.error(`Không tải được danh sách thiết bị: ${error.message}`);
      }
    };
    loadEquipments();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const request = equipmentId
      ? movementApi.getEquipmentHistory(equipmentId)
      : movementApi.list();
    request.then(result => {
      if (active) setMovements(result.movements || []);
    }).catch(error => {
      if (active) toastRef.current.error(`Không tải được lịch sử điều chuyển: ${error.message}`);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [equipmentId]);

  return (
    <section>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--ink-pure)', fontSize: 24 }}>Lịch sử điều chuyển</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--ink-muted)', fontSize: 13 }}>
            Tra cứu các lần di chuyển thiết bị, trạng thái phê duyệt và người thực hiện.
          </p>
        </div>
        <label style={{ display: 'grid', gap: 6, minWidth: 260, fontSize: 12, fontWeight: 700 }}>
          Lọc theo thiết bị
          <select
            value={equipmentId}
            onChange={event => {
              setLoading(true);
              setEquipmentId(event.target.value);
            }}
            className="ruo-portal-input"
            style={{ height: 38 }}
          >
            <option value="">Tất cả thiết bị</option>
            {equipments.map(equipment => (
              <option key={equipment._id} value={equipment._id}>
                {equipment.code} — {equipment.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={24} className="spin" />
            <div style={{ marginTop: 10 }}>Đang tải lịch sử...</div>
          </div>
        ) : movements.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>
            Chưa có lịch sử điều chuyển cho thiết bị này.
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)' }}>
                {['Thiết bị', 'Từ phòng', 'Đến phòng', 'Lý do', 'Người yêu cầu', 'Người duyệt', 'Người thực hiện', 'Trạng thái', 'Thời gian'].map(label => (
                  <th key={label} style={{ padding: '12px 14px', color: 'var(--ink-pure)', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map(movement => (
                <tr key={movement._id} style={{ borderTop: '1px solid var(--hairline-soft)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <strong>{movement.equipment_id?.code || '—'}</strong>
                    <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{movement.equipment_id?.name || 'Thiết bị'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>{movement.from_room_id?.code || 'Kho / ngoài trường'}</td>
                  <td style={{ padding: '12px 14px' }}>{movement.to_room_id?.code || 'Kho / ngoài trường'}</td>
                  <td style={{ padding: '12px 14px', maxWidth: 240 }}>{movement.reason || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>{movement.ordered_by?.full_name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>{movement.approved_by?.full_name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>{movement.performed_by?.full_name || movement.assigned_to?.full_name || '—'}</td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: movement.status === 'rejected' ? '#EF4444' : movement.status === 'completed' ? '#10B981' : '#F59E0B' }}>
                      {STATUS_LABELS[movement.status] || movement.status}
                    </span>
                    {movement.reject_reason && <div style={{ color: '#EF4444', fontSize: 11, whiteSpace: 'normal' }}>{movement.reject_reason}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{new Date(movement.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default TransferHistoryPage;
