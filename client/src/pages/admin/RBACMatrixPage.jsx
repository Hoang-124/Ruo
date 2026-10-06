import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';

export const RBACMatrixPage = () => {
  const { toast } = useToast();

  const roles = [
    { id: 'lecturer', name: 'Giảng viên (Lecturer)', usersCount: 850, color: '#6366F1' },
    { id: 'maintenance_staff', name: 'Chuyên viên CSVC & Kỹ thuật', usersCount: 65, color: '#0EA5E9' },
    { id: 'admin', name: 'Quản trị viên Hệ thống (Admin)', usersCount: 5, color: '#EF4444' }
  ];

  const permissionGroups = [
    {
      name: 'Module 01: Tài Khoản & Phân Quyền (Auth & RBAC)',
      permissions: [
        { code: 'user:profile:read', label: 'Xem & cập nhật thông tin cá nhân', defaultRoles: ['lecturer', 'maintenance_staff', 'admin'] },
        { code: 'user:manage', label: 'Tạo tài khoản, khóa tài khoản, reset mật khẩu', defaultRoles: ['admin'] },
        { code: 'role:configure', label: 'Cấu hình ma trận phân quyền chi tiết', defaultRoles: ['admin'] }
      ]
    },
    {
      name: 'Module 02: Dữ Liệu Cơ Sở & Phòng Học (Master Data)',
      permissions: [
        { code: 'room:read', label: 'Tra cứu danh mục phòng & mặt bằng CAD', defaultRoles: ['lecturer', 'maintenance_staff', 'admin'] },
        { code: 'room:manage', label: 'Thêm mới, sửa đổi thông tin không gian phòng học', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'catalog:manage', label: 'Quản lý danh mục loại thiết bị, nhà cung cấp, đơn vị sửa chữa', defaultRoles: ['admin'] }
      ]
    },
    {
      name: 'Module 03: Thiết Bị & Điều Chuyển & Thanh Lý (Equipment Lifecycle)',
      permissions: [
        { code: 'equipment:read', label: 'Tra cứu danh mục thiết bị & chi tiết QR', defaultRoles: ['lecturer', 'maintenance_staff', 'admin'] },
        { code: 'equipment:create:import', label: 'Đăng ký tài sản mới, in nhãn QR, nhập lô Excel', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'transfer:propose', label: 'Lập đề xuất điều chuyển thiết bị giữa các phòng', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'transfer:approve', label: 'Phê duyệt quyết định điều chuyển thiết bị (Ban Giám Hiệu)', defaultRoles: ['admin'] },
        { code: 'transfer:execute', label: 'Thực hiện di chuyển thực địa & bàn giao phòng mới', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'disposal:propose', label: 'Lập hồ sơ thanh lý thiết bị hỏng (R ≥ 60%)', defaultRoles: ['maintenance_staff'] },
        { code: 'disposal:authorize', label: 'Ký quyết định phê duyệt thanh lý cuối cùng (Ban Giám Hiệu)', defaultRoles: ['admin'] }
      ]
    },

    {
      name: 'Module 04: Báo Cáo Sự Cố & Sửa Chữa SLA (Incident & Repair)',
      permissions: [
        { code: 'incident:create', label: 'Báo cáo sự cố thiết bị phòng học kèm ảnh', defaultRoles: ['lecturer', 'maintenance_staff', 'admin'] },
        { code: 'incident:read_own', label: 'Theo dõi tiến độ xử lý sự cố do bản thân báo', defaultRoles: ['lecturer', 'maintenance_staff', 'admin'] },
        { code: 'repair:assign', label: 'Phân công kỹ thuật viên & thiết lập hạn SLA', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'repair:log', label: 'Ghi nhật ký tiến độ, chi phí, vật tư linh kiện thay thế', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'parts:request', label: 'Yêu cầu xuất linh kiện dự phòng từ kho', defaultRoles: ['maintenance_staff'] },
        { code: 'parts:approve', label: 'Duyệt xuất kho linh kiện phụ tùng', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'repair:rate', label: 'Đánh giá chất lượng sửa chữa (1-5 sao) & đóng ticket', defaultRoles: ['lecturer'] }
      ]
    },
    {
      name: 'Module 05: Bảo Trì Định Kỳ & Kiểm Kê QR (Maintenance & Inventory)',
      permissions: [
        { code: 'maintenance:plan', label: 'Thiết lập kế hoạch bảo trì phòng ngừa định kỳ', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'maintenance:execute', label: 'Thực hiện kiểm tra theo checklist bảo dưỡng', defaultRoles: ['maintenance_staff'] },
        { code: 'inventory:session:create', label: 'Khởi tạo đợt kiểm kê thực tế theo tầng/phòng', defaultRoles: ['maintenance_staff', 'admin'] },
        { code: 'inventory:scan:reconcile', label: 'Quét QR thực địa đối soát vị trí & chốt số liệu', defaultRoles: ['maintenance_staff', 'admin'] }
      ]
    },
    {
      name: 'Module 06: Kiểm Toán Chuỗi Khối & Báo Cáo KPI (Governance & Audit)',
      permissions: [
        { code: 'report:kpi:export', label: 'Xuất báo cáo thống kê KPI & định mức tài sản', defaultRoles: ['admin'] },
        { code: 'audit:chain:view', label: 'Tra cứu nhật ký kiểm toán SHA-256 bất biến', defaultRoles: ['admin'] },
        { code: 'audit:chain:verify', label: 'Kích hoạt xác thực tính toàn vẹn chuỗi khối kiểm toán', defaultRoles: ['admin'] }
      ]
    }
  ];

  // Permissions state
  const [matrixState, setMatrixState] = useState(() => {
    const initial = {};
    permissionGroups.forEach(group => {
      group.permissions.forEach(p => {
        roles.forEach(r => {
          initial[`${r.id}:${p.code}`] = p.defaultRoles.includes(r.id);
        });
      });
    });
    return initial;
  });

  const togglePermission = (roleId, code) => {
    const key = `${roleId}:${code}`;
    setMatrixState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success('Đã lưu cấu hình ma trận phân quyền RBAC thành công!');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 01</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>PHÂN QUYỀN TRUY CẬP • 3 ACTORS • 56 USE CASES</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Ma Trận Phân Quyền Theo Vai Trò (RBAC Matrix)
          </h1>
        </div>

        <button
          onClick={handleSave}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
        >
          <Icons.CheckCircle size={16} />
          <span>Lưu Cấu Hình Quyền</span>
        </button>
      </div>

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {roles.map(r => (
          <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: r.color }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>{r.name}</h3>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
              Số lượng tài khoản hoạt động: <strong style={{ color: 'var(--ink-pure)' }}>{r.usersCount.toLocaleString('vi-VN')}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Matrix Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--ink-pure)', fontWeight: 700, width: '55%' }}>Danh Mục Quyền Hạn (Permission)</th>
              {roles.map(r => (
                <th key={r.id} style={{ padding: '14px 16px', textAlign: 'center', color: r.color, fontWeight: 800, width: '15%' }}>
                  {r.name.split(' (')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionGroups.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <tr style={{ background: 'var(--surface-panel)', borderTop: '2px solid var(--hairline-medium)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <td colSpan={4} style={{ padding: '10px 20px', fontWeight: 800, color: 'var(--laser-cyan)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {group.name}
                  </td>
                </tr>
                {group.permissions.map((p, pIdx) => (
                  <tr key={p.code} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{p.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{p.code}</div>
                    </td>
                    {roles.map(r => {
                      const isAllowed = matrixState[`${r.id}:${p.code}`];
                      return (
                        <td key={r.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => togglePermission(r.id, p.code)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: isAllowed ? `1px solid ${r.color}` : '1px solid var(--hairline-medium)',
                              background: isAllowed ? `${r.color}22` : 'transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: isAllowed ? r.color : 'var(--hairline-medium)'
                            }}
                          >
                            {isAllowed ? <Icons.Check size={16} strokeWidth={3} /> : <Icons.X size={14} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default RBACMatrixPage;
