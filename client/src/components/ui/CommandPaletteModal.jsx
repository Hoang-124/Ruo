import React, { useState, useEffect } from 'react';
import { Icons } from '../common/SvgIcons';
import { useAuth } from '../../context/AuthContext';

const ALL_MODULES = [
  // Dashboard & Classroom Floor Plan
  {
    id: 'dashboard',
    label: 'Sơ Đồ Phòng Học',
    cat: 'KHÔNG GIAN • MẶT BẰNG',
    icon: Icons.Dashboard,
    desc: 'Sơ đồ kiến trúc tầng 1-5, tình trạng phòng học và danh mục thiết bị thời gian thực',
    roles: ['admin', 'facility_manager', 'technician', 'lecturer']
  },
  // Lecturer
  {
    id: 'report_issue',
    label: 'Báo Hỏng Thiết Bị (Tạo Phiếu Sự Cố)',
    cat: 'GIẢNG VIÊN • BÁO HỎNG',
    icon: Icons.AlertTriangle,
    desc: 'Báo cáo sự cố thiết bị hư hại, chọn mức độ khẩn cấp (SLA) và gửi hình ảnh hiện trường',
    roles: ['lecturer']
  },
  {
    id: 'my_tickets',
    label: 'Phiếu Sửa Chữa Của Tôi & Đánh Giá 1-5 Sao',
    cat: 'GIẢNG VIÊN • THEO DÕI',
    icon: Icons.ClipboardCheck,
    desc: 'Theo dõi vòng đời khắc phục sự cố và đánh giá chất lượng nghiệm thu sửa chữa',
    roles: ['lecturer']
  },
  // Technician
  {
    id: 'assigned_tasks',
    label: 'Nhiệm Vụ Sửa Chữa (Tasks & Log)',
    cat: 'KỸ THUẬT • NHIỆM VỤ',
    icon: Icons.Wrench,
    desc: 'Tiếp nhận ca sửa chữa, cập nhật nhật ký khắc phục và báo cáo kết quả hoàn tất/không sửa được',
    roles: ['technician']
  },
  {
    id: 'spare_parts',
    label: 'Kho Linh Kiện & Yêu Cầu Vật Tư Thay Thế',
    cat: 'KỸ THUẬT • LINH KIỆN',
    icon: Icons.Package,
    desc: 'Xem tồn kho linh kiện, cảnh báo tồn kho thấp và tạo phiếu xin cấp linh kiện sửa chữa',
    roles: ['technician']
  },
  {
    id: 'movement_tasks',
    label: 'Lệnh Di Chuyển & Thay Thế Thiết Bị Dự Phòng',
    cat: 'KỸ THUẬT • ĐIỀU ĐỘNG',
    icon: Icons.ArrowRight,
    desc: 'Nhận lệnh di chuyển thay thế thiết bị từ KHO-01 hoặc điều động giữa các phòng',
    roles: ['technician']
  },
  {
    id: 'qr_scanner',
    label: 'Quét Mã QR Thiết Bị Thực Địa',
    cat: 'KỸ THUẬT • QR SCANNER',
    icon: Icons.QrCode,
    desc: 'Quét hoặc nhập mã QR để tra cứu thông số kỹ thuật, tình trạng và lịch sử bảo hành',
    roles: ['technician']
  },
  // Facility Manager
  {
    id: 'tickets_kanban',
    label: 'Phiếu Sửa Chữa & Điều Phối Kỹ Thuật (Kanban SLA)',
    cat: 'QUẢN LÝ CSVC • SỬA CHỮA',
    icon: Icons.Wrench,
    desc: 'Giao việc cho kỹ thuật viên, cấp đồ dự phòng từ KHO-01 và giám sát hạn SLA',
    roles: ['facility_manager']
  },
  {
    id: 'warehouse',
    label: 'Kho Dự Phòng & Định Mức Phòng Học',
    cat: 'QUẢN LÝ CSVC • KHO DỰ PHÒNG',
    icon: Icons.Layers,
    desc: 'Giám sát tồn kho thiết bị dự phòng KHO-01 và cảnh báo thiếu hụt thiết bị phòng học',
    roles: ['facility_manager']
  },
  {
    id: 'movements',
    label: 'Lệnh Điều Chuyển Thiết Bị Giữa Các Phòng',
    cat: 'QUẢN LÝ CSVC • ĐIỀU CHUYỂN',
    icon: Icons.RefreshCw,
    desc: 'Lập lệnh luân chuyển tài sản, chọn phòng nguồn/đích và theo dõi trạng thái di chuyển',
    roles: ['facility_manager']
  },
  {
    id: 'equipments',
    label: 'Kho Quản Lý Thiết Bị Trường & In Tem QR',
    cat: 'TÀI SẢN • THIẾT BỊ',
    icon: Icons.Equipment,
    desc: 'Quản lý toàn bộ thiết bị trường, đăng ký mới, cập nhật bảo hành và in tem nhãn QR',
    roles: ['facility_manager', 'admin']
  },
  {
    id: 'inventory',
    label: 'Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa',
    cat: 'TÀI SẢN • KIỂM KÊ',
    icon: Icons.CheckCircle,
    desc: 'Tạo đợt kiểm kê, quét đối soát camera di động và tự động tạo phiếu hỏng phát hiện',
    roles: ['facility_manager']
  },
  {
    id: 'disposal_propose',
    label: 'Đề Xuất Thanh Lý Thiết Bị (Hao mòn R ≥ 60%)',
    cat: 'TÀI SẢN • THANH LÝ',
    icon: Icons.Sliders,
    desc: 'Lọc thiết bị hư hỏng quá hạn khấu hao và lập hồ sơ đề xuất thanh lý kèm giá thu hồi',
    roles: ['facility_manager']
  },
  // Admin
  {
    id: 'users',
    label: 'Quản Trị Người Dùng & Phân Vai Trò',
    cat: 'QUẢN TRỊ • TÀI KHOẢN',
    icon: Icons.Users,
    desc: 'Tạo tài khoản, gán 4 vai trò chuẩn, khóa/mở tài khoản và đặt lại mật khẩu',
    roles: ['admin']
  },
  {
    id: 'rbac',
    label: 'Ma Trận Phân Quyền Vai Trò (RBAC Dynamic)',
    cat: 'QUẢN TRỊ • PHÂN QUYỀN',
    icon: Icons.Shield,
    desc: 'Phân quyền chi tiết cho 4 vai trò chính quy theo từng phân hệ chức năng',
    roles: ['admin']
  },
  {
    id: 'master_data',
    label: 'Danh Mục Dữ Liệu Nền (Master Data)',
    cat: 'QUẢN TRỊ • DANH MỤC',
    icon: Icons.Settings,
    desc: 'Quản lý Loại thiết bị, Nhà cung cấp, Đơn vị sửa chữa và Danh mục phòng học',
    roles: ['admin']
  },
  {
    id: 'disposal_approval',
    label: 'Phê Duyệt Thanh Lý (BGH - Quyết Định QĐ-TL)',
    cat: 'QUẢN TRỊ • PHÊ DUYỆT',
    icon: Icons.CheckCircle,
    desc: 'Ban Giám Hiệu xem xét hồ sơ, phê duyệt với số quyết định thanh lý hoặc từ chối',
    roles: ['admin']
  },
  {
    id: 'audit_log',
    label: 'Sổ Cái Nhật Ký Kiểm Toán SHA-256 Bất Biến',
    cat: 'QUẢN TRỊ • KIỂM TOÁN',
    icon: Icons.Audit,
    desc: 'Truy vết mã hóa không thể can thiệp mọi hành động và xuất khẩu báo cáo CSV',
    roles: ['admin']
  }
];

export const CommandPaletteModal = ({ isOpen, onClose, onSelectModule }) => {
  const { currentUser, isTabAllowed } = useAuth();
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

  const userRole = String(currentUser?.role || '').toLowerCase();
  const allowedModules = ALL_MODULES.filter(m => !m.roles || m.roles.includes(userRole));

  const filtered = allowedModules.filter(
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
