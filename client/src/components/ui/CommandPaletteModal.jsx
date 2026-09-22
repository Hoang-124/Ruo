import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';

const ALL_MODULES = [
  {
    id: 'dashboard',
    label: 'Bản Đồ Không Gian (CAD Architectural Floor Plan)',
    cat: 'TRỤ CỘT 1 • KHÔNG GIAN',
    icon: Icons.Building,
    desc: 'Mặt bằng CAD kiến trúc thời gian thực, Time-Travel Scrubber, IoT Telemetry nhiệt độ và điện năng'
  },
  {
    id: 'rooms',
    label: 'Tra Cứu 108 Phòng Học & Đặt Chỗ Nhanh',
    cat: 'TRỤ CỘT 2 • LỊCH BIỂU',
    icon: Icons.Room,
    desc: 'Tìm kiếm phòng theo sức chứa, thiết bị, kiểm tra xung đột thời khóa biểu và giữ chỗ tức thời'
  },
  {
    id: 'calendar',
    label: 'Lịch Biểu Tuần Chuẩn RFC-5545 Toàn Trường',
    cat: 'TRỤ CỘT 2 • LỊCH BIỂU',
    icon: Icons.Calendar,
    desc: 'Đồng bộ 3 lớp dữ liệu: Lịch chính khóa đào tạo, Sự kiện trường và Lịch tự học sinh viên'
  },
  {
    id: 'approvals',
    label: 'Hàng Đợi Phê Duyệt Đa Cấp & Tự Động Chuyển Cấp SLA',
    cat: 'TRỤ CỘT 3 • ĐIỀU HÀNH',
    icon: Icons.CheckCircle,
    desc: 'Quản lý yêu cầu sử dụng phòng chờ duyệt, cơ chế tự động chuyển cấp lãnh đạo khi quá hạn SLA'
  },
  {
    id: 'tickets_kanban',
    label: 'Kanban SLA Quản Lý Sự Cố Khẩn Cấp',
    cat: 'TRỤ CỘT 3 • ĐIỀU HÀNH',
    icon: Icons.Ticket,
    desc: 'Đếm ngược SLA theo giờ hành chính 07:30 - 17:00, điều phối kỹ thuật viên xử lý thiết bị hỏng'
  },
  {
    id: 'csp_studio',
    label: 'Bộ Giải Thuật Toán Xếp TKB Tự Động (CSP Engine)',
    cat: 'TRỤ CỘT 1 • THUẬT TOÁN',
    icon: Icons.Cpu,
    desc: 'Thuật toán Backtracking + MRV + LCV + AC-3, tối ưu hóa xếp lịch học 0 xung đột phòng'
  },
  {
    id: 'equipments',
    label: 'Kho Thiết Bị & Quản Lý Mã QR Định Danh',
    cat: 'TRỤ CỘT 4 • THIẾT BỊ',
    icon: Icons.Equipment,
    desc: 'Kiểm kê tài sản thiết bị giảng đường, mượn trả thiết bị Lab, quét mã QR định danh'
  },
  {
    id: 'disposal_calc',
    label: 'Máy Tính Thanh Lý Tài Sản Tự Động (Chỉ Số R ≥ 60%)',
    cat: 'TRỤ CỘT 5 • THANH LÝ',
    icon: Icons.Sliders,
    desc: 'Tính toán hao mòn kinh tế kỹ thuật tài sản, lập biên bản và hội đồng thanh lý tự động'
  },
  {
    id: 'rbac',
    label: 'Ma Trận Phân Quyền 7 Vai Trò (RBAC Engine)',
    cat: 'QUẢN TRỊ & BẢO MẬT',
    icon: Icons.Users,
    desc: 'Thiết lập thẩm quyền cho Sinh viên, Giảng viên, QL CSVC, Kỹ thuật, Đào tạo, Admin'
  },
  {
    id: 'audit_log',
    label: 'Nhật Ký Kiểm Toán SHA-256 Bất Biến (Audit Trail)',
    cat: 'QUẢN TRỊ & BẢO MẬT',
    icon: Icons.Audit,
    desc: 'Lưu vết mật mã học không thể chỉnh sửa mọi thao tác đặt phòng, phê duyệt và thanh lý'
  }
];

export const CommandPaletteModal = ({ isOpen, onClose, onSelectModule }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = ALL_MODULES.filter(
    (m) =>
      m.label.toLowerCase().includes(query.toLowerCase()) ||
      m.cat.toLowerCase().includes(query.toLowerCase()) ||
      m.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 15, 23, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--surface-panel)',
          border: '1px solid var(--hairline-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--hairline-soft)',
            background: 'var(--surface-panel)'
          }}
        >
          <Icons.Search size={18} color="var(--laser-cyan)" />
          <input
            type="text"
            placeholder="Tìm kiếm phân hệ nghiệp vụ, tính năng 95 Use Cases (VD: Đặt phòng, CSP, Thanh lý, SLA)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--ink-pure)'
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <Icons.X size={16} />
            </button>
          )}
          <kbd
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'var(--canvas-subtle)',
              border: '1px solid var(--hairline-soft)',
              color: 'var(--ink-muted)'
            }}
          >
            ESC Đóng
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--ink-muted)',
              padding: '6px 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Phân hệ nghiệp vụ ({filtered.length})
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-muted)', fontSize: '13px' }}>
              Không tìm thấy phân hệ nào phù hợp với từ khóa "{query}"
            </div>
          ) : (
            filtered.map((m) => {
              const IconComp = m.icon;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    onSelectModule(m.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-panel-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--canvas-subtle)',
                      border: '1px solid var(--hairline-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--laser-cyan)',
                      flexShrink: 0
                    }}
                  >
                    <IconComp size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-pure)' }}>
                        {m.label}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: 'var(--laser-cyan)'
                        }}
                      >
                        {m.cat}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--ink-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>

                  <Icons.ChevronRight size={14} color="var(--ink-muted)'" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--hairline-soft)',
            background: 'var(--canvas-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--ink-muted)'
          }}
        >
          <span>Hệ Thống Ruo • Phân Hạng 95 Chức Năng 5 Trụ Cột</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>Enter Chọn • ↑↓ Di Chuyển</span>
        </div>
      </div>
    </div>
  );
};
