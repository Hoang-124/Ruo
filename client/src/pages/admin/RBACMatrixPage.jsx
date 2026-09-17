import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';

export const RBACMatrixPage = () => {
  const roles = [
    { id: 'student', name: 'Sinh viên (Student)', usersCount: 14500 },
    { id: 'lecturer', name: 'Giảng viên (Lecturer)', usersCount: 820 },
    { id: 'facility_staff', name: 'QL Cơ sở vật chất', usersCount: 45 },
    { id: 'maintenance', name: 'Kỹ thuật viên bảo trì', usersCount: 22 },
    { id: 'academic_affairs', name: 'Phòng Đào tạo', usersCount: 18 },
    { id: 'admin', name: 'Quản trị viên (Admin)', usersCount: 5 }
  ];

  const permissionGroups = [
    {
      name: 'Quản Lý Đặt Phòng (Booking)',
      permissions: [
        { code: 'booking:search', label: 'Tra cứu phòng & xem calendar' },
        { code: 'booking:create:single', label: 'Đặt phòng học đơn lẻ' },
        { code: 'booking:create:series', label: 'Đặt phòng định kỳ cả kỳ (Series RFC 5545)' },
        { code: 'booking:approve', label: 'Phê duyệt / Từ chối đơn đặt phòng' }
      ]
    },
    {
      name: 'Quản Lý Thiết Bị & Tài Sản (Equipment)',
      permissions: [
        { code: 'equipment:borrow:request', label: 'Gửi yêu cầu mượn thiết bị di động' },
        { code: 'equipment:inventory', label: 'Kiểm kê tài sản & đối soát quét mã QR' },
        { code: 'equipment:disposal:propose', label: 'Lập đề xuất thanh lý tài sản (R ≥ 60%)' },
        { code: 'equipment:disposal:approve', label: 'Phê duyệt quyết định thanh lý tài sản' }
      ]
    },
    {
      name: 'Sự Cố & SLA Bảo Trì (Tickets)',
      permissions: [
        { code: 'ticket:create', label: 'Báo cáo sự cố hỏng hóc' },
        { code: 'ticket:assign', label: 'Điều phối & phân công kỹ thuật viên' },
        { code: 'ticket:resolve', label: 'Cập nhật tiến độ & nghiệm thu kỹ thuật' },
        { code: 'ticket:close:confirm', label: 'Nghiệm thu đóng ticket 2 chiều (Double Confirmation)' }
      ]
    },
    {
      name: 'Thời Khóa Biểu & Đào Tạo (Academic)',
      permissions: [
        { code: 'curriculum:import', label: 'Import dữ liệu thời khóa biểu SIS' },
        { code: 'curriculum:csp:solve', label: 'Kích hoạt thuật toán CSP phân bổ phòng tự động' },
        { code: 'curriculum:freeze', label: 'Khóa / Mở khóa lịch chính khóa toàn trường' },
        { code: 'escalation:approve', label: 'Phê duyệt đơn ngoại lệ vượt thẩm quyền' }
      ]
    },
    {
      name: 'Quản Trị Hệ Thống (System Admin)',
      permissions: [
        { code: 'rbac:manage', label: 'Quản lý vai trò & Cây ma trận phân quyền' },
        { code: 'audit:view', label: 'Xem nhật ký kiểm toán bất biến (Immutable Audit)' },
        { code: 'system:config', label: 'Cấu hình tham số nghiệp vụ hệ thống' }
      ]
    }
  ];

  // Default permissions mapping
  const [matrix, setMatrix] = useState({
    student: ['booking:search', 'booking:create:single', 'ticket:create', 'ticket:close:confirm'],
    lecturer: ['booking:search', 'booking:create:single', 'booking:create:series', 'equipment:borrow:request', 'ticket:create', 'ticket:close:confirm'],
    facility_staff: ['booking:search', 'booking:create:single', 'booking:approve', 'equipment:inventory', 'equipment:disposal:propose', 'ticket:create', 'ticket:assign', 'ticket:resolve'],
    maintenance: ['booking:search', 'ticket:resolve', 'equipment:disposal:propose'],
    academic_affairs: ['booking:search', 'curriculum:import', 'curriculum:csp:solve', 'curriculum:freeze', 'escalation:approve'],
    admin: [
      'booking:search', 'booking:create:single', 'booking:create:series', 'booking:approve',
      'equipment:borrow:request', 'equipment:inventory', 'equipment:disposal:propose', 'equipment:disposal:approve',
      'ticket:create', 'ticket:assign', 'ticket:resolve', 'ticket:close:confirm',
      'curriculum:import', 'curriculum:csp:solve', 'curriculum:freeze', 'escalation:approve',
      'rbac:manage', 'audit:view', 'system:config'
    ]
  });

  const [selectedRole, setSelectedRole] = useState('lecturer');

  const togglePermission = (roleId, permCode) => {
    setMatrix(prev => {
      const currentList = prev[roleId] || [];
      if (currentList.includes(permCode)) {
        return { ...prev, [roleId]: currentList.filter(p => p !== permCode) };
      } else {
        return { ...prev, [roleId]: [...currentList, permCode] };
      }
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Vai Trò & Ma Trận Phân Quyền (RBAC)</h1>
          <div className="page-subtitle">
            Cấu hình phân quyền động theo từng nhóm chức năng (Dynamic RBAC Middleware). Áp dụng có hiệu lực tức thì.
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => alert('Đã lưu cấu hình phân quyền RBAC thành công!')}>
            <Icons.CheckCircle size={16} />
            <span>Lưu Ma Trận Phân Quyền</span>
          </button>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {roles.map((r) => {
          const isSel = selectedRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className="card"
              style={{
                padding: '12px 18px',
                border: isSel ? '2px solid var(--color-primary-600)' : '1px solid var(--border-color)',
                background: isSel ? 'var(--color-primary-50)' : 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: '200px'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: isSel ? 'var(--color-primary-900)' : 'var(--text-primary)' }}>
                {r.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {r.usersCount.toLocaleString()} tài khoản • {(matrix[r.id] || []).length} quyền
              </div>
            </button>
          );
        })}
      </div>

      {/* Permissions Tree Matrix */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
          Danh Sách Quyền Hạn Của Vai Trò: <span style={{ color: 'var(--color-primary-600)' }}>{roles.find(r => r.id === selectedRole)?.name}</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {permissionGroups.map((group, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  background: 'var(--bg-card-subtle)',
                  padding: '12px 18px',
                  fontWeight: 700,
                  fontSize: '14px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                {group.name}
              </div>

              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {group.permissions.map((perm) => {
                  const isChecked = (matrix[selectedRole] || []).includes(perm.code);
                  return (
                    <label
                      key={perm.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'var(--color-primary-50)' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(selectedRole, perm.code)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{perm.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {perm.code}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
