import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/common/SvgIcons';
import { equipmentApi, transferApi, repairApi, disposalApi, auditApi } from '../../lib/api';
import { Button, Card, KPI, StatusBadge, Drawer, EmptyState } from '../../components/ui/Primitives';

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
          {/* Quick Action Dock */}
          <Button variant="secondary" icon={Icons.Equipment} onClick={() => onNavigateTab('equipments')}>
            Kho Thiết Bị
          </Button>
          <Button variant="secondary" icon={Icons.Building} onClick={() => onNavigateTab('map')}>
            Bản Đồ CAD
          </Button>
          <Button variant="primary" icon={Icons.RefreshCw || Icons.Clock} onClick={fetchDashboardData}>
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
          icon={Icons.DollarSign || Icons.Card}
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

      {/* Main Grid: My Action Items (Left 60%) + Mini CAD & Audit (Right 40%) */}
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

        {/* Right Column: Mini Campus Map & Recent Audit Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mini CAD Map Widget */}
          <Card
            title="Mặt Bằng Tòa Nhà A1 (Khuôn Viên)"
            subtitle="Giảng đường thông minh & Phòng thực hành mạng"
            action={
              <Button size="sm" variant="primary" onClick={() => onNavigateTab('map')}>
                Xem CAD
              </Button>
            }
          >
            <div
              onClick={() => onNavigateTab('map')}
              style={{
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                border: '1px dashed var(--border-default)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {['A1-101 (P.Học)', 'A1-201 (Hội Thảo)', 'A1-301 (P.Lab)', 'A1-401 (Lý Thuyết)', 'A1-501 (Kho CSVC)', 'A1-Canteen'].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--surface-3)',
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--ink-secondary)'
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--blueprint-400)', fontWeight: 600 }}>
                Nhấn để mở bản đồ số 2.5D mặt bằng 5 tầng →
              </span>
            </div>
          </Card>

          {/* Recent Audit Ledger Feed */}
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
    </div>
  );
};

export default Dashboard;