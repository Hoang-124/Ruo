import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isSameUser } from '../../config/navigation';
import { Icons } from '../../components/common/SvgIcons';
import { FloorPlan2D } from '../../components/common/FloorPlan2D';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';
import { equipmentApi, movementApi, repairApi, disposalApi, auditApi, facilityApi } from '../../lib/api';
import { DashboardAnalytics } from './DashboardAnalytics';
import { buildRoomPodIndex, getRoomPod, getPodStatus } from '../../components/common/roomPod';
import { resolveRoomEquipments, resolveRoomStatus, summarizeRoomEquipment } from './roomPanel';
import { Button, Card, KPI, StatusBadge, EmptyState } from '../../components/ui/Primitives';

/**
 * Dashboard - UEMS Operational Command Center
 */
export const Dashboard = ({ onNavigateTab, onSelectEquipmentForReport }) => {
  const { currentUser, currentRoleKey } = useAuth();

  const role = currentUser?.role || currentRoleKey;
  const isAdmin = role === 'admin';
  const isFM = role === 'facility_manager';
  const isTech = role === 'technician';
  const isLecturer = role === 'lecturer';

  const [loading, setLoading] = useState(true);
  const [equipmentsList, setEquipmentsList] = useState([]);

  // 1. Giảng Viên (Lecturer) State
  const [lecturerStats, setLecturerStats] = useState({
    totalTickets: 0,
    repairingTickets: 0,
    pendingFeedbackTickets: 0,
    completedTickets: 0
  });
  const [lecturerTickets, setLecturerTickets] = useState([]);
  const [feedbackTicket, setFeedbackTicket] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // 2. Kỹ Thuật Viên (Technician) State
  const [techStats, setTechStats] = useState({
    assignedTasks: 0,
    inProgressTasks: 0,
    pendingMovements: 0,
    resolvedTasks: 0
  });
  const [techTasks, setTechTasks] = useState([]);
  const [techMovements, setTechMovements] = useState([]);

  // 3. Quản Lý CSVC (Facility Manager) State
  const [fmTickets, setFmTickets] = useState([]);
  const [fmMovs, setFmMovs] = useState([]);

  // 4. Ban Giám Hiệu (Admin) State
  const [adminDisposals, setAdminDisposals] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [auditChainValid, setAuditChainValid] = useState(true);

  // Classroom Floor Plan State
  const [selectedFloor, setSelectedFloor] = useState(1);

  // Live CAD data (GET /facilities/cad-canvas) for the selected floor -> room pods (UC-2.7)
  const [cadRooms, setCadRooms] = useState([]);
  const [cadRefreshKey, setCadRefreshKey] = useState(0);
  const [cadError, setCadError] = useState('');
  const [cadLoading, setCadLoading] = useState(true);
  const roomPods = useMemo(() => buildRoomPodIndex(cadRooms), [cadRooms]);

  // Pre-select first room of selected floor by default
  const [selectedRoom, setSelectedRoom] = useState(() => {
    return CAMPUS_FLOORS[1]?.topRooms?.[0] || null;
  });

  const fetchDashboardData = useCallback(async (isInitialMount = false) => {
    setLoading(true);
    if (isInitialMount !== true) {
      setCadRefreshKey((key) => key + 1);
    }
    try {
      const eqPromise = equipmentApi.list({ limit: 100 }).catch((e) => {
        console.warn('Equipments fetch error:', e.message);
        return null;
      });

      // Role-Isolated Operational Data Fetching in parallel with equipment list
      if (isLecturer) {
        try {
          const [eqRes, repRes] = await Promise.all([
            eqPromise,
            repairApi.list()
          ]);
          const eqList = eqRes?.items || eqRes?.equipments || [];
          setEquipmentsList(eqList);
          const allRepairs = repRes.repairs || repRes.data || [];
          
          const myTix = allRepairs.filter(r => isSameUser(r.reported_by, currentUser));
          // An empty personal history must not fall back to other users' tickets.
          const displayTix = myTix;
          setLecturerTickets(displayTix);

          const repairing = myTix.filter(r => ['reported', 'assigned', 'in_progress'].includes(r.status)).length;
          const pendingFb = myTix.filter(r => ['closed', 'repaired', 'resolved'].includes(r.status) && (!r.feedback_rating || r.feedback_rating === 0));
          const completed = myTix.filter(r => ['closed', 'repaired', 'resolved'].includes(r.status)).length;

          setLecturerStats({
            totalTickets: myTix.length,
            repairingTickets: repairing,
            pendingFeedbackTickets: pendingFb.length,
            completedTickets: completed
          });

          if (pendingFb.length > 0) {
            setFeedbackTicket(pendingFb[0]);
          } else {
            setFeedbackTicket(null);
          }
        } catch (e) {
          console.warn('Lecturer tickets fetch error:', e.message);
        }
      } else if (isTech) {
        try {
          const [eqRes, repRes, movRes] = await Promise.all([
            eqPromise,
            repairApi.list(),
            movementApi.list()
          ]);
          const eqList = eqRes?.items || eqRes?.equipments || [];
          setEquipmentsList(eqList);
          const allRepairs = repRes.repairs || repRes.data || [];
          const allMovs = (movRes.movements || movRes.data || []).filter(movement =>
            ['approved', 'pending'].includes(movement.status) &&
            (!movement.assigned_to || isSameUser(movement.assigned_to, currentUser))
          );

          const assigned = allRepairs.filter(r => isSameUser(r.assigned_to, currentUser));

          setTechTasks(assigned);
          setTechMovements(allMovs);
          setTechStats({
            assignedTasks: assigned.length,
            inProgressTasks: assigned.filter(r => r.status === 'in_progress').length,
            pendingMovements: allMovs.length,
            resolvedTasks: assigned.filter(r => ['closed', 'repaired', 'resolved'].includes(r.status)).length
          });
        } catch (e) {
          console.warn('Tech data fetch error:', e.message);
        }
      } else if (isFM) {
        try {
          const [eqRes, repRes, movRes] = await Promise.all([
            eqPromise,
            repairApi.list(),
            movementApi.list()
          ]);
          const eqList = eqRes?.items || eqRes?.equipments || [];
          setEquipmentsList(eqList);
          const allRepairs = repRes.repairs || repRes.data || [];
          const allMovs = movRes.movements || movRes.data || [];

          setFmTickets(allRepairs.filter(r => r.status === 'reported'));
          setFmMovs(allMovs.slice(0, 5));
        } catch (e) {
          console.warn('FM data fetch error:', e.message);
        }
      } else if (isAdmin) {
        try {
          const [eqRes, dispRes, audRes, chainRes] = await Promise.all([
            eqPromise,
            disposalApi.list(),
            auditApi.getLogs({ limit: 6 }),
            auditApi.verifyChain()
          ]);
          const eqList = eqRes?.items || eqRes?.equipments || [];
          setEquipmentsList(eqList);
          const allDisposals = dispRes.proposals || dispRes.data || [];

          setAdminDisposals(allDisposals.filter(d => d.status === 'proposed'));
          setRecentAudits(audRes.logs || audRes.data || []);
          if (chainRes && chainRes.verification) {
            setAuditChainValid(chainRes.verification.isValid);
          }
        } catch (e) {
          console.warn('Admin data fetch error:', e.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isLecturer, isTech, isFM, isAdmin, currentUser?._id, currentUser?.code, currentUser?.email]);

  const handleQuickRate = async (ticketId) => {
    if (!ticketId) return;
    try {
      setSubmittingRating(true);
      await repairApi.rateFeedback(ticketId, {
        rating: ratingStars,
        comment: ratingComment
      });
      setFeedbackTicket(null);
      await fetchDashboardData();
    } catch (err) {
      console.warn('Rating error:', err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Reload the pods whenever the floor changes or the dashboard is refreshed.
  useEffect(() => {
    let ignore = false;
    setCadLoading(true);
    setCadRooms([]);
    setCadError('');
    facilityApi.getCadCanvas('A1', selectedFloor)
      .then((res) => {
        if (ignore) return;
        setCadRooms(res.rooms || []);
        setCadError('');
      })
      .catch((e) => {
        console.warn('CAD canvas fetch error:', e.message);
        if (ignore) return;
        setCadRooms([]);
        setCadError(e.message || 'Không tải được dữ liệu thiết bị trực tiếp.');
      })
      .finally(() => { if (!ignore) setCadLoading(false); });
    return () => { ignore = true; };
  }, [selectedFloor, cadRefreshKey]);

  // Synchronize default selected room when switching floors
  const handleFloorChange = (floorNum) => {
    setSelectedFloor(floorNum);
    const floorRooms = CAMPUS_FLOORS[floorNum]?.topRooms || [];
    if (floorRooms.length > 0) {
      setSelectedRoom(floorRooms[0]);
    }
  };

  const getRoomSimulatedStatus = useCallback((room) => {
    const pod = getRoomPod(roomPods, room?.code);
    const status = pod?.effectiveStatus || 'unknown';
    const meta = getPodStatus(status);
    return { status, ...meta, bg: 'transparent', border: meta.color };
  }, [roomPods]);

  // Live room (database) wins over the equipment list and the architectural sample data
  const selectedPod = selectedRoom ? getRoomPod(roomPods, selectedRoom.code) : undefined;
  const selectedRoomInfo = selectedPod || selectedRoom;
  const roomEquipmentView = useMemo(
    () => resolveRoomEquipments(selectedRoom, selectedPod, equipmentsList),
    [selectedRoom, selectedPod, equipmentsList]
  );
  const roomEquipments = roomEquipmentView.items;
  const roomStatusView = resolveRoomStatus(selectedRoom, selectedPod);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ==============================================================
          1. TOP WELCOME & ROLE BAR (COMPACT COMMAND HEADER)
          ============================================================== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 18px',
        background: 'linear-gradient(125deg, var(--surface-card) 0%, rgba(234, 88, 12, 0.07) 100%)',
        border: '1px solid var(--border-default)',
        borderLeft: '4px solid var(--blueprint-500)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#EA580C',
              boxShadow: '0 0 8px rgba(234, 88, 12, 0.7)'
            }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--blueprint-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              TRUNG TÂM ĐIỀU HÀNH SỐ • DIGITAL TWIN
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
            Trung Tâm Vận Hành Cơ Sở Vật Chất (UEMS Operational Command)
          </h1>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
            Chào mừng <strong style={{ color: 'var(--ink-primary)' }}>{currentUser?.name}</strong> • Vai trò: <span style={{ color: 'var(--blueprint-400)', fontWeight: 700 }}>{currentUser?.roleTitle}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLecturer ? (
            <>
              <Button size="sm" variant="secondary" icon={Icons.ClipboardCheck} onClick={() => onNavigateTab('my_tickets')}>
                Phiếu Báo Hỏng ({lecturerStats.totalTickets})
              </Button>
              <Button size="sm" variant="primary" icon={Icons.AlertTriangle} onClick={() => onNavigateTab('report_issue')}>
                + Báo Hỏng Thiết Bị
              </Button>
            </>
          ) : isTech ? (
            <>
              <Button size="sm" variant="secondary" icon={Icons.Wrench} onClick={() => onNavigateTab('assigned_tasks')}>
                Nhiệm Vụ
              </Button>
              <Button size="sm" variant="secondary" icon={Icons.QrCode} onClick={() => onNavigateTab('qr_scanner')}>
                Quét Mã QR
              </Button>
            </>
          ) : isFM ? (
            <>
              <Button size="sm" variant="secondary" icon={Icons.Layers} onClick={() => onNavigateTab('tickets_kanban')}>
                Kanban SLA
              </Button>
              <Button size="sm" variant="secondary" icon={Icons.Equipment} onClick={() => onNavigateTab('equipments')}>
                Kho CSVC
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" icon={Icons.User} onClick={() => onNavigateTab('users')}>
                Người Dùng
              </Button>
              <Button size="sm" variant="secondary" icon={Icons.Shield} onClick={() => onNavigateTab('rbac')}>
                Phân Quyền RBAC
              </Button>
            </>
          )}
          <Button size="sm" variant="primary" icon={Icons.Clock} loading={loading} onClick={fetchDashboardData}>
            Cập Nhật
          </Button>
        </div>
      </div>

      {/* ==============================================================
          2. PRIMARY HERO: UNIFIED DIGITAL TWIN CAD WORKSPACE
          Hợp nhất Sơ đồ phòng học và Bản đồ CAD vào không gian duy nhất
          ============================================================== */}
      <div className="dashboard-cad-grid">
        {/* Left Column: Interactive Architectural Map */}
        <Card
          className="ruo-card-compact"
          title="Sơ Đồ Phòng Học"
          subtitle={`Sơ đồ kiến trúc tầng ${selectedFloor} • Bấm chọn từng phòng học để xem trang thiết bị & trạng thái vận hành`}
        >
          <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
            <FloorPlan2D
              selectedFloor={selectedFloor}
              onChangeFloor={handleFloorChange}
              selectedRoom={selectedRoom}
              onSelectRoom={(room) => setSelectedRoom(room)}
              getRoomSimulatedStatus={getRoomSimulatedStatus}
              roomPods={roomPods}
            />
          </div>
        </Card>

        {/* Right Column: Room Detail & Equipment Inspector Panel */}
        <Card
          className="ruo-card-compact"
          title={selectedRoomInfo?.name || 'Thông Tin Phòng Học'}
          subtitle={selectedRoom ? `Tầng ${selectedFloor} • ${ROOM_CATEGORIES[selectedRoom.category]?.name || 'Phòng học'}` : "Chọn một phòng trên sơ đồ bên trái"}
          action={
            selectedRoom && (
              <span style={{ fontSize: '11px', color: 'var(--blueprint-400)', fontFamily: 'var(--font-mono)' }}>
                TẦNG {selectedFloor} • {selectedRoom.code?.replace(/^A1-/, '')}
              </span>
            )
          }
        >
          {selectedRoom ? (
            <div key={selectedRoom.code || selectedRoom.id} className="ruo-view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    {{ lecture: 'Phòng học', lab: 'Phòng thực hành', office: 'Văn phòng', warehouse: 'Kho' }[selectedPod?.room_type] || ROOM_CATEGORIES[selectedRoom.category]?.name || 'Chưa rõ'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Trạng thái:</span>
                  <span style={{ color: roomStatusView.color, fontWeight: 700 }}>
                    ● {roomStatusView.label}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Sức chứa:</span>
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {selectedRoomInfo.capacity != null ? `${selectedRoomInfo.capacity} chỗ` : 'Chưa rõ'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Diện tích sàn:</span>
                  <strong style={{ color: 'var(--ink-primary)' }}>
                    {selectedRoomInfo.area ?? 'Chưa rõ'} m²
                  </strong>
                </div>
              </div>

              {/* Quick Operational Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {isLecturer ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Icons.AlertTriangle}
                      onClick={() => {
                        if (onSelectEquipmentForReport) onSelectEquipmentForReport(null, selectedRoom);
                        onNavigateTab('report_issue');
                      }}
                    >
                      Báo Hỏng Tại Phòng Này
                    </Button>
                  </>
                ) : isTech ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Icons.Wrench}
                      onClick={() => onNavigateTab('assigned_tasks')}
                    >
                      Nhiệm Vụ Kỹ Thuật
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Icons.QrCode}
                      onClick={() => onNavigateTab('qr_scanner')}
                    >
                      Quét QR Tại Chỗ
                    </Button>
                  </>
                ) : isFM ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Icons.Wrench}
                      onClick={() => onNavigateTab('tickets_kanban')}
                    >
                      Tạo Phiếu Sửa Chữa
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Icons.Repeat}
                      onClick={() => onNavigateTab('movements')}
                    >
                      Điều Chuyển Đến
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Icons.CheckCircle}
                      onClick={() => onNavigateTab('disposal_approval')}
                    >
                      Duyệt Thanh Lý
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Icons.Equipment}
                      onClick={() => onNavigateTab('equipments')}
                    >
                      Kho Quản Lý TB
                    </Button>
                  </>
                )}
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

                {roomEquipmentView.source === 'live' && (
                  <div id="room-equipment-summary" style={{ marginBottom: '8px', fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                    {summarizeRoomEquipment(roomEquipments)} • dữ liệu trực tiếp
                  </div>
                )}
                {cadError && <p role="alert">Không tải được dữ liệu phòng: {cadError}</p>}

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

                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <StatusBadge status={eq.status} />
                        {isLecturer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectEquipmentForReport) onSelectEquipmentForReport(eq, selectedRoom);
                              onNavigateTab('report_issue');
                            }}
                            className="ruo-btn ruo-btn-compact"
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title={`Báo hỏng thiết bị ${eq.code}`}
                          >
                            Báo Hỏng
                          </button>
                        )}
                        {isTech && (eq.status === 'repairing' || eq.status === 'broken') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateTab('assigned_tasks');
                            }}
                            className="ruo-btn ruo-btn-compact"
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(14, 165, 233, 0.12)',
                              color: '#0EA5E9',
                              border: '1px solid rgba(14, 165, 233, 0.3)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Xử lý nhiệm vụ sửa chữa"
                          >
                            Xử Lý
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {roomEquipments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: 'var(--ink-muted)' }}>
                      {cadLoading ? 'Đang tải thiết bị…' : selectedPod ? 'Chưa có thiết bị đăng ký tại phòng này.' : 'Chưa có dữ liệu thiết bị cho phòng trên bản vẽ.'}
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
          3. ROLE-TAILORED KPI METRICS ROW
          Hiển thị chỉ số chuyên biệt và phù hợp 100% với từng Actor
          ============================================================== */}
      {(isLecturer || isTech) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {isLecturer ? (
            <>
              <KPI
                label="Phòng Học Đang Xem"
                value={selectedRoom ? (selectedRoom.name || `Phòng ${selectedRoom.code?.replace(/^A1-/, '')}`) : 'Chưa Chọn'}
                subtext={`Tầng ${selectedFloor} • ${selectedRoom ? ROOM_CATEGORIES[selectedRoom.category]?.name || 'Giảng đường' : 'Chọn trên sơ đồ'}`}
                icon={Icons.Room}
                color="#10B981"
              />
              <KPI
                label="Phiếu Báo Hỏng Của Tôi"
                value={lecturerStats.totalTickets}
                subtext="Tổng số sự cố thầy/cô đã gửi"
                icon={Icons.AlertTriangle}
                color="#F59E0B"
                onClick={() => onNavigateTab('my_tickets')}
              />
              <KPI
                label="Đang Khắc Phục"
                value={lecturerStats.repairingTickets}
                subtext="Kỹ thuật viên đang xử lý thực địa"
                icon={Icons.Wrench}
                color="#0EA5E9"
                onClick={() => onNavigateTab('my_tickets')}
              />
              <KPI
                label="Chờ Đánh Giá Dịch Vụ"
                value={lecturerStats.pendingFeedbackTickets}
                subtext="Đã sửa xong, mời thầy/cô chấm điểm"
                icon={Icons.Star}
                color="#8B5CF6"
                onClick={() => onNavigateTab('my_tickets')}
              />
            </>
          ) : (
            <>
              <KPI
                label="Nhiệm Vụ Được Giao"
                value={techStats.assignedTasks}
                subtext="Phiếu phân công cần tiếp nhận"
                icon={Icons.ClipboardCheck}
                color="#0EA5E9"
                onClick={() => onNavigateTab('assigned_tasks')}
              />
              <KPI
                label="Đang Sửa Chữa Thực Địa"
                value={techStats.inProgressTasks}
                subtext="Đang khắc phục tại phòng học"
                icon={Icons.Wrench}
                color="#F59E0B"
                onClick={() => onNavigateTab('assigned_tasks')}
              />
              <KPI
                label="Lệnh Điều Động / Thay Thế"
                value={techStats.pendingMovements}
                subtext="Vận chuyển thiết bị từ kho đến phòng"
                icon={Icons.Repeat}
                color="#10B981"
                onClick={() => onNavigateTab('movement_tasks')}
              />
              <KPI
                label="Nhiệm Vụ Đã Xong"
                value={techStats.resolvedTasks}
                subtext="Sự cố đã khắc phục thành công"
                icon={Icons.CheckCircle}
                color="#8B5CF6"
                onClick={() => onNavigateTab('assigned_tasks')}
              />
            </>
          )}
        </div>
      )}
      {(isAdmin || isFM) && <DashboardAnalytics refreshKey={cadRefreshKey} />}

      {/* ==============================================================
          4. LOWER GRID: ROLE-TAILORED OPERATIONAL PANELS
          Tuyệt đối cách ly: Giảng viên xem phiếu báo hỏng & chấm điểm;
          KTV xem việc sửa & di chuyển; FM xem Kanban; Admin xem Kiểm toán & Duyệt TL
          ============================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
        {isLecturer ? (
          <>
            {/* Left: My Incident Reports */}
            <Card
              title="Phiếu Báo Hỏng Của Tôi & Tiến Độ Xử Lý"
              subtitle="Theo dõi tiến độ khắc phục sự cố tại các phòng học do thầy/cô đã gửi"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  icon={Icons.AlertTriangle}
                  onClick={() => onNavigateTab('report_issue')}
                  style={{ fontSize: '11.5px' }}
                >
                  + Báo Hỏng Mới
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lecturerTickets.map(ticket => (
                  <div
                    key={ticket._id}
                    onClick={() => onNavigateTab('my_tickets')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: 'var(--blueprint-400)' }}>
                          #{ticket.ticket_code || 'TICKET'}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                          {ticket.equipment_id?.name || 'Thiết bị'} ({ticket.room_id?.code || 'Phòng học'})
                        </strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                        {ticket.incident_description || 'Báo hỏng sự cố thiết bị giảng đường'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <StatusBadge status={ticket.status} />
                      <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </span>
                    </div>
                  </div>
                ))}

                {lecturerTickets.length === 0 && (
                  <EmptyState
                    title="Thầy/cô chưa có sự cố nào đang báo hỏng"
                    message="Tất cả thiết bị tại các phòng học đều đang hoạt động tốt. Nhấp vào bất kỳ phòng nào trên sơ đồ phía trên để báo hỏng thiết bị khi gặp sự cố."
                    compact
                  />
                )}
              </div>
            </Card>

            {/* Right: Service Quality Rating & Campus Emergency Support */}
            <Card
              title="Đánh Giá Nghiệm Thu & Trực Kỹ Thuật"
              subtitle="Chấm điểm dịch vụ sau sửa chữa và thông tin hotline hỗ trợ giảng đường"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('my_tickets')}
                >
                  Xem Tất Cả →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbackTicket ? (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-primary)' }}>
                        Chấm điểm phiếu #{feedbackTicket.ticket_code}
                      </span>
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                        Đã sửa xong
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-secondary)' }}>
                      Thiết bị <strong>{feedbackTicket.equipment_id?.name || 'tại phòng'}</strong> đã được khắc phục xong. Mời thầy/cô chấm điểm chất lượng:
                    </p>

                    {/* 5-Star Rating Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: star <= ratingStars ? '#F59E0B' : 'var(--border-default)'
                          }}
                        >
                          <Icons.Star size={22} fill={star <= ratingStars ? '#F59E0B' : 'none'} />
                        </button>
                      ))}
                      <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '6px', color: '#F59E0B' }}>
                        {ratingStars === 5 ? '5/5 - Rất hài lòng' : ratingStars === 4 ? '4/5 - Hài lòng' : `${ratingStars}/5`}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Ý kiến đóng góp (tùy chọn)..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="ruo-portal-input"
                      style={{ width: '100%', fontSize: '12px', height: '32px' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={submittingRating}
                        onClick={() => handleQuickRate(feedbackTicket._id)}
                      >
                        Gửi Đánh Giá
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Technical Hotline Box */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--blueprint-400)', fontWeight: 800, fontSize: '13px' }}>
                    <Icons.Phone size={15} />
                    <span>Hotline Trực Kỹ Thuật Giảng Đường</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Đội phản ứng nhanh:</span>
                    <strong style={{ color: '#2FB37A' }}>024.3768.6699 (Máy lẻ 102)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phòng trực thực địa:</span>
                    <span>Phòng 102 • Tầng 1</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Thời gian trực:</span>
                    <span>06:45 - 21:15 (Tất cả ca giảng dạy)</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                    ⚡ <strong>Cam kết SLA:</strong> Kỹ thuật viên có mặt xử lý máy chiếu / âm thanh phòng học trong vòng <strong>15 phút</strong>.
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : isTech ? (
          <>
            {/* Left: Assigned Tasks */}
            <Card
              title="Nhiệm Vụ Sửa Chữa Phân Công Cho Tôi"
              subtitle="Danh sách sự cố cần khắc phục thực địa kèm hạn mức thời gian SLA"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('assigned_tasks')}
                >
                  Xem Tất Cả →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {techTasks.map(task => (
                  <div
                    key={task._id}
                    onClick={() => onNavigateTab('assigned_tasks')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: 'var(--blueprint-400)' }}>
                          #{task.ticket_code}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                          {task.equipment_id?.name || 'Thiết bị'} ({task.room_id?.code || 'Phòng'})
                        </strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                        {task.incident_description}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Button size="sm" variant="secondary">
                        Xử Lý
                      </Button>
                    </div>
                  </div>
                ))}

                {techTasks.length === 0 && (
                  <EmptyState
                    title="Không có nhiệm vụ sửa chữa tồn đọng"
                    message="Tất cả sự cố đã được kỹ thuật viên xử lý và bàn giao thành công."
                    compact
                  />
                )}
              </div>
            </Card>

            {/* Right: Field Movement Orders */}
            <Card
              title="Lệnh Điều Động & Thay Thế Thiết Bị Thực Địa"
              subtitle="Vận chuyển thiết bị dự phòng từ Kho KHO-01 đến phòng học thay thế đồ hỏng"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('movement_tasks')}
                >
                  Lệnh Điều Động →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {techMovements.map(mov => (
                  <div
                    key={mov._id}
                    onClick={() => onNavigateTab('movement_tasks')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink-primary)' }}>
                        {mov.equipment_id?.code} — {mov.equipment_id?.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        Từ: <strong>{mov.from_room_id?.code || 'Kho'}</strong> → Đến: <strong style={{ color: 'var(--laser-cyan)' }}>{mov.to_room_id?.code || 'Phòng'}</strong>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary">
                      Xác Nhận
                    </Button>
                  </div>
                ))}

                {techMovements.length === 0 && (
                  <EmptyState
                    title="Không có lệnh điều động chờ"
                    message="Hiện không có thiết bị dự phòng nào đang chờ vận chuyển đến phòng học."
                    compact
                  />
                )}
              </div>
            </Card>
          </>
        ) : isFM ? (
          <>
            {/* Left: FM Kanban Dispatch */}
            <Card
              title="Điều Phối Sự Cố & Phân Công Kỹ Thuật (SLA Kanban)"
              subtitle="Phiếu sự cố mới cần gán kỹ thuật viên hoặc điều phối xử lý"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('tickets_kanban')}
                >
                  Mở Kanban →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fmTickets.map(ticket => (
                  <div
                    key={ticket._id}
                    onClick={() => onNavigateTab('tickets_kanban')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 800, color: 'var(--blueprint-400)' }}>
                          #{ticket.ticket_code}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                          {ticket.equipment_id?.name} ({ticket.room_id?.code || 'Phòng'})
                        </strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                        {ticket.incident_description}
                      </div>
                    </div>

                    <Button size="sm" variant="primary">
                      Giao Việc
                    </Button>
                  </div>
                ))}

                {fmTickets.length === 0 && (
                  <EmptyState
                    title="Không có sự cố chờ phân công"
                    message="Tất cả các phiếu báo hỏng đã được giao cho kỹ thuật viên."
                    compact
                  />
                )}
              </div>
            </Card>

            {/* Right: FM Warehouse & Shortage */}
            <Card
              title="Kho Dự Phòng KHO-01 & Cảnh Báo Định Mức"
              subtitle="Theo dõi lượng đồ dự phòng sẵn sàng thay thế theo định mức phòng học"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('warehouse')}
                >
                  Xem Kho KHO-01 →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fmMovs.map(mov => (
                  <div
                    key={mov._id}
                    onClick={() => onNavigateTab('movements')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink-primary)' }}>
                        Điều chuyển: {mov.equipment_id?.code}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {mov.from_room_id?.code || 'Kho'} → {mov.to_room_id?.code || 'Phòng'}
                      </div>
                    </div>
                    <StatusBadge status={mov.status} />
                  </div>
                ))}

                {fmMovs.length === 0 && (
                  <EmptyState
                    title="Kho KHO-01 ổn định"
                    message="Định mức thiết bị dự phòng tại các phòng học được đảm bảo đầy đủ."
                    compact
                  />
                )}
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Left: Admin Disposals */}
            <Card
              title="Hồ Sơ Đề Xuất Thanh Lý Chờ Ban Giám Hiệu Phê Duyệt"
              subtitle="Hồ sơ tài sản hao mòn R ≥ 60% do Cán bộ CSVC đệ trình (Quyết định TL)"
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ fontSize: '11px', color: 'var(--blueprint-400)' }}
                  onClick={() => onNavigateTab('disposal_approval')}
                >
                  Phê Duyệt Hồ Sơ →
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminDisposals.map(disp => (
                  <div
                    key={disp._id}
                    onClick={() => onNavigateTab('disposal_approval')}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-primary)' }}>
                        {disp.equipment_id?.code} — {disp.equipment_id?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                        Lý do: {disp.reason || 'Thiết bị xuống cấp'} • Thu hồi: {(disp.recovery_value || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <Button size="sm" variant="primary">
                      Xem & Duyệt
                    </Button>
                  </div>
                ))}

                {adminDisposals.length === 0 && (
                  <EmptyState
                    title="Không có hồ sơ chờ duyệt"
                    message="Hiện không có hồ sơ thanh lý nào đang chờ Ban Giám Hiệu ký quyết định."
                    compact
                  />
                )}
              </div>
            </Card>

            {/* Right: Admin SHA-256 Audit Trail (Admin ONLY) */}
            <Card
              title="Sổ Cái Nhật Ký Kiểm Toán SHA-256 Bất Biến"
              subtitle="Truy vết mã hóa không thể can thiệp mọi hành động trên hệ thống"
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
              {/* Subtle Inline SHA-256 Integrity Badge */}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
