import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { equipmentApi, disposalApi, facilityApi } from '../../lib/api';
import { Button, Card, DataTable, StatusBadge, Drawer, EmptyState } from '../../components/ui/Primitives';

export const EquipmentDisposalPage = ({ initialTab = 'inventory' }) => {
  const { currentRoleKey } = useAuth();
  const { toast } = useToast();

  const isStaff = currentRoleKey === 'staff';
  const isManager = currentRoleKey === 'manager';
  const isAdmin = currentRoleKey === 'admin';
  const isManagerOrAdmin = ['manager', 'admin'].includes(currentRoleKey);
  const isStaffOrAdmin = ['staff', 'admin'].includes(currentRoleKey);

  const [activeSection, setActiveSection] = useState(initialTab); // 'inventory' | 'disposal'
  const [equipments, setEquipments] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [flaggedCandidates, setFlaggedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer
  const [selectedEq, setSelectedEq] = useState(null);

  // Proposal Modal State
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeData, setProposeData] = useState({
    equipment_id: '',
    reason: 'Chi phí sửa chữa tích lũy vượt 60% giá trị còn lại (R >= 60%)',
    recovery_value: 0
  });

  // Decision Modal State for Admin BGH
  const [showBghModal, setShowBghModal] = useState(false);
  const [selectedDisposalId, setSelectedDisposalId] = useState(null);
  const [decisionNumber, setDecisionNumber] = useState('QD-TL-2026/01');

  // Procurement Modal State for Manager
  const [showProcureModal, setShowProcureModal] = useState(false);
  const [procurementPlan, setProcurementPlan] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqRes, dispRes] = await Promise.all([
        equipmentApi.list({ limit: 100 }),
        disposalApi.list()
      ]);

      if (eqRes.success) {
        setEquipments(eqRes.items || eqRes.equipments || []);
      }
      if (dispRes.success) {
        setDisposals(dispRes.proposals || []);
        setFlaggedCandidates(dispRes.candidates || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu thiết bị: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for RACI 5 Steps
  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await disposalApi.propose({
        equipment_id: proposeData.equipment_id,
        reason: proposeData.reason,
        recovery_value: Number(proposeData.recovery_value) || 0
      });
      if (res.success) {
        toast.success('Đã lập đề xuất thanh lý tài sản. Chuyển Quản lý HC duyệt bước 2!');
        setShowProposeModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi lập đề xuất thanh lý: ' + err.message);
    }
  };

  const handleHcApprove = async (id) => {
    try {
      const res = await disposalApi.hcApprove(id);
      if (res.success) {
        toast.success('Phòng HC đã phê duyệt hồ sơ. Chuyển tiếp lên Ban Giám Hiệu!');
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi phê duyệt cấp phòng HC: ' + err.message);
    }
  };

  const handleBghApproveSubmit = async () => {
    if (!decisionNumber.trim()) {
      toast.error('Vui lòng nhập số quyết định thanh lý của BGH.');
      return;
    }
    try {
      const res = await disposalApi.bghApprove(selectedDisposalId, decisionNumber.trim());
      if (res.success) {
        toast.success('Ban Giám Hiệu đã ban hành quyết định thanh lý tài sản!');
        setShowBghModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi phê duyệt cấp BGH: ' + err.message);
    }
  };

  const handleProcureSubmit = async () => {
    if (!procurementPlan.trim()) {
      toast.error('Vui lòng nhập kế hoạch mua sắm tài sản thay thế.');
      return;
    }
    try {
      const res = await disposalApi.procure(selectedDisposalId, procurementPlan.trim());
      if (res.success) {
        toast.success('Đã cập nhật dự toán mua sắm tài sản mới!');
        setShowProcureModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật dự trù mua sắm: ' + err.message);
    }
  };

  const handleReceipt = async (id) => {
    try {
      const res = await disposalApi.receipt(id, null);
      if (res.success) {
        toast.success('Hoàn tất quy trình thanh lý RACI 5 bước và nhập kho tài sản mới!');
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi tiếp nhận tài sản mới: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Nhập lý do từ chối hồ sơ thanh lý:');
    if (!reason) return;
    try {
      const res = await disposalApi.reject(id, reason);
      if (res.success) {
        toast.warning('Đã từ chối hồ sơ thanh lý.');
        fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi từ chối hồ sơ: ' + err.message);
    }
  };

  // Filter equipments
  const filteredEquipments = equipments.filter(eq => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (eq.code || '').toLowerCase().includes(q) ||
      (eq.name || '').toLowerCase().includes(q) ||
      (eq.brand || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || eq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const eqColumns = [
    {
      title: 'Mã Tài Sản',
      key: 'code',
      width: '140px',
      sortable: true,
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
          {val}
        </span>
      )
    },
    {
      title: 'Tên Thiết Bị',
      key: 'name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{val}</div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{row.brand} {row.model}</div>
        </div>
      )
    },
    {
      title: 'Vị Trí Phòng',
      key: 'room_id',
      render: (val) => (
        <span className="ruo-badge ruo-badge-neutral">
          {val ? (typeof val === 'object' ? val.code : val) : 'Kho CSVC'}
        </span>
      )
    },
    {
      title: 'Nguyên Giá',
      key: 'price',
      sortable: true,
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          {val ? `${Number(val).toLocaleString('vi-VN')} đ` : '—'}
        </span>
      )
    },
    {
      title: 'Giá Trị Còn Lại',
      key: 'remaining_value',
      sortable: true,
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-primary)' }}>
          {val ? `${Number(val).toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      )
    },
    {
      title: 'Chỉ Số R%',
      key: 'rRatio',
      width: '120px',
      sortable: true,
      render: (val, row) => {
        const r = typeof row.rRatio === 'number' ? row.rRatio : (row.estimated_repair_cost / (row.remaining_value || 1) * 100);
        const isHigh = r >= 60;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 800,
                color: isHigh ? '#E5484D' : '#2FB37A'
              }}
            >
              {Math.round(r)}%
            </span>
            {isHigh && (
              <span className="ruo-badge" style={{ background: 'rgba(229,72,77,0.15)', color: '#E5484D', borderColor: 'rgba(229,72,77,0.3)', fontSize: '9px', padding: '1px 4px' }}>
                R≥60%
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelectedEq(row)}>
          Xem Chi Tiết
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Quản Lý Vòng Đời Thiết Bị & Thanh Lý Tài Sản
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Quản lý tài sản theo vòng đời: Mua sắm → Định danh QR → Điều chuyển → Sửa chữa → Thanh lý RACI 5 bước khi R ≥ 60%
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant={activeSection === 'inventory' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('inventory')}
          >
            Kho Thiết Bị ({equipments.length})
          </Button>

          <Button
            variant={activeSection === 'disposal' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('disposal')}
          >
            Hồ Sơ Thanh Lý RACI ({disposals.length})
            {flaggedCandidates.length > 0 && (
              <span style={{ marginLeft: '6px', background: '#E5484D', color: '#FFF', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                {flaggedCandidates.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ==============================================================
          SECTION 1: KHO THIẾT BỊ
          ============================================================== */}
      {activeSection === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Flagged Banner */}
          {flaggedCandidates.length > 0 && (
            <div
              style={{
                background: 'rgba(224, 122, 62, 0.12)',
                border: '1px solid rgba(224, 122, 62, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icons.AlertTriangle size={18} color="#E07A3E" />
                <span style={{ fontSize: '13px', color: 'var(--ink-primary)' }}>
                  Phát hiện <strong>{flaggedCandidates.length} thiết bị</strong> có tỷ lệ sửa chữa <strong>R ≥ 60%</strong> so với giá trị còn lại. Cần lập hồ sơ thanh lý.
                </span>
              </div>
              <Button size="sm" variant="danger" onClick={() => setActiveSection('disposal')}>
                Xem Danh Sách Thanh Lý
              </Button>
            </div>
          )}

          {/* Search & Filters */}
          <Card style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Icons.Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--ink-muted)' }} />
                <input
                  type="text"
                  className="ruo-portal-input"
                  style={{ paddingLeft: '36px', height: '34px', fontSize: '13px' }}
                  placeholder="Tìm theo mã tài sản, tên thiết bị hoặc hãng sản xuất..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="ruo-portal-input"
                style={{ height: '34px', fontSize: '12px', padding: '0 10px', width: '180px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="repairing">Đang sửa chữa</option>
                <option value="transferring">Đang điều chuyển</option>
                <option value="pending_disposal">Chờ thanh lý</option>
                <option value="disposed">Đã thanh lý</option>
              </select>
            </div>
          </Card>

          {/* Table */}
          <DataTable
            columns={eqColumns}
            data={filteredEquipments}
            loading={loading}
            emptyMessage="Không tìm thấy thiết bị phù hợp."
            onRowClick={(row) => setSelectedEq(row)}
          />
        </div>
      )}

      {/* ==============================================================
          SECTION 2: QUY TRÌNH THANH LÝ RACI 5 BƯỚC
          ============================================================== */}
      {activeSection === 'disposal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* RACI Matrix Banner */}
          <Card style={{ padding: '16px 20px', background: 'var(--surface-1)' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--blueprint-400)', fontWeight: 800, marginBottom: '8px' }}>
              Quy Trình Thanh Lý Tài Sản 5 Bước (RACI Institutional Flow)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', fontSize: '12px' }}>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Bước 1: R (Responsible)</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>Kỹ thuật viên lập đề xuất khi R ≥ 60%</div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Bước 2: A (Accountable)</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>Quản lý Phòng HC xét duyệt hồ sơ</div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Bước 3: A (Approver)</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>Ban Giám Hiệu ký Quyết định thanh lý</div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Bước 4: C (Consulted)</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>Quản lý phòng lập dự trù mua sắm thay thế</div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Bước 5: I (Informed)</div>
                <div style={{ color: 'var(--ink-muted)', fontSize: '11px', marginTop: '2px' }}>Kỹ thuật viên nhập kho tài sản thay thế</div>
              </div>
            </div>
          </Card>

          {/* Proposals List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {disposals.map(disp => {
              const eq = disp.equipment_id;
              return (
                <Card key={disp._id} style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blueprint-400)', fontSize: '14px' }}>
                          {eq?.code || 'EQ-UNKNOWN'}
                        </span>
                        <StatusBadge status={disp.status} />
                        <span className="ruo-badge" style={{ background: 'rgba(62,123,250,0.1)', color: 'var(--blueprint-400)' }}>
                          Bước {disp.current_step} / 5
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        {eq?.name} • Nguyên giá: {Number(eq?.price || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    {/* RACI Step Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {disp.status === 'proposed' && isManagerOrAdmin && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleHcApprove(disp._id)}>
                            Bước 2: Phòng HC Duyệt
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(disp._id)}>
                            Từ Chối
                          </Button>
                        </>
                      )}

                      {disp.status === 'hc_approved' && isAdmin && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => {
                            setSelectedDisposalId(disp._id);
                            setShowBghModal(true);
                          }}>
                            Bước 3: BGH Ban Hành Quyết Định
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(disp._id)}>
                            Từ Chối
                          </Button>
                        </>
                      )}

                      {disp.status === 'bgh_approved' && isManagerOrAdmin && (
                        <Button size="sm" variant="primary" onClick={() => {
                          setSelectedDisposalId(disp._id);
                          setShowProcureModal(true);
                        }}>
                          Bước 4: Cập Nhật Kế Hoạch Mua Sắm
                        </Button>
                      )}

                      {disp.status === 'procuring' && isStaffOrAdmin && (
                        <Button size="sm" variant="primary" onClick={() => handleReceipt(disp._id)}>
                          Bước 5: Tiếp Nhận Tài Sản & Hoàn Tất
                        </Button>
                      )}

                      {disp.status === 'received' && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2FB37A' }}>
                          ✓ Đã hoàn tất thanh lý & nhập kho
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                    <div>Lý do đề xuất: <strong>{disp.reason}</strong></div>
                    {disp.decision_number && (
                      <div style={{ marginTop: '4px' }}>Số quyết định BGH: <strong style={{ color: 'var(--blueprint-400)' }}>{disp.decision_number}</strong></div>
                    )}
                    {disp.procurement_plan && (
                      <div style={{ marginTop: '4px' }}>Dự toán thay thế: <strong>{disp.procurement_plan}</strong></div>
                    )}
                  </div>
                </Card>
              );
            })}

            {disposals.length === 0 && (
              <EmptyState title="Chưa có hồ sơ thanh lý" message="Hiện tại chưa có thiết bị nào đang trong quy trình thanh lý RACI." />
            )}
          </div>
        </div>
      )}

      {/* Equipment Detail Drawer */}
      {selectedEq && (
        <Drawer
          isOpen={Boolean(selectedEq)}
          onClose={() => setSelectedEq(null)}
          title={selectedEq.name}
          subtitle={`Mã tài sản: ${selectedEq.code}`}
          width="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status & Lifecycle Gauge */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <StatusBadge status={selectedEq.status} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--ink-muted)' }}>
                  QR: {selectedEq.qr_code}
                </span>
              </div>

              {/* R-Ratio Indicator */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Tỷ lệ sửa chữa R% (Ngưỡng thanh lý: 60%)</span>
                  <strong style={{ color: (selectedEq.rRatio || 0) >= 60 ? '#E5484D' : '#2FB37A', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(selectedEq.rRatio || 0)}%
                  </strong>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round(selectedEq.rRatio || 0))}%`,
                      background: (selectedEq.rRatio || 0) >= 60 ? '#E5484D' : '#2FB37A',
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
              </div>

              {(selectedEq.rRatio || 0) >= 60 && (
                <div style={{ marginTop: '14px' }}>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setProposeData({
                        equipment_id: selectedEq._id,
                        reason: `Tỷ lệ R% đạt ${Math.round(selectedEq.rRatio)}% >= 60%. Đề xuất thanh lý tài sản.`,
                        recovery_value: Math.round((selectedEq.remaining_value || 0) * 0.2)
                      });
                      setShowProposeModal(true);
                    }}
                  >
                    Lập Đề Xuất Thanh Lý RACI (Bước 1)
                  </Button>
                </div>
              )}
            </div>

            {/* Financial Specs */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Kinh Phí & Khấu Hao
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                <div>Nguyên giá mua sắm: <strong style={{ fontFamily: 'var(--font-mono)' }}>{Number(selectedEq.price || 0).toLocaleString('vi-VN')} đ</strong></div>
                <div>Giá trị còn lại: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--blueprint-400)' }}>{Number(selectedEq.remaining_value || 0).toLocaleString('vi-VN')} đ</strong></div>
                <div>Chi phí sửa chữa tích lũy: <strong style={{ fontFamily: 'var(--font-mono)', color: '#E5A33B' }}>{Number(selectedEq.estimated_repair_cost || 0).toLocaleString('vi-VN')} đ</strong></div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                Thông Số Kỹ Thuật
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                <div>Thương hiệu / Model: <strong>{selectedEq.brand} {selectedEq.model}</strong></div>
                <div>Số sê-ri: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedEq.serial_number || 'N/A'}</strong></div>
                <div>Vị trí: <strong>{selectedEq.room_id?.name || selectedEq.room_id?.code || 'Kho'}</strong></div>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Propose Modal */}
      {showProposeModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowProposeModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '460px', height: 'auto', margin: 'auto', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Đề Xuất Thanh Lý Tài Sản (Bước 1)</h2>
              <button onClick={() => setShowProposeModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleProposeSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Lý do thanh lý *</label>
                <textarea
                  className="ruo-portal-input"
                  style={{ minHeight: '80px', padding: '10px' }}
                  value={proposeData.reason}
                  onChange={e => setProposeData({ ...proposeData, reason: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Giá trị thu hồi dự kiến (VND)</label>
                <input
                  type="number"
                  className="ruo-portal-input"
                  value={proposeData.recovery_value}
                  onChange={e => setProposeData({ ...proposeData, recovery_value: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setShowProposeModal(false)}>Hủy</Button>
                <Button type="submit" variant="danger">Gửi Đề Xuất</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BGH Decision Modal */}
      {showBghModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowBghModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '420px', height: 'auto', margin: 'auto', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Ban Giám Hiệu Phê Duyệt Thanh Lý (Bước 3)</h2>
              <button onClick={() => setShowBghModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Số quyết định thanh lý BGH *</label>
                <input
                  type="text"
                  className="ruo-portal-input"
                  value={decisionNumber}
                  onChange={e => setDecisionNumber(e.target.value)}
                  placeholder="Ví dụ: QD-TL-2026/01"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setShowBghModal(false)}>Hủy</Button>
                <Button variant="primary" onClick={handleBghApproveSubmit}>Ký Duyệt Quyết Định</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Procurement Modal */}
      {showProcureModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowProcureModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '420px', height: 'auto', margin: 'auto', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Dự Trù Mua Sắm Thay Thế (Bước 4)</h2>
              <button onClick={() => setShowProcureModal(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Kế hoạch mua sắm tài sản thay thế *</label>
                <textarea
                  className="ruo-portal-input"
                  style={{ minHeight: '80px', padding: '10px' }}
                  placeholder="Ví dụ: Mua mới 01 Máy chiếu Laser 5000 lumens trang bị cho phòng học..."
                  value={procurementPlan}
                  onChange={e => setProcurementPlan(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setShowProcureModal(false)}>Hủy</Button>
                <Button variant="primary" onClick={handleProcureSubmit}>Lưu Kế Hoạch</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentDisposalPage;
