import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { roleApi } from '../../lib/api';
import { USER_ROLES } from '../../config/navigation';

export const RBACMatrixPage = () => {
  const { toast } = useToast();

  const canonicalRoles = [
    { id: USER_ROLES.LECTURER, name: 'Giảng viên (Lecturer)', color: '#10B981', badge: 'badge-lecturer' },
    { id: USER_ROLES.TECHNICIAN, name: 'Kỹ thuật viên (Technician)', color: '#0EA5E9', badge: 'badge-technician' },
    { id: USER_ROLES.FACILITY_MANAGER, name: 'Quản lý CSVC (Facility Mgr)', color: '#F59E0B', badge: 'badge-manager' },
    { id: USER_ROLES.ADMIN, name: 'Quản trị viên (Admin)', color: '#EF4444', badge: 'badge-admin' }
  ];

  const permissionModules = [
    {
      name: 'Module 01: Tài Khoản & Phân Quyền (Auth & RBAC)',
      permissions: [
        { code: 'user:profile:read', label: 'Xem & cập nhật thông tin cá nhân', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'user:create', label: 'Tạo tài khoản cán bộ mới', defaultRoles: ['admin'] },
        { code: 'user:update', label: 'Gán vai trò & phòng ban người dùng', defaultRoles: ['admin'] },
        { code: 'user:lock', label: 'Khóa / Mở khóa tài khoản', defaultRoles: ['admin'] },
        { code: 'user:reset_password', label: 'Đặt lại mật khẩu cho tài khoản', defaultRoles: ['admin'] },
        { code: 'role:update', label: 'Cấu hình ma trận phân quyền chi tiết', defaultRoles: ['admin'] }
      ]
    },
    {
      name: 'Module 02: Dữ Liệu Cơ Sở & Phòng Học (Master Data)',
      permissions: [
        { code: 'room:read', label: 'Tra cứu danh mục phòng & mặt bằng CAD', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'room:*', label: 'Thêm mới, sửa đổi không gian & định mức phòng', defaultRoles: ['admin'] },
        { code: 'category:*', label: 'Định nghĩa loại thiết bị & thông số kỹ thuật', defaultRoles: ['admin'] },
        { code: 'supplier:*', label: 'Quản lý danh sách nhà cung cấp thiết bị', defaultRoles: ['admin'] },
        { code: 'repair_unit:*', label: 'Quản lý đơn vị sửa chữa liên kết bên ngoài', defaultRoles: ['admin'] }
      ]
    },
    {
      name: 'Module 03: Vòng Đời Thiết Bị, Điều Chuyển & Thanh Lý',
      permissions: [
        { code: 'equipment:read', label: 'Tra cứu danh mục thiết bị & chi tiết QR', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'equipment:create', label: 'Đăng ký tài sản mới vào hệ thống', defaultRoles: ['facility_manager'] },
        { code: 'equipment:update', label: 'Cập nhật thông tin & tình trạng thiết bị', defaultRoles: ['facility_manager'] },
        { code: 'equipment:import', label: 'Nhập hàng loạt danh sách thiết bị (Excel)', defaultRoles: ['facility_manager'] },
        { code: 'equipment:qr', label: 'In nhãn mã QR chuẩn hóa cho thiết bị', defaultRoles: ['facility_manager'] },
        { code: 'warranty:read', label: 'Kiểm tra tình trạng bảo hành thiết bị', defaultRoles: ['facility_manager'] },
        { code: 'warranty:update', label: 'Gia hạn & cập nhật thông tin bảo hành', defaultRoles: ['facility_manager'] },
        { code: 'movement:order', label: 'Ra lệnh điều chuyển thiết bị giữa các phòng', defaultRoles: ['facility_manager'] },
        { code: 'movement:confirm', label: 'Xác nhận hoàn thành di chuyển thực địa', defaultRoles: ['technician'] },
        { code: 'placement:decide', label: 'Quyết định nơi về thiết bị sau sửa chữa', defaultRoles: ['facility_manager'] },
        { code: 'disposal:propose', label: 'Lập hồ sơ đề xuất thanh lý thiết bị', defaultRoles: ['facility_manager'] },
        { code: 'disposal:approve', label: 'Phê duyệt quyết định thanh lý cuối cùng (BGH)', defaultRoles: ['admin'] }
      ]
    },
    {
      name: 'Module 04: Báo Hỏng, Sửa Chữa & Quản Lý Linh Kiện',
      permissions: [
        { code: 'incident:create', label: 'Báo sự cố hỏng hóc thiết bị kèm hình ảnh', defaultRoles: ['lecturer'] },
        { code: 'incident:read_own', label: 'Theo dõi tiến độ sự cố do bản thân báo', defaultRoles: ['lecturer'] },
        { code: 'repair:read', label: 'Xem danh sách toàn bộ phiếu sửa chữa (Kanban)', defaultRoles: ['facility_manager'] },
        { code: 'repair:assign', label: 'Giao task kỹ thuật viên & hạn SLA', defaultRoles: ['facility_manager'] },
        { code: 'repair:read_assigned', label: 'Xem danh sách nhiệm vụ sửa chữa được giao', defaultRoles: ['technician'] },
        { code: 'repair:accept', label: 'Tiếp nhận xử lý nhiệm vụ sửa chữa', defaultRoles: ['technician'] },
        { code: 'repair:log', label: 'Ghi nhật ký tiến độ xử lý & chi phí', defaultRoles: ['technician'] },
        { code: 'repair:report_outcome', label: 'Báo cáo kết quả sửa chữa (Đã sửa / Không thể sửa)', defaultRoles: ['technician'] },
        { code: 'repair:close', label: 'Nghiệm thu & đóng phiếu sửa chữa', defaultRoles: ['facility_manager'] },
        { code: 'parts:request', label: 'Lập phiếu xin cấp phát linh kiện thay thế', defaultRoles: ['technician'] },
        { code: 'parts:approve', label: 'Phê duyệt cấp phát linh kiện từ kho', defaultRoles: ['facility_manager'] },
        { code: 'spare_part:update', label: 'Cập nhật định mức tồn kho linh kiện', defaultRoles: ['facility_manager'] },
        { code: 'repair:rate', label: 'Đánh giá chất lượng sửa chữa (1-5 sao)', defaultRoles: ['lecturer'] }
      ]
    },
    {
      name: 'Module 05: Kiểm Kê Tài Sản Thực Địa & Quét QR',
      permissions: [
        { code: 'inventory:create', label: 'Khởi tạo phiên kiểm kê theo đợt / phòng', defaultRoles: ['facility_manager'] },
        { code: 'inventory:scan', label: 'Quét QR kiểm kê & ghi nhận sai lệch', defaultRoles: ['technician'] },
        { code: 'inventory:reconcile', label: 'Chốt số liệu kiểm kê & đối soát tài sản', defaultRoles: ['facility_manager'] }
      ]
    },
    {
      name: 'Module 06: Báo Cáo Thống Kê & Kiểm Toán Bất Biến',
      permissions: [
        { code: 'dashboard:read', label: 'Xem dashboard tổng quan vận hành & KPI', defaultRoles: ['facility_manager', 'admin'] },
        { code: 'report:export', label: 'Xuất báo cáo thống kê & chi phí (CSV/PDF)', defaultRoles: ['admin'] },
        { code: 'audit:read', label: 'Tra cứu nhật ký kiểm toán hệ thống', defaultRoles: ['admin'] },
        { code: 'audit:verify', label: 'Kích hoạt xác thực chuỗi băm SHA-256', defaultRoles: ['admin'] },
        { code: 'audit:export', label: 'Xuất nhật ký kiểm toán phục vụ thanh tra', defaultRoles: ['admin'] }
      ]
    }
  ];

  const [dbRoles, setDbRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrixState, setMatrixState] = useState({});

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await roleApi.list();
      const rolesList = res?.roles || [];
      setDbRoles(rolesList);

      const state = {};
      canonicalRoles.forEach(r => {
        const found = rolesList.find(dbR => dbR.name === r.id);
        const perms = found ? (found.permissions || []) : [];

        permissionModules.forEach(mod => {
          mod.permissions.forEach(p => {
            const key = `${r.id}:${p.code}`;
            if (found) {
              state[key] = perms.includes(p.code) || perms.includes('*');
            } else {
              state[key] = p.defaultRoles.includes(r.id);
            }
          });
        });
      });

      setMatrixState(state);
    } catch (err) {
      toast.error('Không thể tải danh sách quyền từ máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId, code) => {
    const key = `${roleId}:${code}`;
    setMatrixState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // For each canonical role, collect its active permissions and save to backend
      for (const r of canonicalRoles) {
        const activePerms = [];
        permissionModules.forEach(mod => {
          mod.permissions.forEach(p => {
            if (matrixState[`${r.id}:${p.code}`]) {
              activePerms.push(p.code);
            }
          });
        });

        await roleApi.update(r.id, activePerms);
      }

      toast.success('Đã lưu cấu hình ma trận phân quyền RBAC thành công vào cơ sở dữ liệu!');
      await loadRoles();
    } catch (err) {
      toast.error('Lỗi khi lưu phân quyền: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
        <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
        <div>Đang tải ma trận phân quyền từ máy chủ...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 01</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>PHÂN QUYỀN TRUY CẬP • 4 CANONICAL ACTORS • 68 USE CASES</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Ma Trận Phân Quyền Vai Trò (RBAC Matrix)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Nguyên tắc cốt lõi: <em>Người làm không tự duyệt việc của mình</em>. Dữ liệu được đồng bộ trực tiếp với MongoDB.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="laser-btn laser-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Icons.RefreshCw size={16} className="spin" /> : <Icons.CheckCircle size={16} />}
          <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Quyền'}</span>
        </button>
      </div>

      {/* Role Summary Cards (4 canonical roles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {canonicalRoles.map(r => {
          const activeCount = Object.keys(matrixState).filter(k => k.startsWith(`${r.id}:`) && matrixState[k]).length;
          return (
            <div key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: r.color }} />
                <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>{r.name}</h3>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                Quyền hạn kích hoạt: <strong style={{ color: r.color }}>{activeCount}</strong> quyền
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--ink-pure)', fontWeight: 700, width: '44%' }}>Danh Mục Quyền Hạn (Permission Scope)</th>
              {canonicalRoles.map(r => (
                <th key={r.id} style={{ padding: '14px 12px', textAlign: 'center', color: r.color, fontWeight: 800, width: '14%' }}>
                  {r.name.split(' (')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionModules.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <tr style={{ background: 'var(--surface-panel)', borderTop: '2px solid var(--hairline-medium)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <td colSpan={5} style={{ padding: '10px 20px', fontWeight: 800, color: 'var(--laser-cyan)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {group.name}
                  </td>
                </tr>
                {group.permissions.map((p) => (
                  <tr key={p.code} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{p.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{p.code}</div>
                    </td>
                    {canonicalRoles.map(r => {
                      const isAllowed = matrixState[`${r.id}:${p.code}`] || false;
                      return (
                        <td key={r.id} style={{ padding: '12px 12px', textAlign: 'center' }}>
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
                              color: isAllowed ? r.color : 'var(--hairline-medium)',
                              transition: 'all 0.15s ease'
                            }}
                            title={`Nhấn để ${isAllowed ? 'thu hồi' : 'cấp'} quyền [${p.code}] cho [${r.name}]`}
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
