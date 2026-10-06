import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/common/SvgIcons';
import { FloorPlan2D } from '../../components/common/FloorPlan2D';
import { Building2DIso } from '../../components/common/Building2DIso';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';
import { equipmentApi, transferApi, repairApi, disposalApi, auditApi } from '../../lib/api';
import { Button, Card, KPI, StatusBadge, EmptyState } from '../../components/ui/Primitives';

/**
 * Dashboard - UEMS Operational Command Center
 * 
 * Optimized Hierarchy:
 * 1. Top Bar: Greeting, Role, Quick Actions
 * 2. PRIMARY FOCUS (Top of Page):
 *    - Left (~62%): Sơ Đồ Mặt Bằng Phòng Học 2D / 2.5D (FloorPlan2D) với bộ chọn Tầng 1..5
 *    - Right (~38%): Bảng Thông Tin Chi Tiết Phòng & Danh Sách Thiết Bị Tại Phòng
 * 3. KPI Overview Row: 4 Metric Cards (Placed below workspace)
 * 4. Lower Grid:
 *    - Left (~60%): Việc Cần Xử Lý Của Tôi (Action Items)
 *    - Right (~40%): Nhật Ký Kiểm Toán Gần Đây (với huy hiệu kiểm toán SHA-256 tích hợp)
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
  const [equipmentsList, setEquipmentsList] = useState([]);

  // Digital Twin Floor Plan State
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [floorPlanView, setFloorPlanView] = useState('plan'); // 'plan' | 'iso'

  // Pre-select first room of selected floor by default
  const [selectedRoom, setSelectedRoom] = useState(() => {
    return CAMPUS_FLOORS[1]?.topRooms?.[0] || null;
  });

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
      setEquipmentsList(equipments);

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

  // Synchronize default selected room when switching floors
  const handleFloorChange = (floorNum) => {
    setSelectedFloor(floorNum);
    const floorRooms = CAMPUS_FLOORS[floorNum]?.topRooms || [];
    if (floorRooms.length > 0) {
      setSelectedRoom(floorRooms[0]);
    }
  };

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

  // Compute matched equipments for selected room
  const roomEquipments = useMemo(() => {
    if (!selectedRoom) return [];

    const realMatches = equipmentsList.filter(e => {
      const roomCode = e.room_id?.code || e.room_code || '';
      return roomCode.toLowerCase().includes(selectedRoom.code?.toLowerCase()) ||
             selectedRoom.name?.toLowerCase().includes(e.room_id?.name?.toLowerCase() || '___');
    });

    if (realMatches.length > 0) return realMatches;

    // Architectural mock equipment fallback from CAMPUS_FLOORS
    return (selectedRoom.equipments || []).map((name, idx) => ({
      _id: `room-eq-${idx}`,
      code: `${selectedRoom.code}-EQ-${101 + idx}`,
      name,
      status: idx === 1 && selectedRoom.statusOverride === 'maintenance' ? 'repairing' : 'active',
      rRatio: idx === 1 && selectedRoom.statusOverride === 'maintenance' ? 62 : 12 + idx * 8
    }));
  }, [selectedRoom, equipmentsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ==============================================================
          1. TOP WELCOME & ROLE BAR (COMPACT COMMAND HEADER)
          ============================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18.5px', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.01em' }}>
            Trung Tâm Vận Hành Cơ Sở Vật Chất (UEMS Operational Command)
          </h1>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Chào mừng <strong>{currentUser?.name}</strong> • Vai trò: <span style={{ color: 'var(--blueprint-400)', fontWeight: 700 }}>{currentUser?.roleTitle}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button size="sm" variant="secondary" icon={Icons.Equipment} onClick={() => onNavigateTab('equipments')}>
            Kho Thiết Bị
          </Button>
          <Button size="sm" variant="secondary" icon={Icons.Building} onClick={() => onNavigateTab('map')}>
            Bản Đồ CAD
          </Button>
          <Button size="sm" variant="primary" icon={Icons.Clock} onClick={fetchDashboardData}>
            Cập Nhật
          </Button>
        </div>
      </div>

      {/* ==============================================================
          2. PRIMARY HERO: DIGITAL TWIN WORKSPACE (SPLIT 62% MAP : 38% ROOM INFO)
          Đặt ngay tại vị trí cao nhất theo yêu cầu tối ưu UX
          ============================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.62fr) minmax(320px, 1fr)',
          gap: '12px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Interactive Architectural Map */}
        <Card
          className="ruo-card-compact"
          title="Mặt Bằng Tòa A1 (Digital Twin CAD)"
          subtitle={`Sơ đồ kiến trúc tầng ${selectedFloor} • Phân bổ phòng học & hành lang`}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* 2D / 2.5D View Toggle */}
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
                  Khối 2.5D
                </button>
              </div>

              <Button size="sm" variant="ghost" onClick={() => onNavigateTab('map')} style={{ fontSize: '11.5px', color: 'var(--blueprint-400)' }}>
                Mở Rộng CAD →
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Visual CAD Canvas */}
            {floorPlanView === 'plan' ? (
              <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
                <FloorPlan2D
                  selectedFloor={selectedFloor}
                  onChangeFloor={handleFloorChange}
                  selectedRoom={selectedRoom}
                  onSelectRoom={(room) => setSelectedRoom(room)}
                  getRoomSimulatedStatus={getRoomSimulatedStatus}
                  currentTimeString="11:15"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', background: 'var(--surface-base)', borderRadius: '8px' }}>
                <Building2DIso
                  activeFloor={selectedFloor}
                  onSelectFloor={handleFloorChange}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Room Detail & Equipment Inspector Panel */}
        <Card
          className="ruo-card-compact"
          title={selectedRoom ? `Phòng ${selectedRoom.code}` : "Thông Tin Phòng Học"}
          subtitle={selectedRoom ? `${selectedRoom.name} • Tầng ${selectedFloor}` : "Chọn một phòng trên sơ đồ bên trái"}
          action={
            selectedRoom && (
              <Button size="sm" variant="ghost" onClick={() => onNavigateTab('map')} style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}>
                Xem Vị Trí CAD →
              </Button>
            )
          }
        >
          {selectedRoom ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Room Top Specs Grid */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Phân loại:</span>
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {ROOM_CATEGORIES[selectedRoom.category]?.name || 'Học tập'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Trạng thái:</span>
                  <span style={{ color: selectedRoom.statusOverride === 'maintenance' ? '#E5A33B' : '#2FB37A', fontWeight: 700 }}>
                    ● {selectedRoom.statusOverride === 'maintenance' ? 'Đang bảo trì' : 'Vận hành tốt'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Sức chứa:</span>
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {selectedRoom.capacity ? `${selectedRoom.capacity} chỗ` : 'Không cố định'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Diện tích sàn:</span>
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {selectedRoom.area || 60} m²
                  </strong>
                </div>
              </div>

              {/* Quick Operational Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Icons.Wrench}
                  onClick={() => onNavigateTab('tickets_kanban')}
                >
                  Báo Hỏng Tại Phòng
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Icons.Repeat}
                  onClick={() => onNavigateTab('transfers')}
                >
                  Điều Chuyển Đến
                </Button>
              </div>

              {/* Equipment Inventory in This Room */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Thiết Bị Tại Phòng ({roomEquipments.length})
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--blueprint-400)', fontFamily: 'var(--font-mono)' }}>
                    TẦNG {selectedFloor}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '230px', overflowY: 'auto', paddingRight: '4px' }}>
                  {roomEquipments.map((eq, idx) => (
                    <div
                      key={eq._id || idx}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '8px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ minWidth: 0, paddingRight: '8px' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: 'var(--blueprint-400)' }}>
                          {eq.code}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {eq.name}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <StatusBadge status={eq.status} />
                        <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          R: {eq.rRatio || 0}%
                        </div>
                      </div>
                    </div>
                  ))}

                  {roomEquipments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Chưa có thiết bị đăng ký tại phòng này.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: 'var(--blueprint-400)' }}>
                <Icons.Building size={22} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '4px' }}>
                Chưa Chọn Phòng Học
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.5, maxWidth: '240px', margin: '0 auto' }}>
                Nhấp vào bất kỳ phòng nào trên sơ đồ mặt bằng bên trái để xem thông tin chi tiết và danh sách thiết bị.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ==============================================================
          3. KPI OVERVIEW ROW (ĐƯA XUỐNG DƯỚI KHÔNG GIAN SƠ ĐỒ)
          ============================================================== */}
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

      {/* ==============================================================
          4. LOWER GRID: MY ACTION ITEMS (LEFT 60%) + RECENT AUDIT (RIGHT 40%)
          Tích hợp huy hiệu kiểm toán SHA-256 vào thẻ Nhật Ký Kiểm Toán
          ============================================================== */}
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

        {/* Right Column: Recent Audit Ledger Feed With Embedded SHA-256 Chain Badge */}
        <Card
          title="Nhật Ký Kiểm Toán Gần Đây"
          subtitle="Ghi nhận bất biến vào chuỗi SHA-256"
          action={
            <Button
              size="sm"
              variant="ghost"
              style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
              onClick={() => onNavigateTab('audit_log')}
            >
              Mở Sổ Cái →
            </Button>
          }
        >
          {/* Subtle Inline SHA-256 Integrity Badge (Moved from top banner to here) */}
          <div
            style={{
              background: auditChainValid ? 'rgba(47, 179, 122, 0.08)' : 'rgba(229, 72, 77, 0.12)',
              border: `1px solid ${auditChainValid ? 'rgba(47, 179, 122, 0.25)' : 'rgba(229, 72, 77, 0.35)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: auditChainValid ? '#2FB37A' : '#E5484D' }} />
              <span style={{ color: 'var(--ink-primary)' }}>
                Chuỗi SHA-256: <strong style={{ color: auditChainValid ? '#2FB37A' : '#E5484D' }}>{auditChainValid ? 'HỢP LỆ & NGUYÊN VẸN' : 'PHÁT HIỆN CAN THIỆP'}</strong>
              </span>
            </div>
            <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
              TAMPER-EVIDENT
            </span>
          </div>

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