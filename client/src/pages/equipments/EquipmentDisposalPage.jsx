import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { EQUIPMENTS } from '../../mock/mockData';

// Extended university equipment inventory dataset
const EXTENDED_EQUIPMENTS = [
  ...EQUIPMENTS,
  {
    id: 'EQ_005',
    assetCode: 'TS-2023-SB01',
    name: 'Màn Hình Cảm Ứng Tương Tác Maxhub 86 inch 4K',
    category: 'Màn hình & Bảng số',
    originalPrice: 85000000,
    remainingValue: 68000000,
    purchaseDate: '2023-01-12',
    locationRoom: 'A1-405',
    status: 'in_use',
    repairCount: 0,
    estimatedRepairCost: 0
  },
  {
    id: 'EQ_006',
    assetCode: 'TS-2020-SW08',
    name: 'Switch L3 Cisco Catalyst 9200L 48-port PoE+',
    category: 'Thiết bị mạng & Viễn thông',
    originalPrice: 62000000,
    remainingValue: 21000000,
    purchaseDate: '2020-08-25',
    locationRoom: 'Phòng Server C1',
    status: 'in_use',
    repairCount: 2,
    estimatedRepairCost: 2100000
  },
  {
    id: 'EQ_007',
    assetCode: 'TS-2022-MIC01',
    name: 'Kính Hiển Vi Quang Học 3 Mắt Olympus CX23',
    category: 'Thiết bị Lab & Đo kiểm',
    originalPrice: 28000000,
    remainingValue: 19500000,
    purchaseDate: '2022-04-10',
    locationRoom: 'B1-204 (Lab Vi sinh)',
    status: 'available',
    repairCount: 0,
    estimatedRepairCost: 0
  },
  {
    id: 'EQ_008',
    assetCode: 'TS-2017-AM03',
    name: 'Hệ Thống Âm Thanh Hội Thảo Đa Vùng Shure MXW',
    category: 'Âm thanh & Ánh sáng',
    originalPrice: 45000000,
    remainingValue: 5000000,
    purchaseDate: '2017-10-15',
    locationRoom: 'Hội Trường Trụ Sở A',
    status: 'disposal_pending',
    repairCount: 7,
    estimatedRepairCost: 4200000
  }
];

export const EquipmentDisposalPage = ({ initialTab = 'inventory' }) => {
  const [activeSection, setActiveSection] = useState(initialTab);
  const [equipmentsList, setEquipmentsList] = useState(EXTENDED_EQUIPMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQRItem, setSelectedQRItem] = useState(null);

  // Disposal Calculator State
  const [selectedEq, setSelectedEq] = useState(EXTENDED_EQUIPMENTS[1]); // Daikin damaged
  const [calcCost, setCalcCost] = useState(5200000);
  const [calcRemaining, setCalcRemaining] = useState(8000000);
  const [currentStep, setCurrentStep] = useState(2);

  const repairRatio = Math.round((calcCost / (calcRemaining || 1)) * 100);
  const isDisposalTriggered = repairRatio >= 60;

  const raciSteps = [
    {
      step: 1,
      role: 'Kỹ thuật viên (Responsible - R)',
      action: 'Khảo sát hiện trường; tính chỉ số R ≥ 60%; tạo Biên bản Giám định Kỹ thuật kèm ảnh hư hỏng.',
      status: 'MAINTENANCE → UNREPAIRABLE',
      completed: currentStep > 1,
      active: currentStep === 1
    },
    {
      step: 2,
      role: 'Cán bộ CSVC (Accountable - A)',
      action: 'Tra cứu hồ sơ gốc tài sản (nguyên giá, khấu hao); tổng hợp danh mục và lập Hồ sơ Đề xuất Thanh lý theo Đợt.',
      status: 'UNREPAIRABLE → DISPOSAL_PENDING',
      completed: currentStep > 2,
      active: currentStep === 2
    },
    {
      step: 3,
      role: 'Hội Đồng Thanh Lý / BGH (Approver - A)',
      action: 'Thẩm định hồ sơ, kiểm tra tính pháp lý; ra quyết định chính thức phê duyệt thanh lý tài sản nhà trường.',
      status: 'DISPOSAL_PENDING → DISPOSED',
      completed: currentStep > 3,
      active: currentStep === 3
    },
    {
      step: 4,
      role: 'Cán bộ CSVC & P. Đào tạo (Consulted - C)',
      action: 'Căn cứ vào số lượng thiết bị thanh lý và kế hoạch đào tạo: Lập Dự trù Ngân sách Mua sắm Bổ sung.',
      status: 'Khởi tạo Procurement Plan',
      completed: currentStep > 4,
      active: currentStep === 4
    },
    {
      step: 5,
      role: 'Thủ Kho & Admin (Informed - I)',
      action: 'Kiểm định lô hàng mới nhập, dán mã QR/Barcode và phân bổ vào phòng học để đưa vào sử dụng.',
      status: 'Thiết bị mới: AVAILABLE',
      completed: currentStep > 5,
      active: currentStep === 5
    }
  ];

  // Switch to disposal section with preselected equipment
  const handleProposeDisposal = (eq) => {
    setSelectedEq(eq);
    setCalcCost(eq.estimatedRepairCost || Math.round(eq.remainingValue * 0.65));
    setCalcRemaining(eq.remainingValue || 1000000);
    setActiveSection('disposal');
  };

  // Filter equipments
  const filteredEquipments = equipmentsList.filter((eq) => {
    const matchSearch =
      eq.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.locationRoom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || eq.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || eq.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const categories = ['ALL', ...Array.from(new Set(EXTENDED_EQUIPMENTS.map(e => e.category)))];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_use':
        return { label: 'Đang sử dụng', color: 'var(--laser-cyan)', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' };
      case 'available':
        return { label: 'Sẵn sàng xuất mượn', color: 'var(--laser-emerald)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
      case 'damaged':
        return { label: 'Báo hỏng / Cần thẩm định', color: 'var(--laser-crimson)', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)' };
      case 'disposal_pending':
        return { label: 'Chờ thanh lý (R ≥ 60%)', color: 'var(--laser-amber)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
      default:
        return { label: status, color: 'var(--ink-muted)', bg: 'rgba(255,255,255,0.08)', border: 'var(--hairline-soft)' };
    }
  };

  return (
    <div>
      {/* Top Header & Navigation Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>
            Quản Lý Thiết Bị & Chu Trình Vòng Đời Tài Sản (Trụ Cột 4 & 5)
          </h1>
          <div className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
            Quản lý kho thiết bị 108 phòng học qua mã QR định danh và Quy trình thanh lý theo chỉ số R ≥ 60%
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-panel)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--hairline-medium)' }}>
          <button
            onClick={() => setActiveSection('inventory')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: activeSection === 'inventory' ? 700 : 500,
              background: activeSection === 'inventory' ? 'linear-gradient(135deg, var(--laser-indigo), var(--laser-cyan))' : 'transparent',
              color: activeSection === 'inventory' ? '#FFFFFF' : 'var(--ink-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Icons.Equipment size={14} color={activeSection === 'inventory' ? '#FFFFFF' : 'var(--laser-cyan)'} />
            <span>Kho Thiết Bị & Kiểm Kê QR (Trụ Cột 4)</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
              {EXTENDED_EQUIPMENTS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('disposal')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: activeSection === 'disposal' ? 700 : 500,
              background: activeSection === 'disposal' ? 'linear-gradient(135deg, var(--laser-amber), var(--laser-rose))' : 'transparent',
              color: activeSection === 'disposal' ? '#FFFFFF' : 'var(--ink-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Icons.Sliders size={14} color={activeSection === 'disposal' ? '#FFFFFF' : 'var(--laser-amber)'} />
            <span>Thanh Lý Tài Sản R ≥ 60% (Trụ Cột 5)</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '3px' }}>
              RACI
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: KHO THIẾT BỊ & KIỂM KÊ MÃ QR (TRỤ CỘT 4) */}
      {activeSection === 'inventory' && (
        <div>
          {/* Inventory Metrics Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tổng Thiết Bị & Tài Sản</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>148</div>
              <div style={{ fontSize: '11px', color: 'var(--laser-cyan)' }}>100% định danh mã QR bất biến</div>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Đang Phục Vụ Giảng Dạy</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--laser-cyan)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>132</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>Tỷ lệ khả dụng 89.2%</div>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sẵn Sàng Xuất Mượn Lab</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--laser-emerald)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>11</div>
              <div style={{ fontSize: '11px', color: 'var(--laser-emerald)' }}>Mượn trả qua thẻ sinh viên/GV</div>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Báo Hỏng / Cần Giám Định</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--laser-rose)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>5</div>
              <div style={{ fontSize: '11px', color: 'var(--laser-rose)' }}>2 thiết bị đủ điều kiện R ≥ 60%</div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <div style={{ position: 'absolute', left: '12px', top: '10px' }}>
                  <Icons.Search size={15} color="var(--ink-muted)" />
                </div>
                <input
                  type="text"
                  placeholder="Tra cứu theo mã tài sản (TS-2021-MC01), tên thiết bị, phòng học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '36px', height: '36px', fontSize: '12.5px' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>Tình trạng:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '36px', fontSize: '12px', minWidth: '150px' }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="in_use">Đang sử dụng</option>
                  <option value="available">Sẵn sàng mượn</option>
                  <option value="damaged">Báo hỏng</option>
                  <option value="disposal_pending">Chờ thanh lý (R ≥ 60%)</option>
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>Nhóm:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '36px', fontSize: '12px', minWidth: '160px' }}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === 'ALL' ? 'Tất cả phân loại' : c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Equipment Table */}
          <div className="card" style={{ padding: 0, background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', overflow: 'hidden' }}>
            <div className="data-table-container">
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--spatial-bar-bg)', borderBottom: '1px solid var(--hairline-medium)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Mã Tài Sản</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Tên Thiết Bị</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Vị Trí Phòng</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Nguyên Giá / Còn Lại</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Mã QR</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--ink-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipments.map((eq) => {
                    const badge = getStatusBadge(eq.status);
                    return (
                      <tr
                        key={eq.id}
                        style={{ borderBottom: '1px solid var(--hairline-soft)', transition: 'background 120ms ease' }}
                        className="data-table-row"
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                            {eq.assetCode}
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-pure)' }}>{eq.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{eq.category} • Ngày nhập: {eq.purchaseDate}</div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', background: 'var(--spatial-bar-bg)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-soft)' }}>
                            <Icons.Room size={12} color="var(--laser-cyan)" />
                            <span>{eq.locationRoom}</span>
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          <div style={{ color: 'var(--ink-secondary)' }}>{eq.originalPrice.toLocaleString('vi-VN')} đ</div>
                          <div style={{ fontWeight: 700, color: 'var(--laser-emerald)' }}>
                            {eq.remainingValue.toLocaleString('vi-VN')} đ
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              color: badge.color,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: badge.color }} />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedQRItem(eq)}
                            className="laser-btn laser-btn-ghost"
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Quét hoặc xem mã QR định danh tài sản"
                          >
                            <Icons.QrCode size={13} color="var(--laser-cyan)" />
                            <span>QR Code</span>
                          </button>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {eq.status === 'damaged' || eq.status === 'disposal_pending' ? (
                            <button
                              onClick={() => handleProposeDisposal(eq)}
                              className="laser-btn laser-btn-rose"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)' }}
                              title="Chuyển sang Bộ tính toán R và Quy trình thanh lý RACI"
                            >
                              <Icons.Sliders size={12} />
                              <span>Giám Định R ≥ 60%</span>
                            </button>
                          ) : eq.status === 'available' ? (
                            <button
                              onClick={() => alert(`Đã tạo phiếu mượn thiết bị ${eq.name} cho tài khoản hiện tại!`)}
                              className="laser-btn laser-btn-cyan"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)' }}
                            >
                              <Icons.CheckCircle size={12} />
                              <span>Mượn Thiết Bị</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEquipmentsList(prev => prev.map(item => item.id === eq.id ? { ...item, status: 'damaged', estimatedRepairCost: Math.round(item.remainingValue * 0.65) } : item));
                                alert(`Đã ghi nhận báo hỏng cho thiết bị ${eq.name}. Kỹ thuật viên sẽ tiến hành khảo sát!`);
                              }}
                              className="laser-btn laser-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)' }}
                              title="Báo cáo thiết bị gặp trục trặc"
                            >
                              <Icons.Wrench size={12} />
                              <span>Báo Hỏng</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: QUY TRÌNH THANH LÝ & MÁY TÍNH CHỈ SỐ R ≥ 60% (TRỤ CỘT 5) */}
      {activeSection === 'disposal' && (
        <div>
          {/* R Ratio Calculator Banner */}
          <div className="card" style={{ marginBottom: '24px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink-pure)' }}>
              <Icons.Sliders size={18} color="var(--laser-cyan)" />
              <span>Bộ Tính Toán Chỉ Số Tài Chính R (Repair vs. Disposal Ratio Calculator)</span>
            </h3>

            <div className="grid-cols-3" style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Thiết bị thẩm định kỹ thuật
                </label>
                <select
                  className="form-control"
                  value={selectedEq?.id || ''}
                  onChange={(e) => {
                    const eq = EXTENDED_EQUIPMENTS.find(item => item.id === e.target.value);
                    if (eq) {
                      setSelectedEq(eq);
                      setCalcCost(eq.estimatedRepairCost || 3000000);
                      setCalcRemaining(eq.remainingValue);
                    }
                  }}
                  style={{ height: '38px', fontSize: '12.5px' }}
                >
                  {EXTENDED_EQUIPMENTS.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetCode} - {eq.name} ({eq.locationRoom})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Chi phí sửa chữa ước tính (VNĐ)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={calcCost}
                  onChange={(e) => setCalcCost(parseInt(e.target.value) || 0)}
                  style={{ height: '38px', fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Giá trị sổ sách còn lại (VNĐ)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={calcRemaining}
                  onChange={(e) => setCalcRemaining(parseInt(e.target.value) || 1)}
                  style={{ height: '38px', fontSize: '12.5px', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            {/* Ratio Result Box */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: isDisposalTriggered ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${isDisposalTriggered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Công thức kiểm toán: <code>R = (Chi phí sửa / Giá trị còn lại) × 100%</code>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: isDisposalTriggered ? 'var(--laser-rose)' : 'var(--laser-emerald)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  Chỉ số R = {repairRatio}%
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {isDisposalTriggered ? (
                  <div>
                    <span style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--laser-rose)', border: '1px solid rgba(239,68,68,0.4)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.AlertTriangle size={14} /> ĐỦ ĐIỀU KIỆN ĐỀ XUẤT THANH LÝ (R ≥ 60%)
                    </span>
                    <div style={{ fontSize: '11.5px', color: 'var(--laser-rose)', marginTop: '6px' }}>
                      Hệ thống tự động khóa tính năng mượn và kích hoạt tiến trình 5 bước theo Hội đồng CSVC.
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--laser-emerald)', border: '1px solid rgba(16,185,129,0.4)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.CheckCircle size={14} /> TIẾN HÀNH SỬA CHỮA / BẢO DƯỠNG (R &lt; 60%)
                    </span>
                    <div style={{ fontSize: '11.5px', color: 'var(--laser-emerald)', marginTop: '6px' }}>
                      Xuất linh kiện thay thế từ kho kỹ thuật để tiếp tục phục vụ phòng học.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5-Step RACI Matrix Stepper */}
          <div className="card" style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>
                  Tiến Trình 5 Bước Thanh Lý Tài Sản (RACI Matrix)
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                  Đảm bảo tính pháp lý, minh bạch trách nhiệm và bảo toàn lịch sử kiểm toán tài sản công nhà trường
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="laser-btn laser-btn-ghost"
                  disabled={currentStep <= 1}
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  style={{ opacity: currentStep <= 1 ? 0.5 : 1, fontSize: '12px', padding: '6px 14px' }}
                >
                  <Icons.ChevronLeft size={14} />
                  <span>Bước trước</span>
                </button>
                <button
                  className="laser-btn laser-btn-primary"
                  disabled={currentStep >= 5}
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  style={{ opacity: currentStep >= 5 ? 0.5 : 1, fontSize: '12px', padding: '6px 14px' }}
                >
                  <span>Bước tiếp theo</span>
                  <Icons.ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {raciSteps.map((s) => (
                <div
                  key={s.step}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: s.active ? '1.5px solid var(--laser-cyan)' : '1px solid var(--hairline-soft)',
                    background: s.completed
                      ? 'rgba(16, 185, 129, 0.05)'
                      : s.active
                      ? 'rgba(6, 182, 212, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {/* Step circle */}
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: s.completed
                        ? 'linear-gradient(135deg, var(--laser-emerald), #059669)'
                        : s.active
                        ? 'linear-gradient(135deg, var(--laser-indigo), var(--laser-cyan))'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      flexShrink: 0
                    }}
                  >
                    {s.completed ? <Icons.Check size={16} /> : s.step}
                  </div>

                  {/* Step info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--ink-pure)' }}>
                        Bước {s.step}: {s.role}
                      </span>
                      {s.active && (
                        <span style={{ fontSize: '9.5px', background: 'rgba(6,182,212,0.2)', color: 'var(--laser-cyan)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(6,182,212,0.3)' }}>
                          ĐANG THỰC HIỆN
                        </span>
                      )}
                      {s.completed && (
                        <span style={{ fontSize: '9.5px', background: 'rgba(16,185,129,0.2)', color: 'var(--laser-emerald)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(16,185,129,0.3)' }}>
                          ĐÃ HOÀN TẤT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                      {s.action}
                    </div>
                  </div>

                  {/* System State */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: 'var(--ink-muted)' }}>Trạng thái hệ thống:</div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL SIMULATOR */}
      {selectedQRItem && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedQRItem(null)}
          style={{ zIndex: 300, backdropFilter: 'blur(20px)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-glow)', borderRadius: 'var(--radius-xl)', padding: '24px', textAlign: 'center', boxShadow: '0 25px 70px rgba(0,0,0,0.8)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink-pure)' }}>Mã Định Danh QR Thiết Bị</div>
              <button
                onClick={() => setSelectedQRItem(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
              >
                <Icons.Close size={18} />
              </button>
            </div>

            {/* QR Pattern Display */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: 'var(--radius-lg)', display: 'inline-block', marginBottom: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Corner Position Detection Patterns */}
                <rect x="10" y="10" width="40" height="40" rx="4" fill="#0F172A" />
                <rect x="18" y="18" width="24" height="24" fill="#FFFFFF" />
                <rect x="24" y="24" width="12" height="12" fill="#0F172A" />

                <rect x="130" y="10" width="40" height="40" rx="4" fill="#0F172A" />
                <rect x="138" y="18" width="24" height="24" fill="#FFFFFF" />
                <rect x="144" y="24" width="12" height="12" fill="#0F172A" />

                <rect x="10" y="130" width="40" height="40" rx="4" fill="#0F172A" />
                <rect x="18" y="138" width="24" height="24" fill="#FFFFFF" />
                <rect x="24" y="144" width="12" height="12" fill="#0F172A" />

                {/* Simulated Data Grid Cells */}
                <rect x="60" y="15" width="10" height="10" fill="#0F172A" />
                <rect x="80" y="15" width="10" height="10" fill="#0F172A" />
                <rect x="100" y="15" width="10" height="10" fill="#0F172A" />

                <rect x="60" y="35" width="20" height="10" fill="#0F172A" />
                <rect x="90" y="35" width="10" height="20" fill="#0F172A" />
                <rect x="110" y="35" width="10" height="10" fill="#0F172A" />

                <rect x="15" y="60" width="10" height="20" fill="#0F172A" />
                <rect x="35" y="60" width="20" height="10" fill="#0F172A" />
                <rect x="35" y="80" width="10" height="20" fill="#0F172A" />

                {/* Center QR Data Matrix */}
                <rect x="60" y="60" width="60" height="60" rx="2" fill="#0F172A" />
                <rect x="70" y="70" width="40" height="40" fill="#FFFFFF" />
                <circle cx="90" cy="90" r="12" fill="#2563EB" />

                <rect x="130" y="60" width="20" height="10" fill="#0F172A" />
                <rect x="140" y="80" width="20" height="20" fill="#0F172A" />
                <rect x="130" y="110" width="10" height="10" fill="#0F172A" />

                <rect x="60" y="130" width="20" height="10" fill="#0F172A" />
                <rect x="70" y="150" width="10" height="20" fill="#0F172A" />
                <rect x="90" y="130" width="30" height="10" fill="#0F172A" />
                <rect x="100" y="150" width="20" height="20" fill="#0F172A" />
                <rect x="130" y="130" width="10" height="20" fill="#0F172A" />
                <rect x="150" y="140" width="20" height="10" fill="#0F172A" />
              </svg>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800, color: 'var(--laser-cyan)', marginBottom: '4px' }}>
              {selectedQRItem.assetCode}
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink-pure)', marginBottom: '4px' }}>
              {selectedQRItem.name}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
              Vị trí định vị: <strong style={{ color: 'var(--laser-cyan)' }}>{selectedQRItem.locationRoom}</strong> • Giá trị: {selectedQRItem.remainingValue.toLocaleString('vi-VN')} đ
            </div>

            <button
              onClick={() => {
                alert(`Đã sao chép đường dẫn định danh kiểm kê thiết bị: https://ruo.university.edu.vn/qr/${selectedQRItem.assetCode}`);
                setSelectedQRItem(null);
              }}
              className="laser-btn laser-btn-primary"
              style={{ width: '100%', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '12px' }}
            >
              <Icons.QrCode size={14} />
              <span>Sao Chép Liên Kết Mã QR</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
