import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';

const ALL_MODULES = [
  {
    id: 'dashboard',
    label: 'Bản Đồ Mặt Bằng CAD Kiến Trúc & Giám Sát Không Gian',
    cat: 'PHÂN HỆ 01 • KHÔNG GIAN',
    icon: Icons.Building,
    desc: 'Mặt bằng CAD kiến trúc thời gian thực, điều phối phòng học và giám sát thiết bị'
  },
  {
    id: 'equipments',
    label: 'Kho Quản Lý Thiết Bị & Nhãn Mã QR Định Danh',
    cat: 'PHÂN HỆ 02 • THIẾT BỊ',
    icon: Icons.Equipment,
    desc: 'Quản lý danh mục tài sản, cấu hình thông số kỹ thuật, in và dán tem nhãn QR'
  },
  {
    id: 'transfers',
    label: 'Điều Chuyển Trang Thiết Bị Giữa Các Phòng',
    cat: 'PHÂN HỆ 03 • ĐIỀU CHUYỂN',
    icon: Icons.RefreshCw,
    desc: 'Lập phiếu đề xuất luân chuyển tài sản, theo dõi biên bản bàn giao phòng nhận'
  },
  {
    id: 'tickets_kanban',
    label: 'Sự Cố & Sửa Chữa Thiết Bị (Kanban SLA)',
    cat: 'PHÂN HỆ 04 • SỬA CHỮA',
    icon: Icons.Wrench,
    desc: 'Tiếp nhận báo hỏng, đếm ngược cam kết thời gian khắc phục sự cố SLA khẩn cấp'
  },
  {
    id: 'maintenance',
    label: 'Kế Hoạch & Nhật Ký Bảo Trì Định Kỳ',
    cat: 'PHÂN HỆ 05 • BẢO TRÌ',
    icon: Icons.Calendar,
    desc: 'Lập lịch bảo dưỡng phòng học, ghi nhận nhật ký kiểm tra định kỳ điều hòa, máy chiếu'
  },
  {
    id: 'inventory',
    label: 'Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa',
    cat: 'PHÂN HỆ 06 • KIỂM KÊ',
    icon: Icons.CheckCircle,
    desc: 'Tạo đợt kiểm kê tài sản năm, quét mã QR camera di động đối soát thừa thiếu thực tế'
  },
  {
    id: 'disposal_calc',
    label: 'Quy Trình Thanh Lý Tài Sản & Máy Tính Chỉ Số R ≥ 60%',
    cat: 'PHÂN HỆ 07 • THANH LÝ',
    icon: Icons.Sliders,
    desc: 'Tính toán hao mòn kinh tế kỹ thuật tài sản hỏng, tự động lập hội đồng thanh lý'
  },
  {
    id: 'rbac',
    label: 'Ma Trận Phân Quyền 3 Vai Trò (RBAC Engine)',
    cat: 'PHÂN HỆ 08 • QUẢN TRỊ',
    icon: Icons.Users,
    desc: 'Phân quyền chi tiết cho Giảng viên, Quản lý CSVC & Kỹ thuật, và Quản trị viên'
  },
  {
    id: 'audit_log',
    label: 'Nhật Ký Kiểm Toán Chuỗi Khối SHA-256 Bất Biến',
    cat: 'PHÂN HỆ 09 • KIỂM TOÁN',
    icon: Icons.Audit,
    desc: 'Lưu vết mật mã học không thể can thiệp mọi thay đổi trạng thái tài sản và luân chuyển'
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
      className="ruo-modal-backdrop-smooth"
      style={{
        alignItems: 'flex-start',
        paddingTop: '10vh'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ruo-modal-card-smooth"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'var(--surface-panel)',
          border: '1px solid var(--hairline-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
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
            placeholder="Tìm kiếm phân hệ, tính năng 95 Use Cases (CSP, SLA, QR)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              minWidth: 0,
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
              fontFamily: 'var(--font-sans)',
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
          <span>Hệ Thống Quản Lý Cơ Sở Vật Chất Ruo UFMS</span>
          <span style={{ fontFamily: 'var(--font-sans)' }}>Enter Chọn • ↑↓ Di Chuyển</span>
        </div>
      </div>
    </div>
  );
};
