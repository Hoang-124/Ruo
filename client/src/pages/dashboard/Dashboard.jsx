import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/common/SvgIcons';
import { FloorPlan2D } from '../../components/common/FloorPlan2D';
import { Building2DIso } from '../../components/common/Building2DIso';
import { CAMPUS_FLOORS } from '../../mock/campusBuildingData';
import { equipmentApi, transferApi, repairApi, disposalApi, auditApi } from '../../lib/api';
import { Button, Card, KPI, StatusBadge, Drawer, EmptyState } from '../../components/ui/Primitives';

/**
 * Dashboard - UEMS Operational Command Center
 * 
 * Features:
 * - Real-time KPI metrics & cryptographic SHA-256 chain indicator
 * - Role-tailored Action Queue (Manager approvals, Staff repair dispatch)
 * - Interactive Digital Twin Floor Plan (FloorPlan2D) of Tòa Nhà A1 (5 Floors)
 * - Recent Immutable Audit Log entries
 */
export const Dashboard = ({ onNavigateTab, onOpenQRModal }) => {
  const { currentUser, currentRoleKey } = useAuth();

  const isAdmin = currentRoleKey === 'admin';
  const isManager = currentRoleKey === 'manager';
  const isStaff = currentRoleKey === 'staff';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCount: 0,
    repairingCount: 0,
    pendingTransfers: 0,
    pendingDisposals: 0,
    totalValuation: 0
  });

  const [actionItems, setActionItems] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [auditChainValid, setAuditChainValid] = useState(true);

  // Digital Twin Floor Plan State
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [floorPlanView, setFloorPlanView] = useState('plan'); // 'plan' | 'iso'

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [eqRes, trRes, repRes, dispRes, audRes, chainRes] = await Promise.all([
        equipmentApi.list({ limit: 100 }),
        transferApi.list({ status: 'pending' }),
        repairApi.list(),
        disposalApi.list(),
        auditApi.getLogs({ limit: 5 }),
        auditApi.verifyChain()
      ]);

      const equipments = eqRes.items || eqRes.equipments || [];
      const activeCount = equipments.filter(e => e.status === 'active').length;
      const repairingCount = equipments.filter(e => e.status === 'repairing').length;
      const totalVal = equipments.reduce((acc, e) => acc + (Number(e.price) || 0), 0);

      const transfers = trRes.transfers || [];
      const disposals = dispRes.proposals || [];

      setStats({
        activeCount,
        repairingCount,
        pendingTransfers: transfers.filter(t => t.status === 'pending').length,
        pendingDisposals: disposals.filter(d => ['proposed', 'hc_approved'].includes(d.status)).length,
        totalValuation: totalVal
      });

      // Role-Tailored Action Items
      let items = [];
      if (isManager || isAdmin) {
        transfers.filter(t => t.status === 'pending').forEach(t => {
          items.push({
            id: t._id,
            type: 'transfer',
            title: `Phê duyệt điều chuyển: ${t.equipment_id?.code || 'Thiết bị'}`,
            subtitle: `${t.from_room_id?.code || 'Kho'} → ${t.to_room_id?.code || 'Phòng'} • ${t.reason}`,
            tab: 'transfers',
            time: t.created_at
          });
        });

        disposals.filter(d => d.status === 'proposed').forEach(d => {
          items.push({
            id: d._id,
            type: 'disposal',
            title: `Xét duyệt thanh lý Phòng HC: ${d.equipment_id?.code || 'Tài sản'}`,
            subtitle: `R-Ratio: ${Math.round(d.equipment_id?.rRatio || 65)}% • ${d.reason}`,
            tab: 'disposal_calc',
            time: d.created_at
          });
        });
      }

      if (isStaff) {
        const repairs = repRes.repairs || [];
        repairs.filter(r => ['reported', 'assigned', 'in_progress'].includes(r.status)).forEach(r => {
          items.push({
            id: r._id,
            type: 'repair',
            title: `Sự cố cần xử lý: ${r.equipment_id?.code || 'Thiết bị'}`,
            subtitle: `${r.incident_description} (${r.damage_level === 'major' ? 'Hỏng nặng' : 'Hỏng nhẹ'})`,
            tab: 'tickets_kanban',
            time: r.created_at
          });
        });
      }

      setActionItems(items);
      setRecentAudits(audRes.logs || []);
      if (chainRes.success && chainRes.verification) {
        setAuditChainValid(chainRes.verification.isValid);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentRoleKey]);

  // Determine room simulated status for floor plan
  const getRoomSimulatedStatus = useCallback((room) => {
    if (room.statusOverride === 'maintenance') {
      return {
        status: 'maintenance',
        label: 'Bảo Trì',
        color: '#E5A33B',
        bg: 'rgba(229, 163, 59, 0.12)',
        border: 'rgba(229, 163, 59, 0.35)'
      };
    }
    return {
      status: 'available',
      label: 'Hoạt Động',
      color: '#2FB37A',
      bg: 'rgba(47, 179, 122, 0.12)',
      border: 'rgba(47, 179, 122, 0.35)'
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Welcome & Role Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Trung Tâm Vận Hành Cơ Sở Vật Chất (UEMS Operational Command)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Chào mừng <strong>{currentUser?.name}</strong> • Vai trò: <span style={{ color: 'var(--blueprint-400)', fontWeight: 700 }}>{currentUser?.roleTitle}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button variant="secondary" icon={Icons.Equipment} onClick={() => onNavigateTab('equipments')}>
            Kho Thiết Bị
          </Button>
          <Button variant="secondary" icon={Icons.Building} onClick={() => onNavigateTab('map')}>
            Bản Đồ CAD
          </Button>
          <Button variant="primary" icon={Icons.Clock} onClick={fetchDashboardData}>
            Cập Nhật Số Liệu
          </Button>
        </div>
      </div>

      {/* KPI Overview Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KPI
          label="Thiết Bị Hoạt Động"
          value={stats.activeCount}
          subtext="Sẵn sàng phục vụ đào tạo"
          icon={Icons.Equipment}
          color="#2FB37A"
          onClick={() => onNavigateTab('equipments')}
        />

        <KPI
          label="Đang Sửa Chữa"
          value={stats.repairingCount}
          subtext="Theo dõi tiến độ Kanban SLA"
          icon={Icons.Wrench}
          color="#E5A33B"
          onClick={() => onNavigateTab('tickets_kanban')}
        />

        <KPI
          label="Phiếu Chờ Duyệt"
          value={stats.pendingTransfers + stats.pendingDisposals}
          subtext={`${stats.pendingTransfers} điều chuyển • ${stats.pendingDisposals} thanh lý`}
          icon={Icons.Clock}
          color="#3E7BFA"
          onClick={() => onNavigateTab(isManager ? 'transfers' : 'disposal_calc')}
        />

        <KPI
          label="Tổng Giá Trị CSVC"
          value={`${Math.round(stats.totalValuation / 1000000)} Tr đ`}
          subtext="Khấu hao theo chuẩn tài sản công"
          icon={Icons.CheckCircle}
          color="#8B5CF6"
          onClick={() => onNavigateTab('equipments')}
        />
      </div>

      {/* Cryptographic Ledger Health Strip (Immutable SHA-256) */}
      <div
        style={{
          background: auditChainValid ? 'rgba(47, 179, 122, 0.08)' : 'rgba(229, 72, 77, 0.12)',
          border: `1px solid ${auditChainValid ? 'rgba(47, 179, 122, 0.25)' : 'rgba(229, 72, 77, 0.35)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: auditChainValid ? '#2FB37A' : '#E5484D' }} />
          <span style={{ fontSize: '12.5px', color: 'var(--ink-primary)' }}>
            Chuỗi kiểm toán SHA-256 Tamper-Evident: <strong style={{ color: auditChainValid ? '#2FB37A' : '#E5484D' }}>{auditChainValid ? 'HỢP LỆ & NGUYÊN VẸN' : 'PHÁT HIỆN CAN THIỆP'}</strong>
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
          onClick={() => onNavigateTab('audit_log')}
        >
          Mở Sổ Cái Mật Mã →
        </Button>
      </div>

      {/* ==============================================================
          HERO SECTION: SƠ ĐỒ MẶT BẰNG PHÒNG HỌC TÒA A1 (DIGITAL TWIN)
          ============================================================== */}
      <Card
        title="Sơ Đồ Mặt Bằng Phòng Học — Tòa Nhà A1 (Digital Twin CAD)"
        subtitle="Mặt bằng kiến trúc các phòng mép Bắc & mép Nam, trục hành lang 3.5m, lõi buồng thang thoát hiểm & thang máy"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: 'var(--surface-base)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
              <button
                type="button"
                onClick={() => setFloorPlanView('plan')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: floorPlanView === 'plan' ? 'var(--blueprint-500)' : 'transparent',
                  color: floorPlanView === 'plan' ? '#FFFFFF' : 'var(--ink-muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Mặt Bằng 2D
              </button>
              <button
                type="button"
                onClick={() => setFloorPlanView('iso')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: floorPlanView === 'iso' ? 'var(--blueprint-500)' : 'transparent',
                  color: floorPlanView === 'iso' ? '#FFFFFF' : 'var(--ink-muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Phối Cảnh 2.5D
              </button>
            </div>

            <Button size="sm" variant="secondary" onClick={() => onNavigateTab('map')}>
              Mở Rộng Không Gian CAD →
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Visual Display */}
          {floorPlanView === 'plan' ? (
            <FloorPlan2D
              selectedFloor={selectedFloor}
              onChangeFloor={(fl) => {
                setSelectedFloor(fl);
                setSelectedRoom(null);
              }}
              selectedRoom={selectedRoom}
              onSelectRoom={(room) => {
                setSelectedRoom(room);
              }}
              getRoomSimulatedStatus={getRoomSimulatedStatus}
              currentTimeString="11:15"
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', background: 'var(--surface-base)', borderRadius: '12px' }}>
              <Building2DIso
                activeFloor={selectedFloor}
                onSelectFloor={(fl) => setSelectedFloor(fl)}
              />
            </div>
          )}

          {/* Quick Room Callout If Room is Selected */}
          {selectedRoom && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--surface-3)',
                borderRadius: '8px',
                border: '1px solid var(--blueprint-400)',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)', marginRight: '8px' }}>
                  {selectedRoom.code}
                </span>
                <strong style={{ color: 'var(--ink-primary)', fontSize: '13.5px' }}>
                  {selectedRoom.name}
                </strong>
                <span style={{ color: 'var(--ink-muted)', fontSize: '12px', marginLeft: '8px' }}>
                  ({selectedRoom.capacity ? `${selectedRoom.capacity} chỗ ngồi` : `${selectedRoom.area || 60} m²`}) • Tầng {selectedFloor}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" variant="primary" onClick={() => onNavigateTab('map')}>
                  Kiểm Tra Chi Tiết Thiết Bị Phòng →
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedRoom(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lower Grid: My Action Items (Left 60%) + Recent Audit (Right 40%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
        {/* Left Column: Role-Tailored "Việc Cần Làm Của Tôi" */}
        <Card
          title="Việc Cần Xử Lý Của Tôi (Action Items)"
          subtitle={
            isManager
              ? 'Các hồ sơ điều chuyển và thanh lý đang chờ Trưởng phòng HC-QT phê duyệt'
              : isStaff
              ? 'Các phiếu sự cố thiết bị được giao và cần kiểm tra kỹ thuật'
              : 'Giám sát điều hành toàn diện cơ sở vật chất nhà trường'
          }
          action={
            <Button size="sm" variant="ghost" onClick={fetchDashboardData}>
              Làm Mới
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {actionItems.map(item => (
              <div
                key={item.id}
                onClick={() => onNavigateTab(item.tab)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'border-color var(--duration-fast)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-primary)', marginBottom: '3px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                    {item.subtitle}
                  </div>
                </div>

                <Button size="sm" variant="secondary">
                  Xử Lý
                </Button>
              </div>
            ))}

            {actionItems.length === 0 && (
              <EmptyState
                title="Không có đầu việc tồn đọng"
                message="Tất cả phiếu yêu cầu đã được xử lý và cập nhật vào sổ cái."
                compact
              />
            )}
          </div>
        </Card>

        {/* Right Column: Recent Audit Ledger Feed */}
        <Card title="Nhật Ký Kiểm Toán Gần Đây" subtitle="Ghi nhận bất biến vào chuỗi SHA-256">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentAudits.map(log => (
              <div
                key={log._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)', marginRight: '6px' }}>
                    #{log.seq}
                  </span>
                  <strong style={{ color: 'var(--ink-primary)' }}>{log.action}</strong>
                  <span style={{ color: 'var(--ink-muted)', marginLeft: '6px' }}>({log.target_table})</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>
                  {log.hashed_at ? new Date(log.hashed_at).toLocaleTimeString('vi-VN') : '—'}
                </span>
              </div>
            ))}

            {recentAudits.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '12px 0', fontSize: '12px' }}>
                Chưa có nhật ký
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;